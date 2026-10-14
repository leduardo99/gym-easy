import { describe, expect, it } from "vitest";

import {
  BUILD_CONFIRM_EMAIL_SECRET,
  BUILD_CONSENT_PSEUDONYM_KEY,
  BUILD_DATABASE_URL,
  DEFAULT_EMAIL_FROM,
  readServerEnv,
} from "./env";

const validUrl = "postgresql://user:password@localhost:5432/gym_easy";
const confirmSecret = "confirm-email-secret-for-unit-tests-00";
const validConsentKey = "consent-pseudonym-test-key-32b!!";

describe("readServerEnv", () => {
  it("accepts a postgres connection string and defaults the email sender", () => {
    expect(DEFAULT_EMAIL_FROM).toBe("Gym Easy <onboarding@resend.dev>");
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

  it("ignores the email capture path in production", () => {
    expect(
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "production",
        VERCEL_ENV: "production",
        EMAIL_CAPTURE_PATH: ".data/emails.jsonl",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        CONSENT_PSEUDONYM_KEY: validConsentKey,
        RESEND_API_KEY: "test-resend-key",
      }).EMAIL_CAPTURE_PATH,
    ).toBeNull();
  });

  it("defaults development to smtp and requires host and port", () => {
    expect(
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "development",
        CONFIRM_EMAIL_SECRET: confirmSecret,
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
        SMTP_HOST: "",
        SMTP_PORT: "1025",
      }),
    ).toThrow(/SMTP_HOST/);
  });

  it("defaults production to resend and requires the api key", () => {
    expect(
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "production",
        VERCEL_ENV: "production",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        RESEND_API_KEY: "test-resend-key",
      }).EMAIL_TRANSPORT,
    ).toBe("resend");
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "production",
        VERCEL_ENV: "production",
        CONFIRM_EMAIL_SECRET: confirmSecret,
      }),
    ).toThrow(/RESEND_API_KEY/);
  });

  it("requires a resend key when the transport is explicitly resend", () => {
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "test",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        EMAIL_TRANSPORT: "resend",
      }),
    ).toThrow(/RESEND_API_KEY/);
  });

  it("refuses smtp in production unless SMTP_ALLOW_PRODUCTION=true", () => {
    const base = {
      DATABASE_URL: validUrl,
      NODE_ENV: "production" as const,
      CONFIRM_EMAIL_SECRET: confirmSecret,
      EMAIL_TRANSPORT: "smtp",
      SMTP_HOST: "smtp.example.com",
      SMTP_PORT: "587",
      SMTP_USER: "mailer",
      SMTP_PASS: "smtp-pass",
    };
    expect(() => readServerEnv(base)).toThrow(/SMTP_ALLOW_PRODUCTION/);
    expect(() => readServerEnv({ ...base, VERCEL_ENV: "production" })).toThrow(
      /SMTP_ALLOW_PRODUCTION/,
    );
    try {
      readServerEnv(base);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).not.toContain("smtp-pass");
      expect(message).not.toContain("mailer");
    }
    expect(
      readServerEnv({
        ...base,
        VERCEL_ENV: "production",
        SMTP_ALLOW_PRODUCTION: "true",
        SMTP_SECURE: "true",
      }),
    ).toMatchObject({
      EMAIL_TRANSPORT: "smtp",
      SMTP_HOST: "smtp.example.com",
      SMTP_PORT: 587,
      SMTP_USER: "mailer",
      SMTP_PASS: "smtp-pass",
      SMTP_SECURE: true,
    });
  });

  it("defaults a vercel preview to log without a resend key", () => {
    expect(
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "production",
        VERCEL_ENV: "preview",
        CONFIRM_EMAIL_SECRET: confirmSecret,
      }),
    ).toMatchObject({
      EMAIL_TRANSPORT: "log",
      RESEND_API_KEY: null,
      SMTP_HOST: null,
      SMTP_PORT: null,
    });
  });

  it("accepts an explicit log transport in production without a resend key", () => {
    expect(
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "production",
        VERCEL_ENV: "production",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        EMAIL_TRANSPORT: "log",
      }).EMAIL_TRANSPORT,
    ).toBe("log");
  });

  it("allows smtp on a vercel preview without the production opt-in", () => {
    expect(
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "production",
        VERCEL_ENV: "preview",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        EMAIL_TRANSPORT: "smtp",
        SMTP_HOST: "smtp.public.example",
        SMTP_PORT: "587",
        SMTP_SECURE: "false",
      }),
    ).toMatchObject({
      EMAIL_TRANSPORT: "smtp",
      SMTP_HOST: "smtp.public.example",
      SMTP_PORT: 587,
      SMTP_SECURE: false,
    });
  });

  it("rejects an unknown transport, a bad port, and a vague opt-in", () => {
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "test",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        EMAIL_TRANSPORT: "sendmail",
      }),
    ).toThrow(/EMAIL_TRANSPORT/);
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "development",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        SMTP_HOST: "mailpit",
        SMTP_PORT: "70000",
      }),
    ).toThrow(/SMTP_PORT/);
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "production",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        RESEND_API_KEY: "test-resend-key",
        SMTP_ALLOW_PRODUCTION: "yes",
      }),
    ).toThrow(/SMTP_ALLOW_PRODUCTION/);
  });

  it("rejects smtp secrets exposed with the public prefix", () => {
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "test",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        NEXT_PUBLIC_SMTP_PASS: "smtp-pass",
      }),
    ).toThrow(/NEXT_PUBLIC_/);
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "test",
        CONFIRM_EMAIL_SECRET: confirmSecret,
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
        EMAIL_CAPTURE_PATH: ".data/emails.jsonl",
      }),
    ).toMatchObject({
      EMAIL_CAPTURE_PATH: ".data/emails.jsonl",
      EMAIL_TRANSPORT: "smtp",
      SMTP_HOST: null,
    });
    expect(
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "production",
        CONFIRM_EMAIL_SECRET: confirmSecret,
        EMAIL_CAPTURE_PATH: ".data/e2e-emails.jsonl",
      }),
    ).toMatchObject({
      EMAIL_CAPTURE_PATH: ".data/e2e-emails.jsonl",
      EMAIL_TRANSPORT: "resend",
      RESEND_API_KEY: null,
    });
  });

  it("does not require email credentials during the next production build", () => {
    expect(
      readServerEnv({
        NODE_ENV: "production",
        NEXT_PHASE: "phase-production-build",
      }),
    ).toMatchObject({
      EMAIL_TRANSPORT: "resend",
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

  it("uses a non-secret consent key placeholder during next build", () => {
    expect(
      readServerEnv({
        NODE_ENV: "production",
        NEXT_PHASE: "phase-production-build",
      }).CONSENT_PSEUDONYM_KEY,
    ).toBe(BUILD_CONSENT_PSEUDONYM_KEY);
  });
});
