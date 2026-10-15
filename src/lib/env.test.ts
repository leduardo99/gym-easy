import { describe, expect, it } from "vitest";

import {
  BUILD_APP_URL,
  BUILD_CONFIRM_EMAIL_SECRET,
  BUILD_CONSENT_PSEUDONYM_KEY,
  BUILD_DATABASE_URL,
  DEFAULT_DEV_APP_URL,
  DEFAULT_EMAIL_FROM,
  readServerEnv,
} from "./env";

const validUrl = "postgresql://user:password@localhost:5432/gym_easy";
const productionUrl =
  "postgresql://user:password@db.internal:5432/gym_easy?sslmode=verify-full";
const confirmSecret = "confirm-email-secret-for-unit-tests-00";
const validConsentKey = "consent-pseudonym-test-key-32b!!";

describe("readServerEnv", () => {
  it("accepts a postgres connection string and defaults the email sender", () => {
    expect(DEFAULT_EMAIL_FROM).toBe("Gym Easy <noreply@gaffer.pt>");
    expect(
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "test",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
      }),
    ).toEqual({
      DATABASE_URL: validUrl,
      NODE_ENV: "test",
      RESEND_API_KEY: null,
      EMAIL_FROM: DEFAULT_EMAIL_FROM,
      EMAIL_CAPTURE_PATH: null,
      CONFIRM_EMAIL_SECRET: confirmSecret,
      CONSENT_PSEUDONYM_KEY: validConsentKey,
      EMAIL_TRANSPORT: "log",
      SMTP_HOST: null,
      SMTP_PORT: null,
      SMTP_USER: null,
      SMTP_PASS: null,
      SMTP_SECURE: false,
      CRON_SECRET: null,
      TRUST_PROXY: false,
      TRUSTED_PROXY_HOPS: 1,
      APP_URL: DEFAULT_DEV_APP_URL,
      DB_POOL_MAX: 5,
      DB_IDLE_TIMEOUT: 20,
      DB_CONNECT_TIMEOUT: 10,
      DB_STATEMENT_TIMEOUT: 15_000,
      OPENROUTER_API_KEY: null,
      COACH_MODELS: [],
      PLAN_MODELS: [],
      OPENROUTER_PRIVACY_MODE: "zdr_only",
    });
  });

  it("keeps Resend settings server-only and optional", () => {
    expect(
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "test",
        RESEND_API_KEY: "test-resend-key",
        EMAIL_FROM: "Gym Easy <treino@example.com>",
        EMAIL_CAPTURE_PATH: ".data/emails.jsonl",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
      }),
    ).toMatchObject({
      RESEND_API_KEY: "test-resend-key",
      EMAIL_FROM: "Gym Easy <treino@example.com>",
      EMAIL_CAPTURE_PATH: ".data/emails.jsonl",
      CONFIRM_EMAIL_SECRET: confirmSecret,
      CONSENT_PSEUDONYM_KEY: validConsentKey,
      EMAIL_TRANSPORT: "log",
    });
  });

  it("accepts a bare email sender and rejects a name without an address", () => {
    expect(
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "test",
        EMAIL_FROM: "treino@example.com",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
      }).EMAIL_FROM,
    ).toBe("treino@example.com");
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "test",
        EMAIL_FROM: "Gym Easy",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
      }),
    ).toThrow(/EMAIL_FROM/);
  });

  it("ignores the email capture path on the Coolify runtime", () => {
    expect(
      readServerEnv({
        DATABASE_URL: productionUrl,
        NODE_ENV: "production",
        APP_URL: "https://app.gaffer.pt",
        EMAIL_CAPTURE_PATH: ".data/emails.jsonl",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
        EMAIL_TRANSPORT: "resend",
        RESEND_API_KEY: "test-resend-key",
        CRON_SECRET: "cron-secret-value-32-characters-ok",
      }).EMAIL_CAPTURE_PATH,
    ).toBeNull();
  });

  it("defaults development to smtp and requires host and port", () => {
    expect(
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "development",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
        SMTP_HOST: "mailpit",
        SMTP_PORT: "1025",
      }),
    ).toMatchObject({
      EMAIL_TRANSPORT: "smtp",
      SMTP_HOST: "mailpit",
      SMTP_PORT: 1025,
      SMTP_USER: null,
      SMTP_PASS: null,
      SMTP_SECURE: false,
    });
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "development",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
        SMTP_HOST: "",
        SMTP_PORT: "1025",
      }),
    ).toThrow(/SMTP_HOST/);
  });

  it("requires resend in production and rejects smtp and log", () => {
    expect(
      readServerEnv({
        DATABASE_URL: productionUrl,
        NODE_ENV: "production",
        APP_URL: "https://app.gaffer.pt",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
        EMAIL_TRANSPORT: "resend",
        RESEND_API_KEY: "test-resend-key",
        CRON_SECRET: "cron-secret-value-32-characters-ok",
      }),
    ).toMatchObject({
      EMAIL_TRANSPORT: "resend",
      RESEND_API_KEY: "test-resend-key",
    });
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "production",
        APP_URL: "https://app.gaffer.pt",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
        CRON_SECRET: "cron-secret-value-32-characters-ok",
      }),
    ).toThrow(/EMAIL_TRANSPORT=resend is required in production/);
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "production",
        APP_URL: "https://app.gaffer.pt",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
        EMAIL_TRANSPORT: "smtp",
        SMTP_HOST: "mailpit",
        SMTP_PORT: "1025",
        CRON_SECRET: "cron-secret-value-32-characters-ok",
      }),
    ).toThrow(/not allowed in production/);
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "production",
        APP_URL: "https://app.gaffer.pt",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
        EMAIL_TRANSPORT: "log",
        CRON_SECRET: "cron-secret-value-32-characters-ok",
      }),
    ).toThrow(/not allowed in production/);
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "production",
        APP_URL: "https://app.gaffer.pt",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
        EMAIL_TRANSPORT: "resend",
        CRON_SECRET: "cron-secret-value-32-characters-ok",
      }),
    ).toThrow(/RESEND_API_KEY/);
  });

  it("requires a resend key when the transport is explicitly resend", () => {
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "test",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
        EMAIL_TRANSPORT: "resend",
      }),
    ).toThrow(/RESEND_API_KEY/);
  });

  it("requires credentials for a remote smtp host and allows Mailpit without them", () => {
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "development",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
        SMTP_HOST: "smtp.example.com",
        SMTP_PORT: "587",
      }),
    ).toThrow(/SMTP_USER/);
    expect(
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "development",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
        SMTP_HOST: "smtp.example.com",
        SMTP_PORT: "587",
        SMTP_USER: "mailer",
        SMTP_PASS: "smtp-pass",
        SMTP_SECURE: "true",
      }),
    ).toMatchObject({
      SMTP_HOST: "smtp.example.com",
      SMTP_SECURE: true,
    });
  });

  it("rejects an unknown transport and a bad port", () => {
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "test",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
        EMAIL_TRANSPORT: "sendmail",
      }),
    ).toThrow(/EMAIL_TRANSPORT/);
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "development",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
        SMTP_HOST: "mailpit",
        SMTP_PORT: "70000",
      }),
    ).toThrow(/SMTP_PORT/);
  });

  it("rejects smtp secrets exposed with the public prefix", () => {
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "test",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
        NEXT_PUBLIC_SMTP_PASS: "smtp-pass",
      }),
    ).toThrow(/NEXT_PUBLIC_/);
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "test",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
        NEXT_PUBLIC_SMTP_USER: "mailer",
      }),
    ).toThrow(/NEXT_PUBLIC_/);
  });

  it("skips transport credentials while the capture sink is active", () => {
    expect(
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "development",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
        EMAIL_CAPTURE_PATH: ".data/emails.jsonl",
      }),
    ).toMatchObject({
      EMAIL_CAPTURE_PATH: ".data/emails.jsonl",
      EMAIL_TRANSPORT: "smtp",
      SMTP_HOST: null,
    });
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "production",
        APP_URL: "https://app.gaffer.pt",
        CI: "true",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
        EMAIL_CAPTURE_PATH: ".data/e2e-emails.jsonl",
      }),
    ).toThrow(/EMAIL_TRANSPORT=resend is required in production/);
    expect(
      readServerEnv({
        DATABASE_URL: productionUrl,
        NODE_ENV: "production",
        APP_URL: "https://app.gaffer.pt",
        CI: "true",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
        EMAIL_CAPTURE_PATH: ".data/e2e-emails.jsonl",
        EMAIL_TRANSPORT: "resend",
        RESEND_API_KEY: "test-resend-key",
        CRON_SECRET: "cron-secret-value-32-characters-ok",
      }),
    ).toMatchObject({
      EMAIL_CAPTURE_PATH: null,
      EMAIL_TRANSPORT: "resend",
    });
    expect(
      readServerEnv({
        DATABASE_URL: productionUrl,
        NODE_ENV: "production",
        APP_URL: "https://127.0.0.1:3000",
        CI: "true",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
        EMAIL_CAPTURE_PATH: ".data/e2e-emails.jsonl",
        EMAIL_TRANSPORT: "resend",
        RESEND_API_KEY: "test-resend-key",
        CRON_SECRET: "cron-secret-value-32-characters-ok",
      }).EMAIL_CAPTURE_PATH,
    ).toBe(".data/e2e-emails.jsonl");
  });

  it("does not require email credentials during the next production build", () => {
    expect(
      readServerEnv({
        NODE_ENV: "production",
        NEXT_PHASE: "phase-production-build",
      }),
    ).toMatchObject({
      EMAIL_TRANSPORT: "log",
      RESEND_API_KEY: null,
      SMTP_HOST: null,
      SMTP_PORT: null,
    });
  });

  it("rejects a missing database url outside of the production build", () => {
    expect(() => readServerEnv({ NODE_ENV: "development" })).toThrow(
      /DATABASE_URL/,
    );
  });

  it("rejects a non-postgres url", () => {
    expect(() =>
      readServerEnv({
        DATABASE_URL: "mysql://user:password@localhost:3306/gym_easy",
        NODE_ENV: "test",
      }),
    ).toThrow(/postgres/);
  });

  it("rejects a database url exposed with the public prefix", () => {
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NEXT_PUBLIC_DATABASE_URL: validUrl,
        NODE_ENV: "test",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
      }),
    ).toThrow(/NEXT_PUBLIC_/);
  });

  it("requires a long confirm-email secret and keeps it server-only", () => {
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "test",
        CONFIRM_EMAIL_SECRET: "too-short",
        CONSENT_PSEUDONYM_KEY: validConsentKey,
      }),
    ).toThrow(/CONFIRM_EMAIL_SECRET/);
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "test",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
        NEXT_PUBLIC_CONFIRM_EMAIL_SECRET: confirmSecret,
      }),
    ).toThrow(/NEXT_PUBLIC_/);
  });

  it("rejects a resend key exposed with the public prefix", () => {
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NEXT_PUBLIC_RESEND_API_KEY: "test-resend-key",
        NODE_ENV: "test",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
      }),
    ).toThrow(/NEXT_PUBLIC_/);
  });

  it("keeps the cron secret server-only and at least 32 characters", () => {
    expect(
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "test",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
        CRON_SECRET: "cron-secret-value-32-characters-ok",
      }).CRON_SECRET,
    ).toBe("cron-secret-value-32-characters-ok");
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "test",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
        CRON_SECRET: "short",
      }),
    ).toThrow(/CRON_SECRET/);
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "test",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
        NEXT_PUBLIC_CRON_SECRET: "cron-secret-value-32-characters-ok",
      }),
    ).toThrow(/NEXT_PUBLIC_/);
  });

  it("uses a non-connecting placeholder while next build has no database url", () => {
    expect(
      readServerEnv({
        NODE_ENV: "production",
        NEXT_PHASE: "phase-production-build",
      }),
    ).toMatchObject({
      DATABASE_URL: BUILD_DATABASE_URL,
      CONFIRM_EMAIL_SECRET: BUILD_CONFIRM_EMAIL_SECRET,
      CONSENT_PSEUDONYM_KEY: BUILD_CONSENT_PSEUDONYM_KEY,
    });
  });

  it("does not treat the npm build lifecycle as a next production build", () => {
    expect(() =>
      readServerEnv({
        NODE_ENV: "production",
        APP_URL: "https://app.gaffer.pt",
        npm_lifecycle_event: "build",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it("requires the consent pseudonym key and rejects the public prefix", () => {
    expect(
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "test",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
      }).CONSENT_PSEUDONYM_KEY,
    ).toBe(validConsentKey);
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "test",
        CONFIRM_EMAIL_SECRET: confirmSecret,
      }),
    ).toThrow(/CONSENT_PSEUDONYM_KEY/);
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "test",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: "too-short",
      }),
    ).toThrow(/CONSENT_PSEUDONYM_KEY/);
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "test",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
        NEXT_PUBLIC_CONSENT_PSEUDONYM_KEY: validConsentKey,
      }),
    ).toThrow(/NEXT_PUBLIC_/);
  });

  it("keeps the OpenRouter key server-only and accepts only :free models", () => {
    expect(
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "test",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
        OPENROUTER_API_KEY: "or-test-key",
        COACH_MODELS: "alpha:free, beta:free",
        PLAN_MODELS: "gamma:free",
      }),
    ).toMatchObject({
      OPENROUTER_API_KEY: "or-test-key",
      COACH_MODELS: ["alpha:free", "beta:free"],
      PLAN_MODELS: ["gamma:free"],
    });
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "test",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
        COACH_MODELS: "paid-model",
      }),
    ).toThrow(/COACH_MODELS/);
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "test",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
        NEXT_PUBLIC_OPENROUTER_API_KEY: "or-test-key",
      }),
    ).toThrow(/NEXT_PUBLIC_/);
  });

  it("defaults OpenRouter privacy mode to zdr_only and accepts zdr_then_fallback", () => {
    expect(
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "test",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
      }).OPENROUTER_PRIVACY_MODE,
    ).toBe("zdr_only");
    expect(
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "test",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
        OPENROUTER_PRIVACY_MODE: "zdr_then_fallback",
      }).OPENROUTER_PRIVACY_MODE,
    ).toBe("zdr_then_fallback");
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "test",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
        OPENROUTER_PRIVACY_MODE: "open_training",
      }),
    ).toThrow();
  });

  it("uses a non-secret consent key placeholder during next build", () => {
    expect(
      readServerEnv({
        NODE_ENV: "production",
        NEXT_PHASE: "phase-production-build",
      }).CONSENT_PSEUDONYM_KEY,
    ).toBe(BUILD_CONSENT_PSEUDONYM_KEY);
  });

  it("requires APP_URL in production and uses it as the email origin", () => {
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "production",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
        EMAIL_TRANSPORT: "resend",
        RESEND_API_KEY: "test-resend-key",
        CRON_SECRET: "cron-secret-value-32-characters-ok",
      }),
    ).toThrow(/APP_URL is required in production/);
    expect(() =>
      readServerEnv({
        DATABASE_URL: productionUrl,
        NODE_ENV: "production",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
        EMAIL_TRANSPORT: "resend",
        RESEND_API_KEY: "test-resend-key",
        CRON_SECRET: "cron-secret-value-32-characters-ok",
        APP_URL: "https://app.gaffer.pt/cadastro",
      }),
    ).toThrow(/APP_URL must not include a path/);
    expect(
      readServerEnv({
        DATABASE_URL: productionUrl,
        NODE_ENV: "production",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
        EMAIL_TRANSPORT: "resend",
        RESEND_API_KEY: "test-resend-key",
        CRON_SECRET: "cron-secret-value-32-characters-ok",
        APP_URL: "https://app.gaffer.pt",
      }).APP_URL,
    ).toBe("https://app.gaffer.pt");
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "test",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
        APP_URL: "not a url",
      }),
    ).toThrow(/APP_URL must be an http/);
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "test",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
        NEXT_PUBLIC_APP_URL: "https://app.gaffer.pt",
      }),
    ).toThrow(/NEXT_PUBLIC_/);
  });

  it("defaults the database pool and rejects a size outside 5 to 10", () => {
    expect(
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "test",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
        DB_POOL_MAX: "8",
        DB_IDLE_TIMEOUT: "30",
        DB_CONNECT_TIMEOUT: "5",
        DB_STATEMENT_TIMEOUT: "20000",
      }),
    ).toMatchObject({
      DB_POOL_MAX: 8,
      DB_IDLE_TIMEOUT: 30,
      DB_CONNECT_TIMEOUT: 5,
      DB_STATEMENT_TIMEOUT: 20_000,
    });
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "test",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
        DB_POOL_MAX: "4",
      }),
    ).toThrow(/DB_POOL_MAX/);
  });

  it("requires verify-full in production and allows the neon and local flags", () => {
    const production = {
      NODE_ENV: "production" as const,
      APP_URL: "https://app.gaffer.pt",
      CONFIRM_EMAIL_SECRET: confirmSecret,
      CONSENT_PSEUDONYM_KEY: validConsentKey,
      EMAIL_TRANSPORT: "resend" as const,
      RESEND_API_KEY: "test-resend-key",
      CRON_SECRET: "cron-secret-value-32-characters-ok",
    };
    expect(() =>
      readServerEnv({
        ...production,
        DATABASE_URL: validUrl,
      }),
    ).toThrow(/DATABASE_URL: sslmode=verify-full is required/);
    expect(() =>
      readServerEnv({
        ...production,
        DATABASE_URL: productionUrl,
        DATABASE_URL_MIGRATOR: validUrl,
      }),
    ).toThrow(/DATABASE_URL_MIGRATOR: sslmode=verify-full is required/);
    expect(
      readServerEnv({
        ...production,
        DATABASE_URL: productionUrl,
        DATABASE_URL_MIGRATOR: `${productionUrl}&application_name=migrator`,
      }).DATABASE_URL,
    ).toBe(productionUrl);
    const neonUrl =
      "postgresql://user:password@ep-example.eu-central-1.aws.neon.tech/gym?sslmode=verify-full";
    expect(
      readServerEnv({
        ...production,
        DB_TLS_MODE: "neon",
        DATABASE_URL: neonUrl,
        DATABASE_URL_MIGRATOR: neonUrl,
      }).DATABASE_URL,
    ).toBe(neonUrl);
    expect(() =>
      readServerEnv({
        ...production,
        DB_TLS_MODE: "neon",
        DATABASE_URL:
          "postgresql://user:password@ep-example.eu-central-1.aws.neon.tech/gym?sslmode=require",
      }),
    ).toThrow(/DB_TLS_MODE=neon requires sslmode=verify-full/);
    expect(() =>
      readServerEnv({
        ...production,
        DB_TLS_MODE: "neon",
        DATABASE_URL: validUrl,
      }),
    ).toThrow(/DB_TLS_MODE=neon only allows \*\.neon\.tech/);
    expect(() =>
      readServerEnv({
        ...production,
        DB_TLS_MODE: "neon",
        DATABASE_URL: neonUrl,
        DATABASE_URL_MIGRATOR: productionUrl,
      }),
    ).toThrow(
      /DATABASE_URL_MIGRATOR: DB_TLS_MODE=neon only allows \*\.neon\.tech/,
    );
    expect(
      readServerEnv({
        ...production,
        DB_TLS_MODE: "insecure",
        DATABASE_URL: validUrl,
      }).DATABASE_URL,
    ).toBe(validUrl);
    expect(() =>
      readServerEnv({
        ...production,
        DB_TLS_MODE: "insecure",
        DATABASE_URL: "postgresql://user:password@db.internal/gym",
      }),
    ).toThrow(/only allowed for localhost/);
  });

  it("rejects APP_URL with path, query or hash", () => {
    for (const appUrl of [
      "https://app.gaffer.pt/path",
      "https://app.gaffer.pt?x=1",
      "https://app.gaffer.pt#frag",
    ]) {
      expect(() =>
        readServerEnv({
          DATABASE_URL: validUrl,
          NODE_ENV: "test",
          CONFIRM_EMAIL_SECRET: confirmSecret,
          CONSENT_PSEUDONYM_KEY: validConsentKey,
          APP_URL: appUrl,
        }),
      ).toThrow(/APP_URL must not/);
    }
  });

  it("allows http APP_URL on localhost only when CI=true in production", () => {
    const productionLocal = {
      DATABASE_URL: validUrl,
      DB_TLS_MODE: "insecure" as const,
      NODE_ENV: "production" as const,
      CONFIRM_EMAIL_SECRET: confirmSecret,
      CONSENT_PSEUDONYM_KEY: validConsentKey,
      EMAIL_TRANSPORT: "resend" as const,
      RESEND_API_KEY: "test-resend-key",
      CRON_SECRET: "cron-secret-value-32-characters-ok",
    };
    expect(
      readServerEnv({
        ...productionLocal,
        APP_URL: "http://127.0.0.1:3000",
        CI: "true",
      }).APP_URL,
    ).toBe("http://127.0.0.1:3000");
    expect(() =>
      readServerEnv({
        ...productionLocal,
        APP_URL: "http://127.0.0.1:3000",
      }),
    ).toThrow(/APP_URL must use https in production/);
    expect(() =>
      readServerEnv({
        ...productionLocal,
        APP_URL: "http://evil.example",
        CI: "true",
      }),
    ).toThrow(/APP_URL must use https in production/);
  });

  it("uses a local APP_URL placeholder during next build", () => {
    expect(
      readServerEnv({
        NODE_ENV: "production",
        NEXT_PHASE: "phase-production-build",
      }).APP_URL,
    ).toBe(BUILD_APP_URL);
  });
});
