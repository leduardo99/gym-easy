import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "./proxy";

const originalVercelEnv = process.env.VERCEL_ENV;

afterEach(() => {
  if (originalVercelEnv === undefined) {
    delete process.env.VERCEL_ENV;
  } else {
    process.env.VERCEL_ENV = originalVercelEnv;
  }
});

describe("proxy design catalog", () => {
  it("returns a real 404 for /design in production", async () => {
    process.env.VERCEL_ENV = "production";

    const response = proxy(
      new NextRequest("https://gym-easy.vercel.app/design"),
    );

    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe("Not Found");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("content-security-policy")).toContain(
      "connect-src 'self'",
    );
    expect(response.headers.get("strict-transport-security")).toContain(
      "max-age=",
    );
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it.each(["/Design", "/design/", "/%64esign"])(
    "returns 404 for %s in production",
    (pathname) => {
      process.env.VERCEL_ENV = "production";

      const response = proxy(
        new NextRequest(`https://gym-easy.vercel.app${pathname}`),
      );

      expect(response.status).toBe(404);
    },
  );

  it("keeps /design available outside production", () => {
    delete process.env.VERCEL_ENV;

    const response = proxy(new NextRequest("http://127.0.0.1:3000/design/"));

    expect(response.status).not.toBe(404);
  });
});
