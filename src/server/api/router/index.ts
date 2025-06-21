import { router } from "../trpc";
import { otpRouter } from "./otp/otp.router";
import { userRouter } from "./user/user.router";

export type AppRouter = typeof appRouter;

export const appRouter = router({
  otp: otpRouter,
  user: userRouter,
});
