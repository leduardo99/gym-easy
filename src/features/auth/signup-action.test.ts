// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { registerAccount } = vi.hoisted(() => ({
  registerAccount: vi.fn(),
}));

vi.mock("./register-account", () => ({
  registerAccount,
}));

vi.mock("./drizzle-user-store", () => ({
  createDrizzleUserStore: () => ({}),
}));

vi.mock("./email/create-email-sender", () => ({
  createEmailSender: () => ({}),
}));

vi.mock("./hibp", () => ({
  createHibpBreachChecker: () => ({ isBreached: async () => false }),
}));

vi.mock("./drizzle-rate-limiter", () => ({
  createDrizzleRateLimiter: () => ({
    hit: vi.fn(async () => ({ allowed: true, retryAfterSeconds: 0 })),
  }),
}));

vi.mock("@/db", () => ({
  getDb: () => ({}),
}));

const { requestHeaders } = vi.hoisted(() => ({
  requestHeaders: vi.fn(async () => new Headers()),
}));

vi.mock("next/headers", () => ({
  headers: requestHeaders,
  cookies: vi.fn(async () => ({
    get: () => undefined,
    set: vi.fn(),
  })),
}));

import { resetServerEnvCache } from "@/lib/env";

import { signupAction } from "./actions";

function baseEnv() {
  resetServerEnvCache();
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/gym");
  vi.stubEnv("CONFIRM_EMAIL_SECRET", "confirm-email-secret-for-unit-tests-00");
  vi.stubEnv("CONSENT_PSEUDONYM_KEY", "consent-pseudonym-test-key-32b!!");
  vi.stubEnv("RESEND_API_KEY", "re_test_key");
  vi.stubEnv("EMAIL_TRANSPORT", "resend");
}

describe("signupAction", () => {
  beforeEach(() => {
    registerAccount.mockReset();
    registerAccount.mockResolvedValue({
      status: "invalid",
      fieldErrors: { email: "inválido" },
    });
    baseEnv();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetServerEnvCache();
  });

  it("envia o IP real quando a captura de email está desativada (produção)", async () => {
    vi.stubEnv("APP_URL", "https://gym.example");
    delete process.env.EMAIL_CAPTURE_PATH;
    resetServerEnvCache();
    requestHeaders.mockResolvedValue(
      new Headers({
        origin: "https://gym.example",
        "x-gym-easy-peer": "198.51.100.4",
      }),
    );

    await signupAction({ name: "Ana", email: "a@example.com", password: "x" });

    expect(registerAccount).toHaveBeenCalledWith(
      expect.objectContaining({ ip: "198.51.100.4" }),
      expect.anything(),
    );
  });

  it("não envia IP quando a captura de email está ativa", async () => {
    vi.stubEnv("APP_URL", "http://127.0.0.1:3000");
    vi.stubEnv("EMAIL_CAPTURE_PATH", ".data/e2e-emails.jsonl");
    vi.stubEnv("CI", "true");
    resetServerEnvCache();
    requestHeaders.mockResolvedValue(
      new Headers({
        origin: "http://127.0.0.1:3000",
        "x-forwarded-for": "127.0.0.1",
      }),
    );

    await signupAction({ name: "Ana", email: "a@example.com", password: "x" });

    expect(registerAccount).toHaveBeenCalledWith(
      expect.objectContaining({ ip: null }),
      expect.anything(),
    );
  });
});
