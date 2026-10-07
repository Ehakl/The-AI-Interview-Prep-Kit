import { z } from "zod";

const envSchema = z.object({
  BACKEND_API_URL: z.string().url().optional(),
});

export const env = envSchema.parse({
  BACKEND_API_URL: process.env.BACKEND_API_URL,
});
