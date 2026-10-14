import { describe, expect, it } from "vitest";

import {
  clientIp,
  CONFIRM_EMAIL_MAX_AGE_SECONDS,
  confirmEmailCookieOptions,
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
    expect(shouldUseSecureCookie("https")).toBe(true);
    expect(shouldUseSecureCookie("https, http")).toBe(true);
    expect(shouldUseSecureCookie("http")).toBe(false);
    expect(shouldUseSecureCookie(null)).toBe(false);
  });

  it("accepts only a same-host origin", () => {
    expect(isSameOrigin("http://127.0.0.1:3000", "127.0.0.1:3000")).toBe(true);
    expect(isSameOrigin("https://evil.example", "gym.example")).toBe(false);
    expect(isSameOrigin(null, "gym.example")).toBe(false);
  });

  it("builds the public origin and reads the platform client ip", () => {
    const headers = new Headers({
      host: "gym.example",
      "x-forwarded-proto": "https",
      "x-forwarded-for": "198.51.100.4, 10.0.0.1",
      "x-real-ip": "203.0.113.5",
    });

    expect(requestOrigin(headers)).toBe("https://gym.example");
    expect(clientIp(headers)).toBe("203.0.113.5");
    expect(
      clientIp(new Headers({ "x-real-ip": " 203.0.113.8, 10.0.0.2 " })),
    ).toBe("203.0.113.8");
    expect(
      clientIp(new Headers({ "x-forwarded-for": "198.51.100.4, 10.0.0.1" })),
    ).toBe("198.51.100.4");
    expect(clientIp(new Headers({ "x-real-ip": "unknown" }))).toBeNull();
    expect(clientIp(new Headers())).toBeNull();
    const nextHeaderStore = {
      get(name: string) {
        return name === "x-real-ip" ? "203.0.113.7" : null;
      },
      headers: { "x-real-ip": "203.0.113.7" },
    };
    expect(clientIp(nextHeaderStore as unknown as Headers)).toBe("203.0.113.7");
  });
});
