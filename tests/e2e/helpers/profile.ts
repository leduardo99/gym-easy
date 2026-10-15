import { expect, type Page } from "@playwright/test";

/** Evita colisão com o checkbox de consentimento que menciona «ano de nascimento». */
export function birthYearField(page: Page) {
  return page.getByLabel("Ano de nascimento", { exact: true });
}

export function heightField(page: Page) {
  return page.getByLabel("Altura (cm)", { exact: true });
}

/** O campo de altura pode estar readOnly sem body_data; o servidor ainda valida o POST. */
export async function fillHeightCm(page: Page, value: string) {
  const field = heightField(page);
  await field.evaluate((el, cm) => {
    const input = el as HTMLInputElement;
    input.readOnly = false;
    input.value = cm;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
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
  await birthYearField(page).fill(year);
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Perfil guardado.")).toBeVisible({
    timeout: 15_000,
  });
  await page.reload();
  await expect(birthYearField(page)).toHaveValue(year);
}
