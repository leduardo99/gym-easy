// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_DEV_APP_URL, readServerEnv, resetServerEnvCache } from "./env";

import { isAllowedOrigin, isAllowedOriginFromHeaders } from "./allowed-origin";

import { accessControlAllowOrigin, strictAppUrlOrigin } from "./app-url";

const envBase = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/gym",
  CONFIRM_EMAIL_SECRET: "confirm-email-secret-for-unit-tests-00",
  CONSENT_PSEUDONYM_KEY: "consent-pseudonym-test-key-32b!!",
};

function request(input: { origin?: string | null; referer?: string | null }) {
  const headers = new Headers();
  if (input.origin !== undefined && input.origin !== null) {
    headers.set("origin", input.origin);
  }
  if (input.referer) headers.set("referer", input.referer);
  return new Request("http://localhost/api/ai/coach", { headers });
}

describe("strictAppUrlOrigin", () => {
  it("accepts an origin-only URL and rejects path, query or hash", () => {
    expect(strictAppUrlOrigin("https://app.gaffer.pt")).toBe(
      "https://app.gaffer.pt",
    );
    expect(strictAppUrlOrigin("http://localhost:3000/")).toBe(
      "http://localhost:3000",
    );
    for (const value of [
      "https://app.gaffer.pt/cadastro",
      "https://app.gaffer.pt?x=1",
      "https://app.gaffer.pt#x",
    ]) {
      expect(typeof strictAppUrlOrigin(value)).toBe("object");
    }
  });
});

describe("accessControlAllowOrigin", () => {
  it("uses the origin from APP_URL and drops a path", () => {
    expect(accessControlAllowOrigin("https://app.gaffer.pt")).toBe(
      "https://app.gaffer.pt",
    );
    expect(accessControlAllowOrigin("https://app.gaffer.pt/cadastro")).toBe(
      "https://app.gaffer.pt",
    );
    expect(accessControlAllowOrigin("http://localhost:3000/")).toBe(
      "http://localhost:3000",
    );
  });

  it("omits the header when the value is missing or not an http origin", () => {
    expect(accessControlAllowOrigin(undefined)).toBeNull();
    expect(accessControlAllowOrigin("")).toBeNull();
    expect(accessControlAllowOrigin("app.gaffer.pt")).toBeNull();
    expect(accessControlAllowOrigin("javascript:alert(1)")).toBeNull();
    expect(
      accessControlAllowOrigin("https://user:pass@app.gaffer.pt"),
    ).toBeNull();
  });
});

describe("isAllowedOrigin", () => {
  beforeEach(() => {
    resetServerEnvCache();
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "test");
    for (const [key, value] of Object.entries(envBase)) {
      vi.stubEnv(key, value);
    }
    delete process.env.APP_URL;
    resetServerEnvCache();
  });

  afterEach(() => {
    resetServerEnvCache();
    vi.unstubAllEnvs();
  });

  it("rejects requests with neither Origin nor Referer", () => {
    expect(isAllowedOrigin(request({}))).toBe(false);
  });

  it("accepts Referer when Origin is absent and origins match APP_URL", () => {
    vi.stubEnv("APP_URL", "https://app.gaffer.pt");
    resetServerEnvCache();
    expect(
      isAllowedOrigin(request({ referer: "https://app.gaffer.pt/perfil" })),
    ).toBe(true);
    expect(isAllowedOrigin(request({}))).toBe(false);
  });

  it("rejects a different port or scheme", () => {
    vi.stubEnv("APP_URL", "https://app.gaffer.pt");
    resetServerEnvCache();
    expect(
      isAllowedOrigin(request({ origin: "https://app.gaffer.pt:4443" })),
    ).toBe(false);
    expect(isAllowedOrigin(request({ origin: "http://app.gaffer.pt" }))).toBe(
      false,
    );
  });

  it("rejects the literal null Origin when APP_URL is configured", () => {
    vi.stubEnv("APP_URL", "https://app.gaffer.pt");
    resetServerEnvCache();
    expect(isAllowedOrigin(request({ origin: "null" }))).toBe(false);
  });

  it("uses the default APP_URL in test when unset", () => {
    expect(isAllowedOrigin(request({ origin: DEFAULT_DEV_APP_URL }))).toBe(
      true,
    );
    expect(isAllowedOrigin(request({ origin: "http://localhost:3001" }))).toBe(
      false,
    );
  });

  it("checks Headers the same way as a Request", () => {
    vi.stubEnv("APP_URL", "https://app.gaffer.pt");
    resetServerEnvCache();
    const headers = new Headers({
      referer: "https://app.gaffer.pt/perfil",
    });
    expect(isAllowedOriginFromHeaders(headers)).toBe(true);
  });

  it("fails closed when production env cannot be loaded", () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.APP_URL;
    resetServerEnvCache();
    expect(isAllowedOrigin(request({ origin: "https://app.gaffer.pt" }))).toBe(
      false,
    );
  });
});

describe("APP_URL production validation", () => {
  it("rejects http APP_URL in production runtime", () => {
    expect(() =>
      readServerEnv({
        ...envBase,
        NODE_ENV: "production",
        EMAIL_TRANSPORT: "resend",
        RESEND_API_KEY: "test-resend-key",
        CRON_SECRET: "cron-secret-value-32-characters-ok",
        APP_URL: "http://app.gaffer.pt",
      }),
    ).toThrow(/APP_URL must use https in production/);
  });

  it("rejects missing APP_URL in production runtime", () => {
    expect(() =>
      readServerEnv({
        ...envBase,
        NODE_ENV: "production",
        EMAIL_TRANSPORT: "resend",
        RESEND_API_KEY: "test-resend-key",
        CRON_SECRET: "cron-secret-value-32-characters-ok",
      }),
    ).toThrow(/APP_URL is required in production/);
  });
});
