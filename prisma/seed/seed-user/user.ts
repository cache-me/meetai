import { PrismaClient, UserRole, Gender } from "@prisma/client";
import { z } from "zod";
import argon2 from "argon2";
import userData from "./user.json";
import { getRequiredEnvVar } from "@/lib/utils";
import { logger } from "@/lib/logger";

const userDataSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z
    .string()
    .email()
    .transform((email) => email.toLowerCase().trim()),
  role: z.nativeEnum(UserRole),
  mobileNumber: z
    .string()
    .regex(/^\d{10}$/, "Mobile number must be exactly 10 digits"),
  gender: z.nativeEnum(Gender).optional(),
  address: z.string().optional(),
  image: z.string().url().optional(),
  isActive: z.boolean().default(true),
});

export async function seedUsers(prisma: PrismaClient) {
  console.group("🕐 Seeding users");

  try {
    const defaultPassword = getRequiredEnvVar("DEFAULT_PASSWORD");
    const hashedPassword = await argon2.hash(defaultPassword);

    // Parse and validate all user data
    const validatedUsers = z.array(userDataSchema).parse(userData);

    for (const user of validatedUsers) {
      const {
        name,
        email,
        role,
        mobileNumber,
        gender,
        address,
        image,
        isActive,
      } = user;

      logger.info(`🕐 Seeding user: ${name} (${email})`);

      try {
        await prisma.user.upsert({
          where: { email },
          create: {
            name,
            email,
            emailVerified: new Date(),
            password: hashedPassword,
            role,
            mobileNumber,
            isVerifiedMobileNumber: true,
            gender,
            address,
            image,
            isActive,
          },
          update: {
            name,
            role,
            gender,
            address,
            image,
            isActive,
          },
        });

        logger.info(`✅ Successfully seeded user: ${name}`);
      } catch (error) {
        logger.error(`❌ Failed to seed user ${name}:`, error);
        throw error;
      }
    }

    logger.info("✅ Successfully seeded all users");
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error(
        "❌ Invalid user data:",
        JSON.stringify(error.errors, null, 2)
      );
    } else {
      logger.error("❌ Failed to seed users:", error);
    }
    throw error;
  } finally {
    console.groupEnd();
  }
}
