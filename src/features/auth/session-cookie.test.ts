import { describe, expect, it } from "vitest";

import {
  CONFIRM_EMAIL_MAX_AGE_SECONDS,
  confirmEmailCookieOptions,
  getClientIp,
  isSameOrigin,
  requestOrigin,
  sessionCookieOptions,
  shouldUseSecureCookie,
} from "./session-cookie";

describe("session cookies", () => {
  it("is httpOnly, lax, and secure only on https", () => {
    expect(sessionCookieOptions(true)).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
    expect(confirmEmailCookieOptions(true)).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: CONFIRM_EMAIL_MAX_AGE_SECONDS,
    });
    expect(CONFIRM_EMAIL_MAX_AGE_SECONDS).toBeLessThanOrEqual(60 * 60);
    expect(shouldUseSecureCookie("development", "https")).toBe(true);
    expect(shouldUseSecureCookie("development", "https, http")).toBe(true);
    expect(shouldUseSecureCookie("development", "http")).toBe(false);
    expect(shouldUseSecureCookie("development", null)).toBe(false);
    expect(shouldUseSecureCookie("production", "http")).toBe(true);
    expect(shouldUseSecureCookie("production", null)).toBe(true);
  });

  it("accepts only a same-host origin", () => {
    expect(isSameOrigin("http://127.0.0.1:3000", "127.0.0.1:3000")).toBe(true);
    expect(isSameOrigin("https://evil.example", "gym.example")).toBe(false);
    expect(isSameOrigin(null, "gym.example")).toBe(false);
  });

  it("builds the public origin", () => {
    const headers = new Headers({
      host: "gym.example",
      "x-forwarded-proto": "https",
      "x-forwarded-for": "198.51.100.4, 10.0.0.1",
      "x-real-ip": "203.0.113.5",
    });

    expect(requestOrigin(headers)).toBe("https://gym.example");
  });

  it("ignores forged forwarding headers unless the proxy is trusted", () => {
    const forged = "203.0.113.5, 198.51.100.20";

    expect(
      getClientIp({
        forwardedFor: forged,
        socketAddress: "10.0.0.8",
        trustProxy: false,
      }),
    ).toBe("10.0.0.8");
    expect(
      getClientIp({
        forwardedFor: forged,
        trustProxy: false,
      }),
    ).toBeNull();
    expect(
      getClientIp({
        forwardedFor: forged,
        trustProxy: true,
        trustedProxyHops: 1,
      }),
    ).toBe("198.51.100.20");
    expect(
      getClientIp({
        forwardedFor: forged,
        trustProxy: true,
        trustedProxyHops: 2,
      }),
    ).toBe("203.0.113.5");
    expect(
      getClientIp({
        forwardedFor: "not-an-ip",
        socketAddress: "10.0.0.8",
        trustProxy: true,
      }),
    ).toBe("10.0.0.8");
    expect(
      getClientIp({
        forwardedFor: null,
        trustProxy: true,
      }),
    ).toBeNull();
  });
});
