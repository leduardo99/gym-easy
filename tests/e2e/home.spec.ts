import { expect, test } from "@playwright/test";

test("home page introduces the app", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "App de Treino" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Criar conta" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Catálogo de design" }),
  ).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test("design catalog is available outside production", async ({
  page,
  request,
}) => {
  expect((await request.get("/design")).status()).toBe(200);

  await page.goto("/design");

  await expect(
    page.getByRole("heading", { name: "Design System" }),
  ).toBeVisible();
});

test("health endpoint reports the database without leaking errors", async ({
  request,
}) => {
  const response = await request.get("/api/health");
  const body: unknown = await response.json();

  if (response.status() === 200) {
    expect(body).toEqual({ status: "ok", db: "ok" });
    return;
  }

  expect(response.status()).toBe(503);
  expect(body).toEqual({ status: "error", db: "unavailable" });
});

test("responses include security headers", async ({ request }) => {
  for (const path of ["/", "/api/health"]) {
    const response = await request.get(path);
    const headers = response.headers();

    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toBe(
      "camera=(), microphone=(), geolocation=()",
    );
    expect(headers["content-security-policy"]).toContain("connect-src 'self'");
    expect(headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers["content-security-policy"]).toContain("'nonce-");
    expect(headers["strict-transport-security"]).toBeUndefined();
  }
});

test("api routes do not allow open CORS", async ({ request }) => {
  const origin = "https://evil.example";

  for (const method of ["GET", "OPTIONS"] as const) {
    const response = await request.fetch("/api/health", {
      method,
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": "GET",
      },
    });
    const allowOrigin = response.headers()["access-control-allow-origin"];

    expect(allowOrigin).not.toBe("*");
    expect(allowOrigin).not.toBe(origin);
  }
});
