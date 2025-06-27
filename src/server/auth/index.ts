import NextAuth, { CredentialsSignin, type DefaultSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/server/db";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import invariant from "tiny-invariant";
import "next-auth/jwt";
import { authConfig } from "@/server/auth/config";
import { verifyPassword } from "../password";
import { UserRole, OtpReason } from "@prisma/client";

// Extend NextAuth types to include our custom fields
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: UserRole;
      mobileNumber: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    mobileNumber: string;
  }
}

declare module "@auth/core/adapters" {
  interface AdapterUser {
    password?: string;
    role: UserRole;
    mobileNumber: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    name: string;
    role: UserRole;
    mobileNumber: string;
    id: string;
  }
}

// Custom error classes
class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
  message = "Invalid credentials provided";
}

class AccountNotFoundError extends CredentialsSignin {
  code = "account_not_found";
  message = "Account not found";
}

class AccountInactiveError extends CredentialsSignin {
  code = "account_inactive";
  message = "Account is inactive";
}

class ExpiredOTPError extends CredentialsSignin {
  code = "expired_otp";
  message = "OTP has expired";
}

// Validation schemas
const adminCredentialsSchema = z.object({
  email: z.string().email("Invalid email format").trim().toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters").max(64),
});

const userCredentialsSchema = z.object({
  mobileNumber: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Invalid mobile number format"),
  otp: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d+$/, "OTP must contain only digits"),
});

const adapter = PrismaAdapter(prisma);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter,
  providers: [
    Credentials({
      id: "admin-login",
      name: "Admin Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const parsed = adminCredentialsSchema.safeParse(credentials);
          if (!parsed.success) {
            console.error(
              "Admin login validation failed:",
              parsed.error.flatten()
            );
            throw new InvalidCredentialsError();
          }

          invariant(
            adapter.getUserByEmail,
            "Adapter does not implement getUserByEmail"
          );

          const user = await adapter.getUserByEmail(parsed.data.email);
          if (!user) {
            throw new AccountNotFoundError();
          }

          // Check if user is admin
          if (
            user.role !== UserRole.ADMIN &&
            user.role !== UserRole.SUPER_ADMIN
          ) {
            throw new InvalidCredentialsError();
          }

          // Check if account is active
          const fullUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { isActive: true, password: true },
          });

          if (!fullUser?.isActive) {
            throw new AccountInactiveError();
          }

          invariant(
            fullUser.password,
            "Admin user does not have a password set"
          );

          const isPasswordValid = await verifyPassword(
            fullUser.password,
            parsed.data.password
          );

          if (!isPasswordValid) {
            throw new InvalidCredentialsError();
          }

          // Update last login time
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });

          return {
            id: user.id,
            name: user.name || "",
            email: user.email || "",
            role: user.role,
            mobileNumber: user.mobileNumber || "",
          };
        } catch (error) {
          console.error("Admin login error:", error);
          throw error;
        }
      },
    }),

    Credentials({
      id: "user-login",
      name: "User Login",
      credentials: {
        mobileNumber: { label: "Mobile Number", type: "text" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        try {
          const parsed = userCredentialsSchema.safeParse(credentials);
          if (!parsed.success) {
            console.error(
              "User login validation failed:",
              parsed.error.flatten()
            );
            throw new InvalidCredentialsError();
          }

          // First, verify the OTP
          const activeOtp = await prisma.otp.findUnique({
            where: {
              mobileNumber_reason: {
                mobileNumber: parsed.data.mobileNumber,
                reason: OtpReason.LOGIN,
              },
            },
          });

          if (!activeOtp) {
            console.error(
              "No active OTP found for mobile:",
              parsed.data.mobileNumber
            );
            throw new InvalidCredentialsError();
          }

          // Check if OTP is expired
          if (activeOtp.expiresAt < new Date()) {
            console.error("OTP expired for mobile:", parsed.data.mobileNumber);
            throw new ExpiredOTPError();
          }

          // Check if OTP is already used
          if (activeOtp.isUsed) {
            console.error(
              "OTP already used for mobile:",
              parsed.data.mobileNumber
            );
            throw new InvalidCredentialsError();
          }

          // Verify OTP
          if (activeOtp.otp !== parsed.data.otp) {
            console.error(
              "Invalid OTP provided for mobile:",
              parsed.data.mobileNumber
            );
            throw new InvalidCredentialsError();
          }

          // Mark OTP as used first
          await prisma.otp.update({
            where: { id: activeOtp.id },
            data: {
              isUsed: true,
              usedAt: new Date(),
            },
          });

          // Try to find existing user
          let user = await prisma.user.findFirst({
            where: {
              mobileNumber: parsed.data.mobileNumber,
              role: UserRole.USER,
            },
            select: {
              id: true,
              name: true,
              email: true,
              mobileNumber: true,
              role: true,
              isActive: true,
              isVerifiedMobileNumber: true,
            },
          });

          let isNewUser = false;

          // If user doesn't exist, create a new one
          if (!user) {
            console.log(
              "Creating new user for mobile:",
              parsed.data.mobileNumber
            );
            isNewUser = true;

            user = await prisma.user.create({
              data: {
                mobileNumber: parsed.data.mobileNumber,
                role: UserRole.USER,
                isActive: true,
                isVerifiedMobileNumber: true,
                lastLoginAt: new Date(),
              },
              select: {
                id: true,
                name: true,
                email: true,
                mobileNumber: true,
                role: true,
                isActive: true,
                isVerifiedMobileNumber: true,
              },
            });
          } else {
            // Check if existing user is active
            if (!user.isActive) {
              console.error(
                "User account is inactive:",
                parsed.data.mobileNumber
              );
              throw new AccountInactiveError();
            }

            // Update existing user login info
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                isVerifiedMobileNumber: true,
                lastLoginAt: new Date(),
              },
              select: {
                id: true,
                name: true,
                email: true,
                mobileNumber: true,
                role: true,
                isActive: true,
                isVerifiedMobileNumber: true,
              },
            });
          }

          // Clean up used OTPs
          await prisma.otp
            .deleteMany({
              where: {
                mobileNumber: parsed.data.mobileNumber,
                reason: OtpReason.LOGIN,
                isUsed: true,
              },
            })
            .catch((error) => {
              console.error("Failed to cleanup OTPs:", error);
            });

          console.log(
            isNewUser
              ? "New user created and logged in:"
              : "Existing user logged in:",
            parsed.data.mobileNumber
          );

          return {
            id: user.id,
            name: user.name || "",
            email: user.email || "",
            mobileNumber: user.mobileNumber,
            role: user.role,
          };
        } catch (error) {
          console.error("User login error:", error);
          throw error;
        }
      },
    }),
  ],
});
