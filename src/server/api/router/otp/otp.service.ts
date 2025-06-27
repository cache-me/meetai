import { TRPCError } from "@trpc/server";
import dayjs from "dayjs";
import { sendOtpInput, verifyOtpInput, resendOtpInput } from "./otp.input";
import { z } from "zod";
import { env } from "process";
import { prisma } from "@/server/db";
import { customAlphabet } from "nanoid";
import { NodeEnv } from "@/lib/env";

const MAX_ATTEMPTS = 5;
const nanoid = customAlphabet("1234567890", 6);
const DEV_OTP = "123456";

export const otpService = {
  async sendOtp(input: z.infer<typeof sendOtpInput>) {
    const existingOtp = await prisma.otp.findUnique({
      where: {
        mobileNumber_reason: {
          mobileNumber: input.mobileNumber,
          reason: input.reason,
        },
        expiresAt: {
          gt: dayjs().subtract(30, "seconds").toDate(),
        },
      },
    });
    if (existingOtp) {
      await prisma.otp.delete({ where: { id: existingOtp.id } });
    }

    const otp =
      process.env.OTP_ENV === NodeEnv.development ? DEV_OTP : await nanoid();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    // Create new OTP
    const otpCreated = await prisma.otp.create({
      data: {
        otp,
        reason: input.reason,
        expiresAt,
        mobileNumber: input.mobileNumber.trim(),
      },
    });

    if (env.NODE_ENV !== "development") {
      // send sms
    }

    return { id: otpCreated.id };
  },

  async resendOtp(input: z.infer<typeof resendOtpInput>) {
    const existingOtp = await prisma.otp.findUnique({
      where: {
        mobileNumber_reason: {
          mobileNumber: input.mobileNumber,
          reason: input.reason,
        },
      },
    });

    if (!existingOtp) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "OTP not sent yet! Use send OTP method.",
      });
    }

    if (dayjs().isAfter(existingOtp.expiresAt)) {
      await prisma.otp.delete({ where: { id: existingOtp.id } });
    }

    const resendAttempts = existingOtp.resendAttempts ?? 0;
    if (resendAttempts >= MAX_ATTEMPTS) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Maximum resend attempts reached!",
      });
    }

    await prisma.otp.update({
      where: { id: existingOtp.id },
      data: { resendAttempts: { increment: 1 } },
    });

    if (env.NODE_ENV !== "development") {
      // send sms
    }

    return { id: existingOtp.id };
  },

  async verifyOtp(input: z.infer<typeof verifyOtpInput>) {
    const otpDoc = await prisma.otp.findFirst({ where: { id: input.otpId } });

    if (!otpDoc) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "OTP not found",
      });
    }

    if (input.otp !== otpDoc.otp) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid OTP",
      });
    }

    return { success: true };
  },

  async cleanupExpiredOtps() {
    const deletedCount = await prisma.otp.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return { deletedCount: deletedCount.count };
  },
};
