import React, { useEffect, useRef, useCallback } from "react";
import { Renderer, Camera, Geometry, Program, Mesh } from "ogl";

interface ParticlesProps {
  particleCount?: number;
  particleSpread?: number;
  speed?: number;
  particleColors?: string[];
  moveParticlesOnHover?: boolean;
  particleHoverFactor?: number;
  alphaParticles?: boolean;
  particleBaseSize?: number;
  sizeRandomness?: number;
  cameraDistance?: number;
  disableRotation?: boolean;
  className?: string;
}

const defaultColors: string[] = ["#ffffff", "#ffffff", "#ffffff"];

const hexToRgb = (hex: string): [number, number, number] => {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const int = parseInt(hex, 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  return [r, g, b];
};

const vertex = /* glsl */ `
  attribute vec3 position;
  attribute vec4 random;
  attribute vec3 color;
  
  uniform mat4 modelMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uTime;
  uniform float uSpread;
  uniform float uBaseSize;
  uniform float uSizeRandomness;
  
  varying vec4 vRandom;
  varying vec3 vColor;
  
  void main() {
    vRandom = random;
    vColor = color;
    
    vec3 pos = position * uSpread;
    pos.z *= 10.0;
    
    vec4 mPos = modelMatrix * vec4(pos, 1.0);
    float t = uTime;
    mPos.x += sin(t * random.z + 6.28 * random.w) * mix(0.1, 1.5, random.x);
    mPos.y += sin(t * random.y + 6.28 * random.x) * mix(0.1, 1.5, random.w);
    mPos.z += sin(t * random.w + 6.28 * random.y) * mix(0.1, 1.5, random.z);
    
    vec4 mvPos = viewMatrix * mPos;
    gl_PointSize = (uBaseSize * (1.0 + uSizeRandomness * (random.x - 0.5))) / length(mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  
  uniform float uTime;
  uniform float uAlphaParticles;
  varying vec4 vRandom;
  varying vec3 vColor;
  
  void main() {
    vec2 uv = gl_PointCoord.xy;
    float d = length(uv - vec2(0.5));
    
    if(uAlphaParticles < 0.5) {
      if(d > 0.5) {
        discard;
      }
      gl_FragColor = vec4(vColor + 0.2 * sin(uv.yxx + uTime + vRandom.y * 6.28), 1.0);
    } else {
      float circle = smoothstep(0.5, 0.4, d) * 0.8;
      gl_FragColor = vec4(vColor + 0.2 * sin(uv.yxx + uTime + vRandom.y * 6.28), circle);
    }
  }
`;

interface WebGLRefs {
  renderer: Renderer | null;
  camera: Camera | null;
  geometry: Geometry | null;
  program: Program | null;
  particles: Mesh | null;
}

const Particles: React.FC<ParticlesProps> = ({
  particleCount = 200,
  particleSpread = 10,
  speed = 0.1,
  particleColors,
  moveParticlesOnHover = false,
  particleHoverFactor = 1,
  alphaParticles = false,
  particleBaseSize = 100,
  sizeRandomness = 1,
  cameraDistance = 20,
  disableRotation = false,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const animationFrameRef = useRef<number>(0);
  const timeRef = useRef<{ lastTime: number; elapsed: number }>({
    lastTime: 0,
    elapsed: 0,
  });

  // WebGL resource refs
  const webglRefs = useRef<WebGLRefs>({
    renderer: null,
    camera: null,
    geometry: null,
    program: null,
    particles: null,
  });

  // Create geometry data
  const createGeometryData = useCallback((count: number, colors: string[]) => {
    const positions = new Float32Array(count * 3);
    const randoms = new Float32Array(count * 4);
    const colorData = new Float32Array(count * 3);
    const palette = colors && colors.length > 0 ? colors : defaultColors;

    for (let i = 0; i < count; i++) {
      let x: number, y: number, z: number, len: number;
      do {
        x = Math.random() * 2 - 1;
        y = Math.random() * 2 - 1;
        z = Math.random() * 2 - 1;
        len = x * x + y * y + z * z;
      } while (len > 1 || len === 0);
      const r = Math.cbrt(Math.random());
      positions.set([x * r, y * r, z * r], i * 3);
      randoms.set(
        [Math.random(), Math.random(), Math.random(), Math.random()],
        i * 4
      );
      const col = hexToRgb(palette[Math.floor(Math.random() * palette.length)]);
      colorData.set(col, i * 3);
    }

    return { positions, randoms, colorData };
  }, []);

  // Event handlers
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    mouseRef.current = { x, y };
  }, []);

  const handleResize = useCallback(() => {
    const container = containerRef.current;
    const { renderer, camera } = webglRefs.current;
    if (!container || !renderer || !camera) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.setSize(width, height);
    camera.perspective({
      aspect: renderer.gl.canvas.width / renderer.gl.canvas.height,
    });
  }, []);

  // Static WebGL initialization - runs only once on mount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Initialize renderer
    const renderer = new Renderer({ depth: false, alpha: true });
    const gl = renderer.gl;
    container.appendChild(gl.canvas);
    gl.clearColor(0, 0, 0, 0);

    // Initialize camera
    const camera = new Camera(gl, { fov: 15 });
    camera.position.set(0, 0, cameraDistance);

    // Create initial geometry
    const { positions, randoms, colorData } = createGeometryData(
      particleCount,
      particleColors || defaultColors
    );
    const geometry = new Geometry(gl, {
      position: { size: 3, data: positions },
      random: { size: 4, data: randoms },
      color: { size: 3, data: colorData },
    });

    // Create program
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uSpread: { value: particleSpread },
        uBaseSize: { value: particleBaseSize },
        uSizeRandomness: { value: sizeRandomness },
        uAlphaParticles: { value: alphaParticles ? 1 : 0 },
      },
      transparent: true,
      depthTest: false,
    });

    // Create particles mesh
    const particles = new Mesh(gl, { mode: gl.POINTS, geometry, program });

    // Store refs
    webglRefs.current = { renderer, camera, geometry, program, particles };

    // Setup event listeners
    window.addEventListener("resize", handleResize, false);
    if (moveParticlesOnHover) {
      container.addEventListener("mousemove", handleMouseMove);
    }

    // Initial resize
    handleResize();

    // Initialize time
    timeRef.current = { lastTime: performance.now(), elapsed: 0 };

    // Animation loop
    const update = (t: number) => {
      const refs = webglRefs.current;
      if (!refs.renderer || !refs.camera || !refs.particles || !refs.program)
        return;

      animationFrameRef.current = requestAnimationFrame(update);

      const delta = t - timeRef.current.lastTime;
      timeRef.current.lastTime = t;
      timeRef.current.elapsed += delta * speed;

      // Update uniforms
      refs.program.uniforms.uTime.value = timeRef.current.elapsed * 0.001;

      // Update particle position based on mouse
      if (moveParticlesOnHover) {
        refs.particles.position.x = -mouseRef.current.x * particleHoverFactor;
        refs.particles.position.y = -mouseRef.current.y * particleHoverFactor;
      } else {
        refs.particles.position.x = 0;
        refs.particles.position.y = 0;
      }

      // Update rotation
      if (!disableRotation) {
        refs.particles.rotation.x =
          Math.sin(timeRef.current.elapsed * 0.0002) * 0.1;
        refs.particles.rotation.y =
          Math.cos(timeRef.current.elapsed * 0.0005) * 0.15;
        refs.particles.rotation.z += 0.01 * speed;
      }

      refs.renderer.render({ scene: refs.particles, camera: refs.camera });
    };

    animationFrameRef.current = requestAnimationFrame(update);

    // Cleanup function
    return () => {
      const refs = webglRefs.current;

      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Remove event listeners
      window.removeEventListener("resize", handleResize);
      if (container) {
        container.removeEventListener("mousemove", handleMouseMove);
      }

      // Cleanup WebGL resources
      if (refs.geometry) {
        refs.geometry.remove();
      }
      if (refs.program) {
        refs.program.remove();
      }
      if (refs.renderer && container.contains(refs.renderer.gl.canvas)) {
        container.removeChild(refs.renderer.gl.canvas);
      }

      // Clear refs
      webglRefs.current = {
        renderer: null,
        camera: null,
        geometry: null,
        program: null,
        particles: null,
      };
    };
  }, []); // Only runs once on mount

  // Recreate geometry only when particle count or colors change
  useEffect(() => {
    const {
      renderer,
      geometry: oldGeometry,
      program,
      particles,
    } = webglRefs.current;
    if (!renderer || !program || !particles) return;

    // Create new geometry
    const { positions, randoms, colorData } = createGeometryData(
      particleCount,
      particleColors || defaultColors
    );
    const newGeometry = new Geometry(renderer.gl, {
      position: { size: 3, data: positions },
      random: { size: 4, data: randoms },
      color: { size: 3, data: colorData },
    });

    // Update mesh geometry
    particles.geometry = newGeometry;

    // Cleanup old geometry
    if (oldGeometry) {
      oldGeometry.remove();
    }

    // Update ref
    webglRefs.current.geometry = newGeometry;
  }, [particleCount, particleColors, createGeometryData]);

  // Update shader uniforms when relevant props change
  useEffect(() => {
    const { program } = webglRefs.current;
    if (!program) return;

    program.uniforms.uSpread.value = particleSpread;
    program.uniforms.uBaseSize.value = particleBaseSize;
    program.uniforms.uSizeRandomness.value = sizeRandomness;
    program.uniforms.uAlphaParticles.value = alphaParticles ? 1 : 0;
  }, [particleSpread, particleBaseSize, sizeRandomness, alphaParticles]);

  // Update camera distance
  useEffect(() => {
    const { camera } = webglRefs.current;
    if (!camera) return;

    camera.position.set(0, 0, cameraDistance);
  }, [cameraDistance]);

  // Update mouse event listener based on hover setting
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (moveParticlesOnHover) {
      container.addEventListener("mousemove", handleMouseMove);
    } else {
      container.removeEventListener("mousemove", handleMouseMove);
      mouseRef.current = { x: 0, y: 0 }; // Reset mouse position
    }

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
    };
  }, [moveParticlesOnHover, handleMouseMove]);

  return (
    <div ref={containerRef} className={`relative w-full h-full ${className}`} />
  );
};

export default Particles;
