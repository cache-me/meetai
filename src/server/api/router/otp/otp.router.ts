import { adminProcedure, publicProcedure, router } from "../../trpc";
import { sendOtpInput, verifyOtpInput, resendOtpInput } from "./otp.input";
import { otpService } from "./otp.service";

export const otpRouter = router({
  send: publicProcedure
    .input(sendOtpInput)
    .mutation(({ input }) => otpService.sendOtp(input)),

  verify: publicProcedure
    .input(verifyOtpInput)
    .mutation(({ input }) => otpService.verifyOtp(input)),

  resend: publicProcedure
    .input(resendOtpInput)
    .mutation(({ input }) => otpService.resendOtp(input)),

  cleanupExpired: adminProcedure.mutation(() =>
    otpService.cleanupExpiredOtps()
  ),
});
