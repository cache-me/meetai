import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const boolean = z.preprocess((value) => {
  if (typeof value === "string") {
    return JSON.parse(value);
  }
  return value;
}, z.boolean());

export enum NodeEnv {
  production = "production",
  staging = "staging",
  development = "development",
}

export const env = createEnv({
  /*
   * Serverside Environment variables, not available on the client.
   * Will throw if you access these variables on the client.
   */
  server: {
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string().min(1),
    AUTH_SECRET: z.string().min(1),
    AUTH_TRUST_HOST: boolean.default(false),
    NODE_ENV: z.enum([
      NodeEnv.development,
      NodeEnv.staging,
      NodeEnv.production,
    ]),
    OTP_ENV: z.string(),
  },
  /*
   * Environment variables available on the client (and server).
   */
  client: {},
  /*
   * Due to how Next.js bundles environment variables on Edge and Client,
   * we need to manually destructure them to make sure all are included in bundle.
   */
  runtimeEnv: {
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST,
    NODE_ENV: process.env.NODE_ENV,
    OTP_ENV: process.env.OTP_ENV,
  },
});
