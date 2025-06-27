import { z } from "zod";
import { Gender, UserRole } from "@prisma/client";

export const MOBILE_REGEX = /^[6-9]\d{9}$/;

const mobileNumberSchema = z
  .string()
  .trim()
  .regex(MOBILE_REGEX, "Invalid mobile number format")
  .length(10, "Mobile number must be exactly 10 digits");

const emailSchema = z
  .string()
  .email("Invalid email format")
  .trim()
  .toLowerCase();

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(100, "Name must not exceed 100 characters");

const addressSchema = z
  .string()
  .trim()
  .min(1, "Address is required")
  .max(500, "Address must not exceed 500 characters");

export const initiateLoginInput = z.object({
  mobileNumber: mobileNumberSchema,
});

export const verifyLoginOTPInput = z.object({
  mobileNumber: mobileNumberSchema,
  otp: z
    .string()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d+$/, "OTP must contain only digits"),
});

export const registrationInput = z.object({
  name: nameSchema,
  email: emailSchema.optional(),
  mobileNumber: mobileNumberSchema,
  gender: z.nativeEnum(Gender, {
    errorMap: () => ({ message: "Please select a valid gender option" }),
  }),
  address: addressSchema,
});

export const createUserSchema = z.object({
  name: nameSchema,
  email: emailSchema.optional(),
  mobileNumber: mobileNumberSchema,
  role: z.nativeEnum(UserRole).default(UserRole.USER),
  gender: z.nativeEnum(Gender).optional(),
  address: addressSchema.optional(),
  password: z.string().optional(),
});

export const mobileNumberInput = z.object({
  mobileNumber: mobileNumberSchema,
});

export const adminLoginInput = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(64, "Password must not exceed 64 characters"),
});

export const updatePasswordInput = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(64, "Password must not exceed 64 characters"),
});

export const updateProfileInput = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  gender: z.nativeEnum(Gender).optional(),
  address: addressSchema.optional(),
});

export type InitiateLoginInput = z.infer<typeof initiateLoginInput>;
export type VerifyLoginOTPInput = z.infer<typeof verifyLoginOTPInput>;
export type RegistrationInput = z.infer<typeof registrationInput>;
export type CreateUserSchema = z.infer<typeof createUserSchema>;
export type MobileNumberInput = z.infer<typeof mobileNumberInput>;
export type AdminLoginInput = z.infer<typeof adminLoginInput>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordInput>;
export type UpdateProfileInput = z.infer<typeof updateProfileInput>;
