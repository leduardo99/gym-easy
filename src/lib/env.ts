import "server-only";

import { z } from "zod";

const postgresUrl = z
  .string()
  .min(1)
  .refine(
    (value) =>
      value.startsWith("postgres://") || value.startsWith("postgresql://"),
    "DATABASE_URL must be a postgres connection string",
  );

/** Resend's shared onboarding sender. Used when EMAIL_FROM is unset. */
export const DEFAULT_EMAIL_FROM = "onboarding@resend.dev";

export const serverEnvSchema = z
  .object({
    DATABASE_URL: postgresUrl,
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    RESEND_API_KEY: z.string().min(1).optional(),
    EMAIL_FROM: z.email().optional(),
    EMAIL_CAPTURE_PATH: z.string().min(1).optional(),
    VERCEL_ENV: z.string().optional(),
    NEXT_PUBLIC_DATABASE_URL: z.string().optional(),
    NEXT_PUBLIC_RESEND_API_KEY: z.string().optional(),
    NEXT_PUBLIC_EMAIL_FROM: z.string().optional(),
  })
  .superRefine((value, context) => {
    const publicSecrets = [
      ["NEXT_PUBLIC_DATABASE_URL", value.NEXT_PUBLIC_DATABASE_URL],
      ["NEXT_PUBLIC_RESEND_API_KEY", value.NEXT_PUBLIC_RESEND_API_KEY],
      ["NEXT_PUBLIC_EMAIL_FROM", value.NEXT_PUBLIC_EMAIL_FROM],
    ] as const;

    for (const [key, keyValue] of publicSecrets) {
      if (keyValue !== undefined) {
        context.addIssue({
          code: "custom",
          path: [key],
          message: `${key.replace("NEXT_PUBLIC_", "")} is server-only and must not use the NEXT_PUBLIC_ prefix`,
        });
      }
    }
  });

export type ServerEnv = {
  DATABASE_URL: string;
  NODE_ENV: "development" | "test" | "production";
  RESEND_API_KEY: string | null;
  EMAIL_FROM: string;
  EMAIL_CAPTURE_PATH: string | null;
};

/** Non-connecting stand-in so `next build` can evaluate server modules. */
export const BUILD_DATABASE_URL =
  "postgresql://build:build@127.0.0.1:5432/build";

export function isProductionBuild(source: NodeJS.ProcessEnv): boolean {
  return source.NEXT_PHASE === "phase-production-build";
}

export function readServerEnv(
  source: NodeJS.ProcessEnv = process.env,
): ServerEnv {
  const databaseUrl =
    source.DATABASE_URL ??
    (isProductionBuild(source) ? BUILD_DATABASE_URL : undefined);

  const parsed = serverEnvSchema.safeParse({
    DATABASE_URL: databaseUrl,
    NODE_ENV: source.NODE_ENV,
    RESEND_API_KEY: source.RESEND_API_KEY || undefined,
    EMAIL_FROM: source.EMAIL_FROM || undefined,
    EMAIL_CAPTURE_PATH: source.EMAIL_CAPTURE_PATH || undefined,
    VERCEL_ENV: source.VERCEL_ENV,
    NEXT_PUBLIC_DATABASE_URL: source.NEXT_PUBLIC_DATABASE_URL,
    NEXT_PUBLIC_RESEND_API_KEY: source.NEXT_PUBLIC_RESEND_API_KEY,
    NEXT_PUBLIC_EMAIL_FROM: source.NEXT_PUBLIC_EMAIL_FROM,
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${details}`);
  }

  return {
    DATABASE_URL: parsed.data.DATABASE_URL,
    NODE_ENV: parsed.data.NODE_ENV,
    RESEND_API_KEY: parsed.data.RESEND_API_KEY ?? null,
    EMAIL_FROM: parsed.data.EMAIL_FROM ?? DEFAULT_EMAIL_FROM,
    EMAIL_CAPTURE_PATH:
      parsed.data.VERCEL_ENV === "production"
        ? null
        : (parsed.data.EMAIL_CAPTURE_PATH ?? null),
  };
}

let cached: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  cached ??= readServerEnv();
  return cached;
}
