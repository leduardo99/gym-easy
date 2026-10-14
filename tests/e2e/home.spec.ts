import { expect, test } from "@playwright/test";

test("home page introduces the app", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Gym Easy" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Catálogo de design" }),
  ).toBeVisible();
});

test("design catalog is available outside production", async ({ page }) => {
  await page.goto("/design");

  await expect(
    page.getByRole("heading", { name: "Design System" }),
  ).toBeVisible();
});

test("health endpoint reports ok", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.ok()).toBeTruthy();
  await expect(response.json()).resolves.toEqual({ status: "ok" });
});
