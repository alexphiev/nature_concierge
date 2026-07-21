import { config } from "dotenv";
import { PrismaClient } from "../../prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";

config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });
