import { describe, expect, it } from "vitest";

import {
  BUILD_CONFIRM_EMAIL_SECRET,
  BUILD_DATABASE_URL,
  DEFAULT_EMAIL_FROM,
  readServerEnv,
} from "./env";

const validUrl = "postgresql://user:password@localhost:5432/gym_easy";
const confirmSecret = "confirm-email-secret-for-unit-tests-00";

describe("readServerEnv", () => {
  it("accepts a postgres connection string and defaults the email sender", () => {
    expect(DEFAULT_EMAIL_FROM).toBe("Gym Easy <onboarding@resend.dev>");
    expect(
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "test",
        CONFIRM_EMAIL_SECRET: confirmSecret,
      }),
    ).toEqual({
      DATABASE_URL: validUrl,
      NODE_ENV: "test",
      RESEND_API_KEY: null,
      EMAIL_FROM: DEFAULT_EMAIL_FROM,
      EMAIL_CAPTURE_PATH: null,
      CONFIRM_EMAIL_SECRET: confirmSecret,
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
      }),
    ).toMatchObject({
      RESEND_API_KEY: "test-resend-key",
      EMAIL_FROM: "Gym Easy <treino@example.com>",
      EMAIL_CAPTURE_PATH: ".data/emails.jsonl",
      CONFIRM_EMAIL_SECRET: confirmSecret,
    });
  });

  it("accepts a bare email sender and rejects a name without an address", () => {
    expect(
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "test",
        EMAIL_FROM: "treino@example.com",
        CONFIRM_EMAIL_SECRET: confirmSecret,
      }).EMAIL_FROM,
    ).toBe("treino@example.com");
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "test",
        EMAIL_FROM: "Gym Easy",
        CONFIRM_EMAIL_SECRET: confirmSecret,
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
      }).EMAIL_CAPTURE_PATH,
    ).toBeNull();
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
      }),
    ).toThrow(/NEXT_PUBLIC_/);
  });

  it("requires a long confirm-email secret and keeps it server-only", () => {
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "test",
        CONFIRM_EMAIL_SECRET: "too-short",
      }),
    ).toThrow(/CONFIRM_EMAIL_SECRET/);
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NODE_ENV: "test",
        CONFIRM_EMAIL_SECRET: confirmSecret,
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
    });
  });

  it("does not treat the npm build lifecycle as a next production build", () => {
    expect(() =>
      readServerEnv({
        NODE_ENV: "production",
        npm_lifecycle_event: "build",
      }),
    ).toThrow(/DATABASE_URL/);
  });
});
