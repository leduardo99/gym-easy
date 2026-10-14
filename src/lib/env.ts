import "server-only";

import { z } from "zod";

import { accessControlAllowOrigin } from "./app-url";

const postgresUrl = z
  .string()
  .min(1)
  .refine(
    (value) =>
      value.startsWith("postgres://") || value.startsWith("postgresql://"),
    "DATABASE_URL must be a postgres connection string",
  );

/** Display name plus Resend's shared onboarding address. Used when EMAIL_FROM is unset. */
export const DEFAULT_EMAIL_FROM = "Gym Easy <onboarding@resend.dev>";

/** Stand-in so `next build` can evaluate server modules. Never used at runtime. */
export const BUILD_CONFIRM_EMAIL_SECRET =
  "build-only-confirm-email-secret-not-runtime";

const confirmEmailSecret = z
  .string()
  .min(32, "CONFIRM_EMAIL_SECRET must be at least 32 characters");

const emailAddress = z.email();

export type EmailTransportSetting = "resend" | "smtp" | "log";

const configuredEmailTransport = z.enum(["resend", "smtp", "log"]);

const smtpPort = z
  .string()
  .regex(/^[0-9]{1,5}$/u, "SMTP_PORT must be an integer from 1 to 65535")
  .refine((value) => {
    const port = Number(value);
    return port >= 1 && port <= 65535;
  }, "SMTP_PORT must be an integer from 1 to 65535");

const smtpSecureValue = z.enum(["true", "false", "1", "0"]);

function resolveEmailTransport(
  nodeEnv: "development" | "test" | "production",
  configured: z.infer<typeof configuredEmailTransport> | undefined,
): EmailTransportSetting {
  if (configured) return configured;
  if (nodeEnv === "test") return "log";
  return "smtp";
}

function captureIsActive(
  source: NodeJS.ProcessEnv,
  capturePath: string | undefined,
): boolean {
  if (!capturePath) return false;
  if (source.NODE_ENV === "production" && source.CI !== "true") return false;
  return true;
}

function isSmtpSecure(
  value: z.infer<typeof smtpSecureValue> | undefined,
): boolean {
  return value === "true" || value === "1";
}

function emailTransportIssues(input: {
  transport: EmailTransportSetting;
  captureActive: boolean;
  productionBuild: boolean;
  resendApiKey: string | undefined;
  smtpHost: string | undefined;
  smtpPort: string | undefined;
}): string[] {
  if (input.productionBuild || input.captureActive) return [];
  const issues: string[] = [];
  if (input.transport === "resend" && !input.resendApiKey) {
    issues.push(
      "RESEND_API_KEY: RESEND_API_KEY is required when EMAIL_TRANSPORT=resend",
    );
  }
  if (input.transport === "smtp") {
    if (!input.smtpHost) {
      issues.push("SMTP_HOST: SMTP_HOST is required when EMAIL_TRANSPORT=smtp");
    }
    if (!input.smtpPort) {
      issues.push("SMTP_PORT: SMTP_PORT is required when EMAIL_TRANSPORT=smtp");
    }
  }
  return issues;
}

export function isEmailFrom(value: string): boolean {
  const trimmed = value.trim();
  const named = trimmed.match(/^([^<>]+)<([^<>\s]+)>$/);
  const name = named?.[1];
  const address = named?.[2] ?? trimmed;
  if (!emailAddress.safeParse(address).success) return false;
  if (name !== undefined && name.trim().length === 0) return false;
  return true;
}

export const serverEnvSchema = z
  .object({
    DATABASE_URL: postgresUrl,
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    RESEND_API_KEY: z.string().min(1).optional(),
    EMAIL_FROM: z
      .string()
      .refine(isEmailFrom, "EMAIL_FROM must be an email or Name <email>")
      .optional(),
    EMAIL_CAPTURE_PATH: z.string().min(1).optional(),
    EMAIL_TRANSPORT: configuredEmailTransport.optional(),
    SMTP_HOST: z.string().min(1).optional(),
    SMTP_PORT: smtpPort.optional(),
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASS: z.string().min(1).optional(),
    SMTP_SECURE: smtpSecureValue.optional(),
    CONFIRM_EMAIL_SECRET: confirmEmailSecret,
    CRON_SECRET: z
      .string()
      .min(16, "CRON_SECRET must be at least 16 characters")
      .optional(),
    NEXT_PUBLIC_DATABASE_URL: z.string().optional(),
    NEXT_PUBLIC_RESEND_API_KEY: z.string().optional(),
    NEXT_PUBLIC_EMAIL_FROM: z.string().optional(),
    NEXT_PUBLIC_CONFIRM_EMAIL_SECRET: z.string().optional(),
    CONSENT_PSEUDONYM_KEY: z.string().trim().min(32),
    NEXT_PUBLIC_CONSENT_PSEUDONYM_KEY: z.string().optional(),
    NEXT_PUBLIC_SMTP_HOST: z.string().optional(),
    NEXT_PUBLIC_SMTP_USER: z.string().optional(),
    NEXT_PUBLIC_SMTP_PASS: z.string().optional(),
    NEXT_PUBLIC_CRON_SECRET: z.string().optional(),
    APP_URL: z.string().optional(),
    NEXT_PUBLIC_APP_URL: z.string().optional(),
  })
  .superRefine((value, context) => {
    const publicSecrets = [
      ["NEXT_PUBLIC_DATABASE_URL", value.NEXT_PUBLIC_DATABASE_URL],
      ["NEXT_PUBLIC_RESEND_API_KEY", value.NEXT_PUBLIC_RESEND_API_KEY],
      ["NEXT_PUBLIC_EMAIL_FROM", value.NEXT_PUBLIC_EMAIL_FROM],
      [
        "NEXT_PUBLIC_CONFIRM_EMAIL_SECRET",
        value.NEXT_PUBLIC_CONFIRM_EMAIL_SECRET,
      ],
      [
        "NEXT_PUBLIC_CONSENT_PSEUDONYM_KEY",
        value.NEXT_PUBLIC_CONSENT_PSEUDONYM_KEY,
      ],
      ["NEXT_PUBLIC_SMTP_HOST", value.NEXT_PUBLIC_SMTP_HOST],
      ["NEXT_PUBLIC_SMTP_USER", value.NEXT_PUBLIC_SMTP_USER],
      ["NEXT_PUBLIC_SMTP_PASS", value.NEXT_PUBLIC_SMTP_PASS],
      ["NEXT_PUBLIC_CRON_SECRET", value.NEXT_PUBLIC_CRON_SECRET],
      ["NEXT_PUBLIC_APP_URL", value.NEXT_PUBLIC_APP_URL],
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
  CONFIRM_EMAIL_SECRET: string;
  CONSENT_PSEUDONYM_KEY: string;
  EMAIL_TRANSPORT: EmailTransportSetting;
  SMTP_HOST: string | null;
  SMTP_PORT: number | null;
  SMTP_USER: string | null;
  SMTP_PASS: string | null;
  SMTP_SECURE: boolean;
  CRON_SECRET: string | null;
  APP_URL: string;
};

/** Non-connecting stand-in so `next build` can evaluate server modules. */
export const BUILD_DATABASE_URL =
  "postgresql://build:build@127.0.0.1:5432/build";

/** Non-secret stand-in so `next build` can evaluate server modules. */
export const BUILD_CONSENT_PSEUDONYM_KEY =
  "build-consent-pseudonym-key-not-secret";

/** Local origin used when APP_URL is unset outside production. */
export const DEFAULT_DEV_APP_URL = "http://127.0.0.1:3000";

export const BUILD_APP_URL = DEFAULT_DEV_APP_URL;

export function isProductionBuild(source: NodeJS.ProcessEnv): boolean {
  return source.NEXT_PHASE === "phase-production-build";
}

export function readServerEnv(
  source: NodeJS.ProcessEnv = process.env,
): ServerEnv {
  const databaseUrl =
    source.DATABASE_URL ??
    (isProductionBuild(source) ? BUILD_DATABASE_URL : undefined);
  const confirmSecret =
    source.CONFIRM_EMAIL_SECRET ||
    (isProductionBuild(source) ? BUILD_CONFIRM_EMAIL_SECRET : undefined);
  const consentPseudonymKey =
    source.CONSENT_PSEUDONYM_KEY ||
    (isProductionBuild(source) ? BUILD_CONSENT_PSEUDONYM_KEY : undefined);

  const parsed = serverEnvSchema.safeParse({
    DATABASE_URL: databaseUrl,
    NODE_ENV: source.NODE_ENV,
    RESEND_API_KEY: source.RESEND_API_KEY || undefined,
    EMAIL_FROM: source.EMAIL_FROM || undefined,
    EMAIL_CAPTURE_PATH: source.EMAIL_CAPTURE_PATH || undefined,
    EMAIL_TRANSPORT: source.EMAIL_TRANSPORT || undefined,
    SMTP_HOST: source.SMTP_HOST || undefined,
    SMTP_PORT: source.SMTP_PORT || undefined,
    SMTP_USER: source.SMTP_USER || undefined,
    SMTP_PASS: source.SMTP_PASS || undefined,
    SMTP_SECURE: source.SMTP_SECURE || undefined,
    CONFIRM_EMAIL_SECRET: confirmSecret,
    CRON_SECRET: source.CRON_SECRET || undefined,
    NEXT_PUBLIC_DATABASE_URL: source.NEXT_PUBLIC_DATABASE_URL,
    NEXT_PUBLIC_RESEND_API_KEY: source.NEXT_PUBLIC_RESEND_API_KEY,
    NEXT_PUBLIC_EMAIL_FROM: source.NEXT_PUBLIC_EMAIL_FROM,
    NEXT_PUBLIC_CONFIRM_EMAIL_SECRET: source.NEXT_PUBLIC_CONFIRM_EMAIL_SECRET,
    NEXT_PUBLIC_CONSENT_PSEUDONYM_KEY: source.NEXT_PUBLIC_CONSENT_PSEUDONYM_KEY,
    CONSENT_PSEUDONYM_KEY: consentPseudonymKey,
    NEXT_PUBLIC_SMTP_HOST: source.NEXT_PUBLIC_SMTP_HOST,
    NEXT_PUBLIC_SMTP_USER: source.NEXT_PUBLIC_SMTP_USER,
    NEXT_PUBLIC_SMTP_PASS: source.NEXT_PUBLIC_SMTP_PASS,
    NEXT_PUBLIC_CRON_SECRET: source.NEXT_PUBLIC_CRON_SECRET,
    APP_URL: source.APP_URL || undefined,
    NEXT_PUBLIC_APP_URL: source.NEXT_PUBLIC_APP_URL,
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${details}`);
  }

  const transport = resolveEmailTransport(
    parsed.data.NODE_ENV,
    parsed.data.EMAIL_TRANSPORT,
  );
  const captureActive = captureIsActive(source, parsed.data.EMAIL_CAPTURE_PATH);
  const appUrl = resolveAppUrl(
    parsed.data.NODE_ENV,
    parsed.data.APP_URL,
    isProductionBuild(source),
  );
  if (typeof appUrl !== "string") {
    throw new Error(`Invalid environment variables:\n${appUrl.error}`);
  }
  const transportIssues = emailTransportIssues({
    transport,
    captureActive,
    productionBuild: isProductionBuild(source),
    resendApiKey: parsed.data.RESEND_API_KEY,
    smtpHost: parsed.data.SMTP_HOST,
    smtpPort: parsed.data.SMTP_PORT,
  });
  if (transportIssues.length > 0) {
    throw new Error(
      `Invalid environment variables:\n${transportIssues.join("\n")}`,
    );
  }

  return {
    DATABASE_URL: parsed.data.DATABASE_URL,
    CONSENT_PSEUDONYM_KEY: parsed.data.CONSENT_PSEUDONYM_KEY,
    NODE_ENV: parsed.data.NODE_ENV,
    RESEND_API_KEY: parsed.data.RESEND_API_KEY ?? null,
    EMAIL_FROM: parsed.data.EMAIL_FROM ?? DEFAULT_EMAIL_FROM,
    EMAIL_CAPTURE_PATH: captureActive
      ? (parsed.data.EMAIL_CAPTURE_PATH ?? null)
      : null,
    CONFIRM_EMAIL_SECRET: parsed.data.CONFIRM_EMAIL_SECRET,
    EMAIL_TRANSPORT: transport,
    SMTP_HOST: parsed.data.SMTP_HOST ?? null,
    SMTP_PORT: parsed.data.SMTP_PORT ? Number(parsed.data.SMTP_PORT) : null,
    SMTP_USER: parsed.data.SMTP_USER ?? null,
    SMTP_PASS: parsed.data.SMTP_PASS ?? null,
    SMTP_SECURE: isSmtpSecure(parsed.data.SMTP_SECURE),
    CRON_SECRET: parsed.data.CRON_SECRET ?? null,
    APP_URL: appUrl,
  };
}

function resolveAppUrl(
  nodeEnv: "development" | "test" | "production",
  configured: string | undefined,
  productionBuild: boolean,
): string | { error: string } {
  if (configured) {
    const origin = accessControlAllowOrigin(configured.trim());
    if (!origin) return { error: "APP_URL: APP_URL must be an http(s) URL" };
    return origin;
  }
  if (productionBuild) return BUILD_APP_URL;
  if (nodeEnv === "production") {
    return { error: "APP_URL: APP_URL is required in production" };
  }
  return DEFAULT_DEV_APP_URL;
}

let cached: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  cached ??= readServerEnv();
  return cached;
}
