import { describe, expect, it } from "vitest";

import {
  clientIp,
  isSameOrigin,
  requestOrigin,
  sessionCookieOptions,
  shouldUseSecureCookie,
} from "./session-cookie";

describe("session cookies", () => {
  it("is httpOnly, lax, and secure only on https or Vercel", () => {
    expect(sessionCookieOptions(true)).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
    expect(
      shouldUseSecureCookie({
        forwardedProto: "https",
        vercelEnv: undefined,
      }),
    ).toBe(true);
    expect(
      shouldUseSecureCookie({
        forwardedProto: "http",
        vercelEnv: "production",
      }),
    ).toBe(false);
    expect(
      shouldUseSecureCookie({
        forwardedProto: null,
        vercelEnv: "preview",
      }),
    ).toBe(true);
    expect(
      shouldUseSecureCookie({
        forwardedProto: null,
        vercelEnv: undefined,
      }),
    ).toBe(false);
  });

  it("accepts only a same-host origin", () => {
    expect(isSameOrigin("http://127.0.0.1:3000", "127.0.0.1:3000")).toBe(true);
    expect(isSameOrigin("https://evil.example", "gym.example")).toBe(false);
    expect(isSameOrigin(null, "gym.example")).toBe(false);
  });

  it("builds the public origin and reads the client ip", () => {
    const headers = new Headers({
      host: "gym.example",
      "x-forwarded-proto": "https",
      "x-forwarded-for": "203.0.113.5, 10.0.0.1",
    });

    expect(requestOrigin(headers)).toBe("https://gym.example");
    expect(clientIp(headers)).toBe("203.0.113.5");
  });
});
