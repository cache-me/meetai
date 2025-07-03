import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { seedUsers } from "./seed-user/user";

dotenv.config();

async function seedData() {
  const prisma = new PrismaClient();

  const seedAll = process.env.SEED_ALL === "true";

  if (seedAll || process.env.SEED_USER === "true") {
    await seedUsers(prisma);
  }
}

seedData();
