"use client";

import React, {
  useRef,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from "react";

type LottieSource = string | Record<string, unknown>;

type LottieAnimation = {
  destroy: () => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  setSpeed: (speed: number) => void;
  addEventListener: (event: string, callback: () => void) => void;
  removeEventListener: (event: string, callback: () => void) => void;
};

interface LottieConfig {
  container: HTMLElement;
  renderer: "svg" | "canvas" | "html";
  loop: boolean;
  autoplay: boolean;
  path?: string;
  animationData?: Record<string, unknown>;
}

interface LottieLib {
  loadAnimation: (config: LottieConfig) => LottieAnimation;
}

declare global {
  interface Window {
    lottie?: LottieLib;
  }
}

interface LottieRendererProps {
  src: LottieSource;
  autoplay?: boolean;
  loop?: boolean;
  speed?: number;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
  fallback?: React.ReactNode;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

type LoadingState =
  | "idle"
  | "loading-library"
  | "library-loaded"
  | "loading-animation"
  | "animation-loaded"
  | "error";

// Utility function to check if source is a URL
const isUrl = (src: LottieSource): src is string => {
  if (typeof src !== "string") return false;
  try {
    new URL(src);
    return true;
  } catch {
    return src.startsWith("/") || src.startsWith("./") || src.startsWith("../");
  }
};

// Utility function to check if source is animation data
const isAnimationData = (src: LottieSource): src is Record<string, unknown> => {
  return typeof src === "object" && src !== null && !Array.isArray(src);
};

const useLottieLibrary = (priority: boolean) => {
  const [loadingState, setLoadingState] = useState<LoadingState>(() => {
    if (typeof window === "undefined") return "idle";
    return window.lottie ? "library-loaded" : "idle";
  });

  const loadedRef = useRef(false);

  const loadLibrary = useCallback(() => {
    if (typeof window === "undefined")
      return Promise.reject(new Error("Window not available"));

    if (window.lottie) {
      setLoadingState("library-loaded");
      return Promise.resolve();
    }

    if (loadedRef.current) return Promise.resolve();

    loadedRef.current = true;
    setLoadingState("loading-library");

    return new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js";
      script.async = !priority;

      const cleanup = () => {
        script.removeEventListener("load", handleLoad);
        script.removeEventListener("error", handleError);
      };

      const handleLoad = () => {
        cleanup();
        setLoadingState("library-loaded");
        resolve();
      };

      const handleError = () => {
        cleanup();
        loadedRef.current = false;
        setLoadingState("error");
        reject(new Error("Failed to load Lottie library"));
      };

      script.addEventListener("load", handleLoad);
      script.addEventListener("error", handleError);
      document.head.appendChild(script);
    });
  }, [priority]);

  return { loadingState, loadLibrary };
};

const useLottieAnimation = (
  src: LottieSource,
  config: { autoplay: boolean; loop: boolean; speed: number },
  callbacks: { onComplete?: () => void; onError?: (error: string) => void }
) => {
  const animationRef = useRef<LottieAnimation | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [animationState, setAnimationState] = useState<
    "idle" | "loading" | "loaded" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  const animationConfig = useMemo((): Partial<LottieConfig> => {
    const baseConfig = {
      renderer: "svg" as const,
      loop: config.loop,
      autoplay: config.autoplay,
    };

    if (isUrl(src)) {
      return { ...baseConfig, path: src };
    } else if (isAnimationData(src)) {
      return { ...baseConfig, animationData: src };
    } else {
      throw new Error(
        "Invalid src prop: must be a URL string or animation data object"
      );
    }
  }, [src, config.autoplay, config.loop]);

  const createAnimation = useCallback(
    (container: HTMLElement) => {
      if (!window.lottie) {
        const errorMsg = "Lottie library not loaded";
        setError(errorMsg);
        setAnimationState("error");
        callbacks.onError?.(errorMsg);
        return;
      }

      try {
        // Clean up previous animation
        if (cleanupRef.current) {
          cleanupRef.current();
          cleanupRef.current = null;
        }

        if (animationRef.current) {
          animationRef.current.destroy();
          animationRef.current = null;
        }

        // Clear container
        container.innerHTML = "";
        containerRef.current = container;

        setAnimationState("loading");
        setError(null);

        const fullConfig: LottieConfig = {
          container,
          ...animationConfig,
        } as LottieConfig;

        const animation = window.lottie.loadAnimation(fullConfig);
        animationRef.current = animation;

        // Set speed
        animation.setSpeed(config.speed);

        // Event handlers
        const handleDOMLoaded = () => {
          setAnimationState("loaded");
          setError(null);
        };

        const handleComplete = () => {
          callbacks.onComplete?.();
        };

        const handleDataFailed = () => {
          const errorMsg = "Failed to load animation data";
          setError(errorMsg);
          setAnimationState("error");
          callbacks.onError?.(errorMsg);
        };

        const handleError = () => {
          const errorMsg = "Animation rendering error";
          setError(errorMsg);
          setAnimationState("error");
          callbacks.onError?.(errorMsg);
        };

        // Add event listeners
        animation.addEventListener("DOMLoaded", handleDOMLoaded);
        animation.addEventListener("complete", handleComplete);
        animation.addEventListener("data_failed", handleDataFailed);
        animation.addEventListener("error", handleError);

        // Store cleanup function
        cleanupRef.current = () => {
          animation.removeEventListener("DOMLoaded", handleDOMLoaded);
          animation.removeEventListener("complete", handleComplete);
          animation.removeEventListener("data_failed", handleDataFailed);
          animation.removeEventListener("error", handleError);
          animation.destroy();
        };
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to initialize animation";
        setError(errorMsg);
        setAnimationState("error");
        callbacks.onError?.(errorMsg);
      }
    },
    [animationConfig, config.speed, callbacks]
  );

  const destroyAnimation = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    if (animationRef.current) {
      animationRef.current.destroy();
      animationRef.current = null;
    }

    if (containerRef.current) {
      containerRef.current.innerHTML = "";
      containerRef.current = null;
    }

    setAnimationState("idle");
    setError(null);
  }, []);

  // Update speed when it changes
  useEffect(() => {
    if (animationRef.current && animationState === "loaded") {
      animationRef.current.setSpeed(config.speed);
    }
  }, [config.speed, animationState]);

  return {
    animationState,
    error,
    createAnimation,
    destroyAnimation,
    animation: animationRef.current,
  };
};

// Loading component
const LoadingIndicator = ({ state }: { state: LoadingState }) => {
  const getLoadingContent = () => {
    switch (state) {
      case "idle":
        return {
          icon: (
            <div className="inline-block animate-pulse rounded-full h-8 w-8 bg-gray-300" />
          ),
          text: "Initializing...",
        };
      case "loading-library":
        return {
          icon: (
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600" />
          ),
          text: "Loading Lottie...",
        };
      case "loading-animation":
        return {
          icon: (
            <div className="inline-block animate-bounce rounded-full h-8 w-8 bg-blue-500" />
          ),
          text: "Loading animation...",
        };
      default:
        return null;
    }
  };

  const content = getLoadingContent();
  if (!content) return null;

  return (
    <div className="flex flex-col items-center justify-center">
      {content.icon}
      <div className="mt-2 text-xs text-gray-500">{content.text}</div>
    </div>
  );
};

// Error component
const ErrorDisplay = ({
  error,
  fallback,
  className,
  style,
}: {
  error: string;
  fallback?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) => {
  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div
      className={`flex items-center justify-center bg-gray-50 border border-gray-200 rounded ${
        className || ""
      }`}
      style={style}
    >
      <div className="text-center text-gray-500 p-4">
        <div className="text-2xl mb-2">⚠️</div>
        <div className="text-sm font-medium">Animation Error</div>
        <div className="text-xs mt-1 opacity-75 max-w-xs break-words">
          {error}
        </div>
      </div>
    </div>
  );
};

export const LottieRenderer: React.FC<LottieRendererProps> = ({
  src,
  autoplay = true,
  loop = true,
  speed = 1,
  className = "",
  style = {},
  priority = false,
  fallback,
  onComplete,
  onError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { loadingState, loadLibrary } = useLottieLibrary(priority);

  // Memoize callbacks to prevent unnecessary re-renders
  const stableCallbacks = useMemo(
    () => ({ onComplete, onError }),
    [onComplete, onError]
  );

  const animationConfig = useMemo(
    () => ({ autoplay, loop, speed }),
    [autoplay, loop, speed]
  );

  const { animationState, error, createAnimation, destroyAnimation } =
    useLottieAnimation(src, animationConfig, stableCallbacks);

  // Load library on mount
  useEffect(() => {
    if (loadingState === "idle") {
      loadLibrary().catch((err) => {
        console.error("Failed to load Lottie library:", err);
      });
    }
  }, [loadingState, loadLibrary]);

  // Create animation when library is ready and container is available
  useEffect(() => {
    if (
      loadingState === "library-loaded" &&
      containerRef.current &&
      (animationState === "idle" || animationState === "error")
    ) {
      createAnimation(containerRef.current);
    }
  }, [loadingState, animationState, createAnimation]);

  // Cleanup on unmount
  useEffect(() => {
    return destroyAnimation;
  }, [destroyAnimation]);

  const isError = loadingState === "error" || animationState === "error";
  const isLoading =
    loadingState === "loading-library" ||
    animationState === "loading" ||
    (loadingState === "library-loaded" && animationState === "idle");

  const currentLoadingState: LoadingState =
    loadingState === "loading-library"
      ? "loading-library"
      : animationState === "loading"
      ? "loading-animation"
      : loadingState === "idle"
      ? "idle"
      : loadingState;

  // Handle error state
  if (isError && error) {
    return (
      <ErrorDisplay
        error={error}
        fallback={fallback}
        className={className}
        style={style}
      />
    );
  }

  return (
    <div className={`relative ${className}`} style={style}>
      {/* Animation Container */}
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ minHeight: "100px" }}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <LoadingIndicator state={currentLoadingState} />
        </div>
      )}
    </div>
  );
};
