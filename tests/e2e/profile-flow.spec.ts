import { expect, test } from "@playwright/test";

import { grantConsent, signedIn } from "./helpers/auth";
import { birthYearField } from "./helpers/profile";

test("onboarding rejeita ano vazio no servidor", async ({ page }) => {
  await signedIn(page, "onboarding-empty");
  await page.locator("#birthYear").evaluate((el) => {
    el.removeAttribute("required");
  });
  await page.getByRole("button", { name: "Guardar e continuar" }).click();
  await expect(page).toHaveURL(/\/onboarding\?erro=nascimento/);
  await expect(page.getByText(/Informe o ano de nascimento/i)).toBeVisible();
  await expect(
    page.getByLabel("Ano de nascimento", { exact: true }),
  ).toHaveAttribute("aria-invalid", "true");
});

test("onboarding grava ano válido e continua", async ({ page }) => {
  await signedIn(page, "onboarding-valid");
  await birthYearField(page).fill("1990");
  await page.getByRole("button", { name: "Guardar e continuar" }).click();
  await page.waitForURL("**/inicio");
});

test("onboarding rejeita menor de 16 anos no servidor", async ({ page }) => {
  await signedIn(page, "onboarding-under16");
  await birthYearField(page).fill("2010");
  await page.getByRole("button", { name: "Guardar e continuar" }).click();
  await expect(page).toHaveURL(/\/onboarding\?erro=nascimento/);
  await expect(page).toHaveURL(/\/onboarding/);
});

test("perfil rejeita menor de 16 anos no servidor", async ({ page }) => {
  await signedIn(page, "perfil-under16");
  await grantConsent(page, "body_data");
  await birthYearField(page).fill("2010");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page).toHaveURL(/\/perfil\?erro=nascimento/);
  await expect(page.getByText(/maiores de 16 anos/i)).toBeVisible();
});

test("coach profile_incomplete mostra CTA que foca o ano no perfil", async ({
  page,
}) => {
  await signedIn(page, "coach-cta");
  await page.getByRole("button", { name: "Pular" }).click();
  await page.waitForURL("**/inicio");
  await grantConsent(page, "body_data", "/inicio");
  await grantConsent(page, "coach_health", "/inicio");
  await grantConsent(page, "coach_chat", "/inicio");

  await page.goto("/treinos");
  await page.getByPlaceholder("Pergunte sobre o treino…").fill("oi");
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(
    page.getByRole("link", { name: "Completar ano de nascimento" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Completar ano de nascimento" }).click();
  await expect(page).toHaveURL(/\/perfil#birthYear$/);
  await expect(birthYearField(page)).toBeFocused();
});
