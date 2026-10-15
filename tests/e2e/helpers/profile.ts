import { expect, type Page } from "@playwright/test";

import { grantConsent } from "./auth";

/** Evita colisão com o checkbox de consentimento que menciona «ano de nascimento». */
export function birthYearField(page: Page) {
  return page.getByLabel("Ano de nascimento", { exact: true });
}

export function heightField(page: Page) {
  return page.getByLabel("Altura (cm)", { exact: true });
}

export const SAVED_BIRTH_YEAR = "1990";

/** Ano que falha a regra «ano atual − birth_year ≤ 16» (LED-46). */
export function birthYearUnderMinimumAge(now = new Date()): string {
  return String(now.getUTCFullYear() - 15);
}

export async function expectOnboardingIncomplete(page: Page) {
  await page.goto("/inicio");
  await expect(
    page.getByRole("link", { name: "Complete seu perfil" }),
  ).toBeVisible();
}

export async function saveBirthYearOnPerfil(
  page: Page,
  year = SAVED_BIRTH_YEAR,
) {
  await page.goto("/perfil");
  await grantConsent(page, "body_data");
  await birthYearField(page).fill(year);
  await page.getByRole("button", { name: "Guardar" }).click();
  await page.waitForURL(/\/perfil(\?|$)/);
  await page.reload();
  await expect(birthYearField(page)).toHaveValue(year);
}
