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

export const serverEnvSchema = z
  .object({
    DATABASE_URL: postgresUrl,
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    NEXT_PUBLIC_DATABASE_URL: z.string().optional(),
  })
  .superRefine((value, context) => {
    if (value.NEXT_PUBLIC_DATABASE_URL !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["NEXT_PUBLIC_DATABASE_URL"],
        message:
          "DATABASE_URL is server-only and must not use the NEXT_PUBLIC_ prefix",
      });
    }
  });

export type ServerEnv = {
  DATABASE_URL: string;
  NODE_ENV: "development" | "test" | "production";
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
    NEXT_PUBLIC_DATABASE_URL: source.NEXT_PUBLIC_DATABASE_URL,
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
  };
}

let cached: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  cached ??= readServerEnv();
  return cached;
}
