import { OtpReason } from "@prisma/client";
import { z } from "zod";

const mobileNumberSchema = z
  .string()
  .trim()
  .min(10, "Mobile number must be at least 10 digits")
  .max(15, "Mobile number must not exceed 15 digits")
  .regex(/^\+?[\d\s-()]+$/, "Invalid mobile number format");

const otpRequestInput = z.object({
  mobileNumber: mobileNumberSchema,
  reason: z.nativeEnum(OtpReason),
});

export const sendOtpInput = otpRequestInput;
export const resendOtpInput = otpRequestInput;

export const verifyOtpInput = z.object({
  otpId: z.string(),
  otp: z
    .string()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d+$/, "OTP must contain only digits"),
});
