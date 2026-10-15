import "server-only";

import { z } from "zod";

import { databaseTlsErrors } from "@/db/database-tls.mjs";
import { readDbPoolConfig } from "@/db/driver";

import { accessControlAllowOrigin } from "./app-url";

const postgresUrl = z
  .string()
  .min(1)
  .refine(
    (value) =>
      value.startsWith("postgres://") || value.startsWith("postgresql://"),
    "DATABASE_URL must be a postgres connection string",
  );

/** Display name plus the app mailbox. Used when EMAIL_FROM is unset. */
export const DEFAULT_EMAIL_FROM = "Gym Easy <noreply@gaffer.pt>";

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
  productionBuild: boolean,
): EmailTransportSetting | { error: string } {
  if (productionBuild) return configured ?? "log";
  if (nodeEnv === "production") {
    if (configured === "resend") return "resend";
    if (configured === "smtp" || configured === "log") {
      return {
        error: "EMAIL_TRANSPORT: smtp and log are not allowed in production",
      };
    }
    return {
      error:
        "EMAIL_TRANSPORT: EMAIL_TRANSPORT=resend is required in production",
    };
  }
  if (configured) return configured;
  if (nodeEnv === "test") return "log";
  return "smtp";
}

export function isLocalSmtpHost(host: string): boolean {
  const name = host.trim().toLowerCase().replace(/\.$/u, "");
  return (
    name === "mailpit" ||
    name === "localhost" ||
    name === "127.0.0.1" ||
    name === "::1"
  );
}

function isProductionAppUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    return new URL(value).hostname === "app.gaffer.pt";
  } catch {
    return false;
  }
}

function captureIsActive(
  source: NodeJS.ProcessEnv,
  capturePath: string | undefined,
): boolean {
  if (!capturePath) return false;
  if (isProductionAppUrl(source.APP_URL)) return false;
  if (source.NODE_ENV === "production" && source.CI !== "true") return false;
  return true;
}

function isSmtpSecure(
  value: z.infer<typeof smtpSecureValue> | undefined,
): boolean {
  return value === "true" || value === "1";
}

function emailTransportIssues(input: {
  nodeEnv: "development" | "test" | "production";
  transport: EmailTransportSetting;
  captureActive: boolean;
  productionBuild: boolean;
  resendApiKey: string | undefined;
  smtpHost: string | undefined;
  smtpPort: string | undefined;
  smtpUser: string | undefined;
  smtpPass: string | undefined;
}): string[] {
  if (input.productionBuild) return [];
  const issues: string[] = [];
  if (input.nodeEnv === "production") {
    if (!input.resendApiKey) {
      issues.push(
        "RESEND_API_KEY: RESEND_API_KEY is required when EMAIL_TRANSPORT=resend",
      );
    }
    return issues;
  }
  if (input.captureActive) return [];
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
    if (input.smtpHost && !isLocalSmtpHost(input.smtpHost)) {
      if (!input.smtpUser) {
        issues.push(
          "SMTP_USER: SMTP_USER is required when SMTP_HOST is not local",
        );
      }
      if (!input.smtpPass) {
        issues.push(
          "SMTP_PASS: SMTP_PASS is required when SMTP_HOST is not local",
        );
      }
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
      .min(32, "CRON_SECRET must be at least 32 characters")
      .optional(),
    TRUST_PROXY: z.enum(["true", "false", "1", "0"]).optional(),
    TRUSTED_PROXY_HOPS: z.string().optional(),
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
    DB_POOL_MAX: z.string().optional(),
    DB_IDLE_TIMEOUT: z.string().optional(),
    DB_CONNECT_TIMEOUT: z.string().optional(),
    DB_STATEMENT_TIMEOUT: z.string().optional(),
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
  TRUST_PROXY: boolean;
  TRUSTED_PROXY_HOPS: number;
  APP_URL: string;
  DB_POOL_MAX: number;
  DB_IDLE_TIMEOUT: number;
  DB_CONNECT_TIMEOUT: number;
  DB_STATEMENT_TIMEOUT: number;
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
    TRUST_PROXY: source.TRUST_PROXY || undefined,
    TRUSTED_PROXY_HOPS: source.TRUSTED_PROXY_HOPS || undefined,
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
    DB_POOL_MAX: source.DB_POOL_MAX || undefined,
    DB_IDLE_TIMEOUT: source.DB_IDLE_TIMEOUT || undefined,
    DB_CONNECT_TIMEOUT: source.DB_CONNECT_TIMEOUT || undefined,
    DB_STATEMENT_TIMEOUT: source.DB_STATEMENT_TIMEOUT || undefined,
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
    isProductionBuild(source),
  );
  if (typeof transport !== "string") {
    throw new Error(`Invalid environment variables:\n${transport.error}`);
  }
  if (
    parsed.data.NODE_ENV === "production" &&
    !isProductionBuild(source) &&
    !parsed.data.CRON_SECRET
  ) {
    throw new Error(
      "Invalid environment variables:\nCRON_SECRET: CRON_SECRET is required in production",
    );
  }
  const trustProxy =
    parsed.data.TRUST_PROXY === "true" || parsed.data.TRUST_PROXY === "1";
  const trustedHops = readTrustedProxyHops(parsed.data.TRUSTED_PROXY_HOPS);
  if (typeof trustedHops !== "number") {
    throw new Error(`Invalid environment variables:\n${trustedHops}`);
  }
  const captureActive = captureIsActive(source, parsed.data.EMAIL_CAPTURE_PATH);
  const appUrl = resolveAppUrl(
    parsed.data.NODE_ENV,
    parsed.data.APP_URL,
    isProductionBuild(source),
  );
  if (typeof appUrl !== "string") {
    throw new Error(`Invalid environment variables:\n${appUrl.error}`);
  }
  const poolConfig = readDbPoolConfig({
    DB_POOL_MAX: parsed.data.DB_POOL_MAX,
    DB_IDLE_TIMEOUT: parsed.data.DB_IDLE_TIMEOUT,
    DB_CONNECT_TIMEOUT: parsed.data.DB_CONNECT_TIMEOUT,
    DB_STATEMENT_TIMEOUT: parsed.data.DB_STATEMENT_TIMEOUT,
  });
  if (typeof poolConfig === "string") {
    throw new Error(`Invalid environment variables:\n${poolConfig}`);
  }
  const transportIssues = emailTransportIssues({
    nodeEnv: parsed.data.NODE_ENV,
    transport,
    captureActive,
    productionBuild: isProductionBuild(source),
    resendApiKey: parsed.data.RESEND_API_KEY,
    smtpHost: parsed.data.SMTP_HOST,
    smtpPort: parsed.data.SMTP_PORT,
    smtpUser: parsed.data.SMTP_USER,
    smtpPass: parsed.data.SMTP_PASS,
  });
  if (transportIssues.length > 0) {
    throw new Error(
      `Invalid environment variables:\n${transportIssues.join("\n")}`,
    );
  }
  const tlsErrors = databaseTlsErrors({
    nodeEnv: parsed.data.NODE_ENV,
    tlsMode: source.DB_TLS_MODE,
    productionBuild: isProductionBuild(source),
    urls: [
      { label: "DATABASE_URL", url: parsed.data.DATABASE_URL },
      { label: "DATABASE_URL_MIGRATOR", url: source.DATABASE_URL_MIGRATOR },
    ],
  });
  if (tlsErrors.length > 0) {
    throw new Error(`Invalid environment variables:\n${tlsErrors.join("\n")}`);
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
    TRUST_PROXY: trustProxy,
    TRUSTED_PROXY_HOPS: trustedHops,
    APP_URL: appUrl,
    DB_POOL_MAX: poolConfig.poolMax,
    DB_IDLE_TIMEOUT: poolConfig.idleTimeoutSeconds,
    DB_CONNECT_TIMEOUT: poolConfig.connectTimeoutSeconds,
    DB_STATEMENT_TIMEOUT: poolConfig.statementTimeoutMs,
  };
}

function readTrustedProxyHops(value: string | undefined): number | string {
  if (value === undefined || value.trim() === "") return 1;
  if (!/^[0-9]+$/u.test(value)) {
    return "TRUSTED_PROXY_HOPS: TRUSTED_PROXY_HOPS must be an integer from 1 to 8";
  }
  const parsed = Number(value);
  if (parsed < 1 || parsed > 8) {
    return "TRUSTED_PROXY_HOPS: TRUSTED_PROXY_HOPS must be an integer from 1 to 8";
  }
  return parsed;
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
