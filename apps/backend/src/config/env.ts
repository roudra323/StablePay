// Environment configuration
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Database
  DATABASE_URL: z.string().url(),

  // Blockchain
  RPC_URL: z.string().url().default("http://127.0.0.1:8545"), // Anvil RPC URL by default
  CHAIN_ID: z.coerce.number().default(31337), // Anvil Chain ID by default

  // Optional: For write operations
  PRIVATE_KEY: z.string().optional(),

  // Server
  PORT: z.coerce.number().default(3000),
});

const parseEnv = () => {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }

  return parsed.data;
};

export const env = parseEnv();

export type Env = z.infer<typeof envSchema>;
