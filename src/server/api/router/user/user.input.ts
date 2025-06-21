import { z } from "zod";

export const initiateLoginInput = z.object({
  mobileNumber: z.string().regex(/^[6-9]\d{9}$/, "Invalid mobile number"),
});

export const verifyOTPInput = z.object({
  mobileNumber: z.string().regex(/^[6-9]\d{9}$/, "Invalid mobile number"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export const newUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  mobileNumber: z
    .string()
    .regex(/^\d{10}$/, "Mobile number must be exactly 10 digits"),
  role: z.literal("USER"),
});

export const MOBILE_REGEX = /^[6-9]\d{9}$/;

export const mobileNumberInput = z.object({
  mobileNumber: z.string().regex(MOBILE_REGEX, "Invalid Mobile Number"),
});

export const registrationInput = z.object({
  mobileNumber: z.string().regex(MOBILE_REGEX, "Invalid Mobile Number"),
  name: z.string().min(1, "This field is required"),
  email: z.string().email(),
  gender: z.string().min(1, "Select atleast one option"),
  address: z.string().min(1, "This field is required"),
});

export type MobileNumberInput = z.infer<typeof mobileNumberInput>;
export type RegistrationInput = z.infer<typeof registrationInput>;
