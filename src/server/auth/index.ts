import NextAuth, { CredentialsSignin, type DefaultSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/server/db";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import invariant from "tiny-invariant";
import "next-auth/jwt";
import { authConfig } from "@/server/auth/config";
import { verifyPassword } from "../password";
import { otpService } from "../api/router/otp/otp.service";
import { UserRole } from "@prisma/client";

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
  }
}

declare module "@auth/core/adapters" {
  interface AdapterUser {
    password: string;
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    name: string;
    role: UserRole;
  }
}

class InvalidCredentialsError extends CredentialsSignin {
  code = "Invalid credentials";
}

const credentialsSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8).max(64),
});

const userCredentialsSchema = z.object({
  mobileNumber: z.string().regex(/^[6-9]\d{9}$/, "Invalid mobile number"),
  otp: z.string(),
});

const adapter = PrismaAdapter(prisma);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter,
  providers: [
    Credentials({
      id: "admin-login",
      name: "Admin Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          throw new Error("Failed to parse credentials");
        }

        invariant(
          adapter.getUserByEmail,
          "Adapter does not implement getUserByEmail"
        );
        const user = await adapter.getUserByEmail(parsed.data.email);
        if (!user) {
          throw new InvalidCredentialsError();
        }

        // TODO: Validate password
        const valid = await verifyPassword(user.password, parsed.data.password);
        if (!valid) {
          throw new InvalidCredentialsError();
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
    Credentials({
      id: "user-login",
      name: "User Login",
      credentials: {
        mobileNumber: { label: "Mobile Number", type: "text" },
        otp: { label: "Otp", type: "text" },
      },
      async authorize(credentials) {
        try {
          const parsed = userCredentialsSchema.safeParse(credentials);
          if (!parsed.success) {
            throw new Error("Invalid credentials format");
          }

          const activeOtp = await prisma.otp.findUnique({
            where: {
              mobileNumber_reason: {
                mobileNumber: parsed.data.mobileNumber,
                reason: "LOGIN",
              },
            },
          });

          if (!activeOtp) {
            throw new Error("No active OTP found");
          }

          const otpVerification = await otpService.verifyOtp({
            otpId: activeOtp.id,
            otp: parsed.data.otp,
          });

          if (!otpVerification.success) {
            throw new Error("Invalid or expired OTP");
          }

          const user = await prisma.user.findFirst({
            where: {
              mobileNumber: parsed.data.mobileNumber,
              role: "USER",
            },
          });

          if (!user) {
            throw new Error("User not found");
          }

          const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: { isVerifiedMobileNumber: true },
          });

          await prisma.otp.deleteMany({
            where: {
              mobileNumber: parsed.data.mobileNumber,
              reason: "LOGIN",
            },
          });

          return {
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            mobileNumber: updatedUser.mobileNumber,
            role: updatedUser.role,
          };
        } catch (error) {
          throw error;
        }
      },
    }),
  ],
});
