import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  REDIS_CACHE_TTL_SECONDS: z.coerce.number().default(60),
  JWT_SECRET: z.string().default("change-me-in-production"),
  CORS_ORIGIN: z.string().default("*"),
  DEFAULT_ADMIN_EMAIL: z.string().default("admin@crm.local"),
  DEFAULT_ADMIN_PASSWORD: z.string().default("admin123"),
  DEFAULT_USER_EMAIL: z.string().default("rep@crm.local"),
  DEFAULT_USER_PASSWORD: z.string().default("rep123"),
  SESSIONS_DIR: z.string().default("sessions"),
});

export const env = envSchema.parse(process.env);
