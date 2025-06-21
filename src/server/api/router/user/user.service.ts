import { prisma } from "@/server/db";
import { TRPCError } from "@trpc/server";
import { type Session } from "next-auth";
import { z } from "zod";
import {
  initiateLoginInput,
  MobileNumberInput,
  newUserSchema,
  RegistrationInput,
  verifyOTPInput,
} from "./user.input";
import { otpService } from "../otp/otp.service";
import { OtpReason, UserRole } from "@prisma/client";
import argon2 from "argon2";

const getRequiredEnvVar = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export async function createNewUser(input: RegistrationInput) {
  const userData = {
    name: `${input.name}`,
    email: `${input.email}`,
    mobileNumber: input.mobileNumber,
    role: UserRole.USER,
  };

  const validatedData = newUserSchema.parse(userData);
  const defaultPassword = getRequiredEnvVar("DEFAULT_PASSWORD");
  const hashedPassword = await argon2.hash(defaultPassword);

  const user = await prisma.user.create({
    data: {
      ...validatedData,
      address: input.address,
      gender: input.gender,
      password: hashedPassword,
      isVerifiedMobileNumber: false,
      emailVerified: new Date(),
    },
  });

  return user;
}

export async function getMe(session: Session) {
  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
  });
  if (!user) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Failed to find logged in user",
    });
  }

  return {
    user,
  };
}

export async function initiateLogin(input: z.infer<typeof initiateLoginInput>) {
  try {
    const user = await prisma.user.findFirst({
      where: {
        mobileNumber: input.mobileNumber,
      },
    });
    if (!user) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You need to register first",
      });
    }
    const result = await otpService.sendOtp({
      mobileNumber: input.mobileNumber,
      reason: OtpReason.LOGIN,
    });
    return {
      userFound: !!user,
      otpId: result.id,
      user: user || null,
    };
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to initiate login",
    });
  }
}

export async function verifyLoginOTP(input: z.infer<typeof verifyOTPInput>) {
  const user = await prisma.user.findFirst({
    where: {
      mobileNumber: input.mobileNumber,
    },
  });

  if (!user) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "User not found",
    });
  }
  const activeOtp = await prisma.otp.findUnique({
    where: {
      mobileNumber_reason: {
        mobileNumber: input.mobileNumber,
        reason: OtpReason.LOGIN,
      },
    },
  });

  if (!activeOtp) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "No active OTP found",
    });
  }

  const result = await otpService.verifyOtp({
    otp: input.otp,
    otpId: activeOtp.id,
  });

  if (result.success) {
    return {
      success: true,
      userId: user.id,
    };
  }

  throw new TRPCError({
    code: "UNAUTHORIZED",
    message: "Invalid OTP",
  });
}

export async function isUserRegistered(input: MobileNumberInput) {
  try {
    const isRegistered = await prisma.user.findUnique({
      where: {
        mobileNumber: input.mobileNumber,
      },
    });
    return !!isRegistered;
  } catch {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong",
    });
  }
}
