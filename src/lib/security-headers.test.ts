import { describe, expect, it } from "vitest";

import { buildSecurityHeaders } from "./security-headers";

const nonce = "test-nonce";

describe("buildSecurityHeaders", () => {
  it("sets the baseline headers and a nonce CSP outside production", () => {
    const headers = buildSecurityHeaders({
      nonce,
      isProduction: false,
      isDevelopment: false,
    });

    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Permissions-Policy"]).toBe(
      "camera=(), microphone=(), geolocation=()",
    );
    const policy = headers["Content-Security-Policy"] ?? "";

    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain(
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    );
    expect(policy).toContain("style-src 'self' 'unsafe-inline'");
    expect(policy).not.toContain(`style-src 'self' 'nonce-${nonce}'`);
    expect(policy).not.toContain("'unsafe-eval'");
    expect(headers["Content-Security-Policy"]).not.toContain(
      "upgrade-insecure-requests",
    );
    expect(headers["Strict-Transport-Security"]).toBeUndefined();
  });

  it("allows eval only in development and sends HSTS only in production", () => {
    const development = buildSecurityHeaders({
      nonce,
      isProduction: false,
      isDevelopment: true,
    });
    const production = buildSecurityHeaders({
      nonce,
      isProduction: true,
      isDevelopment: false,
    });

    expect(development["Content-Security-Policy"]).toContain("'unsafe-eval'");
    expect(development["Strict-Transport-Security"]).toBeUndefined();
    expect(production["Content-Security-Policy"]).not.toContain(
      "'unsafe-eval'",
    );
    expect(production["Content-Security-Policy"]).toContain(
      "upgrade-insecure-requests",
    );
    expect(production["Strict-Transport-Security"]).toContain("max-age=");
    expect(production["Strict-Transport-Security"]).toContain(
      "includeSubDomains",
    );
  });
});
