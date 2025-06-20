import { router } from "../trpc";
import { otpRouter } from "./otp/otp.router";

export type AppRouter = typeof appRouter;

export const appRouter = router({
  otp: otpRouter,
});
