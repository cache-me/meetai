import { OtpReason } from "@prisma/client";
import { z } from "zod";

const mobileNumberSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Invalid mobile number format")
  .length(10, "Mobile number must be exactly 10 digits");

const otpRequestInput = z.object({
  mobileNumber: mobileNumberSchema,
  reason: z.nativeEnum(OtpReason),
});

export const sendOtpInput = otpRequestInput;
export const resendOtpInput = otpRequestInput;

export const verifyOtpInput = z.object({
  otpId: z.string().min(1, "OTP ID is required"),
  otp: z
    .string()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d+$/, "OTP must contain only digits"),
});

export const mobileNumberOnlyInput = z.object({
  mobileNumber: mobileNumberSchema,
});

export type SendOtpInput = z.infer<typeof sendOtpInput>;
export type ResendOtpInput = z.infer<typeof resendOtpInput>;
export type VerifyOtpInput = z.infer<typeof verifyOtpInput>;
export type MobileNumberOnlyInput = z.infer<typeof mobileNumberOnlyInput>;
