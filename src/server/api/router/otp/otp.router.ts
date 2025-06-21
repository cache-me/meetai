import { publicProcedure, router } from "../../trpc";
import { sendOtpInput, verifyOtpInput, resendOtpInput } from "./otp.input";
import { otpService } from "./otp.service";

export const otpRouter = router({
  send: publicProcedure.input(sendOtpInput).mutation(({ input }) => {
    return otpService.sendOtp(input);
  }),

  verify: publicProcedure.input(verifyOtpInput).mutation(async ({ input }) => {
    return otpService.verifyOtp(input);
  }),

  resend: publicProcedure.input(resendOtpInput).mutation(async ({ input }) => {
    return otpService.resendOtp(input);
  }),
});
