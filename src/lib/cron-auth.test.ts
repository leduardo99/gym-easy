import { describe, expect, it } from "vitest";

import {
  cronQueryCarriesSecret,
  unauthorizedCron,
  verifyCronSecret,
} from "./cron-auth";

describe("verifyCronSecret", () => {
  it("accepts matching secrets and rejects mismatches of the same length", () => {
    const secret = "cron-secret-value-32-characters-ok";
    expect(verifyCronSecret(secret, secret)).toBe(true);
    expect(verifyCronSecret("x".repeat(secret.length), secret)).toBe(false);
  });
});

describe("unauthorizedCron", () => {
  it("rejects missing bearer and secrets in the query string", () => {
    const secret = "cron-secret-value-32-characters-ok";
    process.env.CRON_SECRET = secret;
    expect(
      unauthorizedCron(
        new Request("http://localhost/api/cron/purge-coach-messages"),
      )?.status,
    ).toBe(401);
    expect(
      unauthorizedCron(
        new Request(
          `http://localhost/api/cron/purge-coach-messages?token=${secret}`,
        ),
      )?.status,
    ).toBe(401);
  });

  it("returns null when the bearer matches", () => {
    const secret = "cron-secret-value-32-characters-ok";
    process.env.CRON_SECRET = secret;
    expect(
      unauthorizedCron(
        new Request("http://localhost/api/cron/purge-coach-messages", {
          headers: { authorization: `Bearer ${secret}` },
        }),
      ),
    ).toBeNull();
  });
});

describe("cronQueryCarriesSecret", () => {
  it("flags known query parameter names", () => {
    const secret = "cron-secret-value-32-characters-ok";
    expect(
      cronQueryCarriesSecret(
        new URL("http://localhost/api/cron?secret=1"),
        secret,
      ),
    ).toBe(true);
    expect(
      cronQueryCarriesSecret(new URL("http://localhost/api/cron"), secret),
    ).toBe(false);
  });
});
