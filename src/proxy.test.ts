import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "./proxy";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("proxy design catalog", () => {
  it("returns a real 404 for /design in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = proxy(new NextRequest("https://gym.example/design"));

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

  it("sets Access-Control-Allow-Origin from APP_URL", () => {
    vi.stubEnv("APP_URL", "https://app.gaffer.pt/cadastro");
    vi.stubEnv("NODE_ENV", "production");

    const response = proxy(new NextRequest("https://gym.example/"));

    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://app.gaffer.pt",
    );
  });

  it.each(["/Design", "/design/", "/%64esign"])(
    "returns 404 for %s in production",
    (pathname) => {
      vi.stubEnv("NODE_ENV", "production");

      const response = proxy(new NextRequest(`https://gym.example${pathname}`));

      expect(response.status).toBe(404);
    },
  );

  it("keeps /design available outside production", () => {
    vi.stubEnv("NODE_ENV", "development");

    const response = proxy(new NextRequest("http://127.0.0.1:3000/design/"));

    expect(response.status).not.toBe(404);
    expect(response.headers.get("strict-transport-security")).toBeNull();
  });
});
