import { prisma } from "@/server/db";
import { TRPCError } from "@trpc/server";
import { type Session } from "next-auth";
import argon2 from "argon2";
import { OtpReason, UserRole } from "@prisma/client";
import { otpService } from "../otp/otp.service";
import { z } from "zod";
import {
  type InitiateLoginInput,
  type VerifyLoginOTPInput,
  type RegistrationInput,
  type UpdateProfileInput,
  type UpdatePasswordInput,
  createUserSchema,
} from "./user.input";

// Zod schemas for aggregation results
const userAggregationSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  mobileNumber: z.string(),
  gender: z.string().optional(),
  address: z.string().optional(),
  image: z.string().optional(),
  role: z.nativeEnum(UserRole),
  isVerifiedMobileNumber: z.boolean().optional(),
  isActive: z.boolean().optional(),
  emailVerified: z.date().optional(),
  lastLoginAt: z.date().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

const basicUserSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  mobileNumber: z.string(),
  role: z.nativeEnum(UserRole),
  isVerifiedMobileNumber: z.boolean(),
});

const existingUserCheckSchema = z.object({
  id: z.string(),
  mobileNumber: z.string(),
  email: z.string().email().optional(),
});

const otpAggregationSchema = z.object({
  id: z.string(),
  otp: z.string(),
  isUsed: z.boolean(),
  expiresAt: z.date(),
});

const passwordUserSchema = z.object({
  password: z.string(),
});

const registrationCheckSchema = z.object({
  id: z.string(),
});

// Type definitions
type UserAggregation = z.infer<typeof userAggregationSchema>;
type BasicUser = z.infer<typeof basicUserSchema>;

const getRequiredEnvVar = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

// Helper function to safely parse aggregation results
const parseAggregationResult = <T>(
  result: unknown,
  schema: z.ZodSchema<T>,
  errorMessage: string
): T[] => {
  if (!Array.isArray(result)) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `${errorMessage}: Invalid result format`,
    });
  }

  return result.map((item, index) => {
    const parsed = schema.safeParse(item);
    if (!parsed.success) {
      console.error(`Parsing error at index ${index}:`, parsed.error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `${errorMessage}: Data validation failed`,
      });
    }
    return parsed.data;
  });
};

// Helper function to get single result from aggregation
const getSingleResult = <T>(results: T[], notFoundMessage: string): T => {
  if (results.length === 0) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: notFoundMessage,
    });
  }
  return results[0]!;
};

export const userService = {
  async getMe(session: Session): Promise<UserAggregation> {
    const pipeline = [
      {
        $match: {
          _id: { $oid: session.user.id },
        },
      },
      {
        $project: {
          id: { $toString: "$_id" },
          name: 1,
          email: 1,
          mobileNumber: 1,
          gender: 1,
          address: 1,
          image: 1,
          role: 1,
          isVerifiedMobileNumber: 1,
          isActive: 1,
          emailVerified: 1,
          lastLoginAt: 1,
          createdAt: 1,
          updatedAt: 1,
          _id: 0,
        },
      },
    ];

    const result = await prisma.user.aggregateRaw({
      pipeline,
    });

    const users = parseAggregationResult(
      result,
      userAggregationSchema,
      "Failed to parse user data"
    );

    return getSingleResult(users, "User not found");
  },

  async createUser(input: RegistrationInput): Promise<BasicUser> {
    console.log("Creating new user with input:", input);

    // Check for existing user using aggregation
    const existingUserPipeline = [
      {
        $match: {
          $or: [
            { mobileNumber: input.mobileNumber },
            ...(input.email ? [{ email: input.email }] : []),
          ],
        },
      },
      {
        $project: {
          id: { $toString: "$_id" },
          mobileNumber: 1,
          email: 1,
          _id: 0,
        },
      },
    ];

    const existingUserResult = await prisma.user.aggregateRaw({
      pipeline: existingUserPipeline,
    });

    const existingUsers = parseAggregationResult(
      existingUserResult,
      existingUserCheckSchema,
      "Failed to parse existing user data"
    );

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0]!;
      if (existingUser.mobileNumber === input.mobileNumber) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User with this mobile number already exists",
        });
      }
      if (existingUser.email === input.email) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User with this email already exists",
        });
      }
    }

    const userData = createUserSchema.parse({
      name: input.name,
      email: input.email,
      mobileNumber: input.mobileNumber,
      gender: input.gender,
      address: input.address,
      role: UserRole.USER,
    });

    const defaultPassword = getRequiredEnvVar("DEFAULT_PASSWORD");
    const hashedPassword = await argon2.hash(defaultPassword);

    const user = await prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
        isVerifiedMobileNumber: false,
        isActive: true,
        emailVerified: input.email ? new Date() : null,
      },
    });

    // Return user data using aggregation
    const userPipeline = [
      {
        $match: {
          _id: user.id,
        },
      },
      {
        $project: {
          id: { $toString: "$_id" },
          name: 1,
          email: 1,
          mobileNumber: 1,
          gender: 1,
          address: 1,
          role: 1,
          isVerifiedMobileNumber: 1,
          createdAt: 1,
          _id: 0,
        },
      },
    ];

    const userResult = await prisma.user.aggregateRaw({
      pipeline: userPipeline,
    });

    const users = parseAggregationResult(
      userResult,
      basicUserSchema,
      "Failed to parse created user data"
    );

    return getSingleResult(users, "Failed to retrieve created user");
  },

  async initiateLogin(input: InitiateLoginInput) {
    try {
      // Check if user exists using aggregation
      const userPipeline = [
        {
          $match: {
            mobileNumber: input.mobileNumber,
            isActive: true,
          },
        },
        {
          $project: {
            id: { $toString: "$_id" },
            name: 1,
            email: 1,
            mobileNumber: 1,
            role: 1,
            isVerifiedMobileNumber: 1,
            _id: 0,
          },
        },
      ];

      const userResult = await prisma.user.aggregateRaw({
        pipeline: userPipeline,
      });

      const users = parseAggregationResult(
        userResult,
        basicUserSchema,
        "Failed to parse user data during login initiation"
      );

      // If user doesn't exist, create one
      let user: BasicUser;
      if (users.length === 0) {
        console.log(
          "User not found, creating new user for mobile:",
          input.mobileNumber
        );

        // Create new user
        const newUser = await prisma.user.create({
          data: {
            mobileNumber: input.mobileNumber,
            role: UserRole.USER,
            isActive: true,
            isVerifiedMobileNumber: false,
            name: `User_${input.mobileNumber.slice(-4)}`, // Default name
          },
        });

        user = {
          id: newUser.id,
          name: newUser.name ?? undefined,
          email: newUser.email ?? undefined,
          mobileNumber: newUser.mobileNumber,
          role: newUser.role,
          isVerifiedMobileNumber: newUser.isVerifiedMobileNumber,
        };
      } else {
        user = users[0]!;
      }

      // Delete any existing OTPs for this mobile number and reason
      await prisma.otp.deleteMany({
        where: {
          mobileNumber: input.mobileNumber,
          reason: OtpReason.LOGIN,
        },
      });

      const otpResult = await otpService.sendOtp({
        mobileNumber: input.mobileNumber,
        reason: OtpReason.LOGIN,
      });

      return {
        success: true,
        otpId: otpResult.id,
        user: {
          id: user.id,
          name: user.name,
          mobileNumber: user.mobileNumber,
          isVerifiedMobileNumber: user.isVerifiedMobileNumber,
        },
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error("Login initiation error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to initiate login process",
      });
    }
  },

  async verifyLoginOTP(input: VerifyLoginOTPInput) {
    try {
      // Find user using aggregation
      const userPipeline = [
        {
          $match: {
            mobileNumber: input.mobileNumber,
            isActive: true,
          },
        },
        {
          $project: {
            id: { $toString: "$_id" },
            name: 1,
            email: 1,
            mobileNumber: 1,
            role: 1,
            isVerifiedMobileNumber: 1,
            _id: 0,
          },
        },
      ];

      const userResult = await prisma.user.aggregateRaw({
        pipeline: userPipeline,
      });

      const users = parseAggregationResult(
        userResult,
        basicUserSchema,
        "Failed to parse user data during OTP verification"
      );

      // const user = getSingleResult(users, "User not found");
      getSingleResult(users, "User not found");

      // Find active OTP using aggregation
      const otpPipeline = [
        {
          $match: {
            mobileNumber: input.mobileNumber,
            reason: OtpReason.LOGIN,
            isUsed: false,
          },
        },
        {
          $sort: {
            createdAt: -1,
          },
        },
        {
          $limit: 1,
        },
        {
          $project: {
            id: { $toString: "$_id" },
            otp: 1,
            isUsed: 1,
            expiresAt: 1,
            _id: 0,
          },
        },
      ];

      const otpResult = await prisma.otp.aggregateRaw({
        pipeline: otpPipeline,
      });

      const otps = parseAggregationResult(
        otpResult,
        otpAggregationSchema,
        "Failed to parse OTP data"
      );

      const activeOtp = getSingleResult(
        otps,
        "No active OTP found. Please request a new OTP."
      );

      if (activeOtp.isUsed) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "OTP has already been used",
        });
      }

      if (new Date(activeOtp.expiresAt) < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "OTP has expired. Please request a new OTP.",
        });
      }

      if (activeOtp.otp !== input.otp) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid OTP",
        });
      }

      // Mark OTP as used
      await prisma.otp.updateMany({
        where: {
          mobileNumber: input.mobileNumber,
          reason: OtpReason.LOGIN,
          otp: input.otp,
        },
        data: {
          isUsed: true,
          usedAt: new Date(),
        },
      });

      // Update user
      await prisma.user.update({
        where: { mobileNumber: input.mobileNumber },
        data: {
          isVerifiedMobileNumber: true,
          lastLoginAt: new Date(),
        },
      });

      // Clean up old OTPs
      await prisma.otp
        .deleteMany({
          where: {
            mobileNumber: input.mobileNumber,
            reason: OtpReason.LOGIN,
            isUsed: true,
          },
        })
        .catch((error) => {
          console.error("Failed to cleanup OTPs:", error);
        });

      // Return updated user data using aggregation
      const updatedUserPipeline = [
        {
          $match: {
            mobileNumber: input.mobileNumber,
            isActive: true,
          },
        },
        {
          $project: {
            id: { $toString: "$_id" },
            name: 1,
            email: 1,
            mobileNumber: 1,
            role: 1,
            _id: 0,
          },
        },
      ];

      const updatedUserResult = await prisma.user.aggregateRaw({
        pipeline: updatedUserPipeline,
      });

      const updatedUsers = parseAggregationResult(
        updatedUserResult,
        basicUserSchema,
        "Failed to parse updated user data"
      );

      const updatedUser = getSingleResult(
        updatedUsers,
        "Failed to retrieve updated user"
      );

      return {
        success: true,
        user: updatedUser,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error("OTP verification error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to verify OTP",
      });
    }
  },

  async updateProfile(
    userId: string,
    input: UpdateProfileInput
  ): Promise<UserAggregation> {
    try {
      if (input.email) {
        // Check for existing email using aggregation
        const existingEmailPipeline = [
          {
            $match: {
              email: input.email,
              _id: { $ne: { $oid: userId } },
            },
          },
          {
            $project: {
              id: { $toString: "$_id" },
              email: 1,
              _id: 0,
            },
          },
        ];

        const existingEmailResult = await prisma.user.aggregateRaw({
          pipeline: existingEmailPipeline,
        });

        const existingEmailSchema = z.object({
          id: z.string(),
          email: z.string().email(),
        });

        const existingUsers = parseAggregationResult(
          existingEmailResult,
          existingEmailSchema,
          "Failed to parse existing email data"
        );

        if (existingUsers.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email is already taken by another user",
          });
        }
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          ...input,
          ...(input.email && { emailVerified: new Date() }),
        },
      });

      // Return updated user using aggregation
      const userPipeline = [
        {
          $match: {
            _id: { $oid: userId },
          },
        },
        {
          $project: {
            id: { $toString: "$_id" },
            name: 1,
            email: 1,
            mobileNumber: 1,
            gender: 1,
            address: 1,
            image: 1,
            role: 1,
            updatedAt: 1,
            _id: 0,
          },
        },
      ];

      const userResult = await prisma.user.aggregateRaw({
        pipeline: userPipeline,
      });

      const users = parseAggregationResult(
        userResult,
        userAggregationSchema,
        "Failed to parse updated profile data"
      );

      return getSingleResult(users, "Failed to retrieve updated profile");
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error("Profile update error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update profile",
      });
    }
  },

  async updatePassword(
    userId: string,
    input: UpdatePasswordInput
  ): Promise<{ success: boolean }> {
    try {
      // Get user password using aggregation
      const userPipeline = [
        {
          $match: {
            _id: { $oid: userId },
          },
        },
        {
          $project: {
            password: 1,
            _id: 0,
          },
        },
      ];

      const userResult = await prisma.user.aggregateRaw({
        pipeline: userPipeline,
      });

      const users = parseAggregationResult(
        userResult,
        passwordUserSchema,
        "Failed to parse user password data"
      );

      const user = getSingleResult(users, "User not found");

      if (!user.password) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User does not have a password set",
        });
      }

      const isCurrentPasswordValid = await argon2.verify(
        user.password,
        input.currentPassword
      );

      if (!isCurrentPasswordValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Current password is incorrect",
        });
      }

      const hashedNewPassword = await argon2.hash(input.newPassword);

      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword },
      });

      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error("Password update error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update password",
      });
    }
  },

  async deactivateUser(userId: string): Promise<{ success: boolean }> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });

      return { success: true };
    } catch (error) {
      console.error("User deactivation error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to deactivate user",
      });
    }
  },

  async isUserRegistered(mobileNumber: string): Promise<boolean> {
    try {
      const pipeline = [
        {
          $match: {
            mobileNumber: mobileNumber,
          },
        },
        {
          $project: {
            id: { $toString: "$_id" },
            _id: 0,
          },
        },
        {
          $limit: 1,
        },
      ];

      const result = await prisma.user.aggregateRaw({
        pipeline,
      });

      const users = parseAggregationResult(
        result,
        registrationCheckSchema,
        "Failed to parse user registration data"
      );

      return users.length > 0;
    } catch (error) {
      console.error("Error checking user registration:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to check user registration status",
      });
    }
  },
};

export const getMe = userService.getMe;
export const createNewUser = userService.createUser;
export const isUserRegistered = userService.isUserRegistered;
export const initiateLogin = userService.initiateLogin;
export const verifyLoginOTP = userService.verifyLoginOTP;
