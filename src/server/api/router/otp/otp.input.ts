import { OtpReason } from "@prisma/client";
import { z } from "zod";

export const sendOtpInput = z.object({
  mobileNumber: z.string().trim(),
  reason: z.nativeEnum(OtpReason),
});

export const verifyOtpInput = z.object({
  otpId: z.string(),
  otp: z.string(),
});

export const resendOtpInput = z.object({
  mobileNumber: z.string().trim(),
  reason: z.nativeEnum(OtpReason),
});
