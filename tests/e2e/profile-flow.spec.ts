import { mkdir } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { grantConsent, signedIn } from "./helpers/auth";
import {
  birthYearField,
  birthYearUnderMinimumAge,
  expectOnboardingIncomplete,
  saveBirthYearOnPerfil,
  SAVED_BIRTH_YEAR,
} from "./helpers/profile";

const onboardingAuthState = path.join(
  ".data",
  "e2e-profile-flow-onboarding.json",
);
const perfilAuthState = path.join(".data", "e2e-profile-flow-perfil.json");
const coachAuthState = path.join(".data", "e2e-profile-flow-coach.json");

test.describe.configure({ mode: "serial" });

test.describe("onboarding", () => {
  test.beforeAll(async ({ browser }) => {
    await mkdir(".data", { recursive: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    await signedIn(page, "profile-flow-onboarding");
    await context.storageState({ path: onboardingAuthState });
    await context.close();
  });

  test.use({ storageState: onboardingAuthState });

  test("rejeita ano vazio no servidor", async ({ page }) => {
    await page.goto("/onboarding");
    await page.locator("#birthYear").evaluate((el) => {
      el.removeAttribute("required");
    });
    await page.getByRole("button", { name: "Guardar e continuar" }).click();
    await expect(page).toHaveURL(/\/onboarding\?erro=nascimento/);
    await expect(page.getByText(/Informe o ano de nascimento/i)).toBeVisible();
    await expect(birthYearField(page)).toHaveAttribute("aria-invalid", "true");
    await expectOnboardingIncomplete(page);
  });

  test("envio vazio não apaga ano já guardado", async ({ page }) => {
    await saveBirthYearOnPerfil(page, SAVED_BIRTH_YEAR);
    await page.goto("/onboarding");
    await expect(birthYearField(page)).toHaveValue(SAVED_BIRTH_YEAR);
    await page.locator("#birthYear").evaluate((el) => {
      el.removeAttribute("required");
      (el as HTMLInputElement).value = "";
    });
    await page.getByRole("button", { name: "Guardar e continuar" }).click();
    await expect(page).toHaveURL(/\/onboarding\?erro=nascimento/);
    await page.reload();
    await expect(birthYearField(page)).toHaveValue(SAVED_BIRTH_YEAR);
    await expectOnboardingIncomplete(page);
  });

  test("rejeita menor de 16 anos no servidor", async ({ page }) => {
    await saveBirthYearOnPerfil(page, SAVED_BIRTH_YEAR);
    await page.goto("/onboarding");
    await grantConsent(page, "body_data", "/onboarding");
    const underAge = birthYearUnderMinimumAge();
    await birthYearField(page).fill(underAge);
    await page.getByRole("button", { name: "Guardar e continuar" }).click();
    await expect(page).toHaveURL(/\/onboarding\?erro=nascimento/);
    await page.reload();
    await expect(birthYearField(page)).toHaveValue(SAVED_BIRTH_YEAR);
    await expectOnboardingIncomplete(page);
  });

  test("grava ano válido e continua no perfil", async ({ page }) => {
    await page.goto("/onboarding");
    await grantConsent(page, "body_data", "/onboarding");
    await birthYearField(page).fill(SAVED_BIRTH_YEAR);
    await page.getByRole("button", { name: "Guardar e continuar" }).click();
    await page.waitForURL(/\/perfil(\?|$)/);
    await expect(birthYearField(page)).toHaveValue(SAVED_BIRTH_YEAR);
  });
});

test.describe("perfil", () => {
  test.beforeAll(async ({ browser }) => {
    await mkdir(".data", { recursive: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    await signedIn(page, "profile-flow-perfil");
    await context.storageState({ path: perfilAuthState });
    await context.close();
  });

  test.use({ storageState: perfilAuthState });

  test("rejeita menor de 16 anos no servidor", async ({ page }) => {
    await saveBirthYearOnPerfil(page, SAVED_BIRTH_YEAR);
    const underAge = birthYearUnderMinimumAge();
    await birthYearField(page).fill(underAge);
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page).toHaveURL(/\/perfil\?erro=nascimento/);
    await expect(page.locator("#birthYear-error")).toContainText(
      /maiores de 16 anos/i,
    );
    await page.reload();
    await expect(birthYearField(page)).toHaveValue(SAVED_BIRTH_YEAR);
  });
});

test.describe("coach", () => {
  test.beforeAll(async ({ browser }) => {
    await mkdir(".data", { recursive: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    await signedIn(page, "profile-flow-coach");
    await context.storageState({ path: coachAuthState });
    await context.close();
  });

  test.use({ storageState: coachAuthState });

  test("profile_incomplete mostra CTA que foca o ano no perfil", async ({
    page,
  }) => {
    await page.goto("/onboarding");
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

    await page
      .getByRole("link", { name: "Completar ano de nascimento" })
      .click();
    await expect(page).toHaveURL(/\/perfil#birthYear$/);
    await expect(birthYearField(page)).toBeFocused({ timeout: 10_000 });
  });
});
