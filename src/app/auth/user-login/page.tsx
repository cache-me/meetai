import { LottieRenderer } from "@/components/lottie-render/lottie";
import UserLoginContainer from "./_components/user-login-form";
import lottieAnimationSrc from "../../media/assets/demo1.json";

export default function UserLoginPage() {
  return (
    <div className="grid min-h-full w-full lg:grid-cols-2">
      <div className="relative flex h-80 flex-col border-b bg-muted p-4 sm:h-80 lg:min-h-screen lg:border-r">
        <LottieRenderer
          src={lottieAnimationSrc}
          className="absolute inset-0"
          style={{ width: "100%", height: "100%" }}
          autoplay={true}
          loop={true}
          speed={1}
          priority={true}
          fallback={
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center">
              <div className="text-white text-center">
                <div className="text-4xl mb-4">🎨</div>
                <div className="text-lg">Welcome</div>
                <div className="text-sm opacity-80">Animation loading...</div>
              </div>
            </div>
          }
        />
      </div>

      <div className="col-span-1">
        <UserLoginContainer />
      </div>
    </div>
  );
}
