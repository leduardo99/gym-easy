import { expect, test } from "@playwright/test";

import { grantConsent, signedIn } from "./helpers/auth";
import {
  birthYearField,
  birthYearUnderMinimumAge,
  expectOnboardingIncomplete,
  saveBirthYearOnPerfil,
  SAVED_BIRTH_YEAR,
} from "./helpers/profile";

test.describe.configure({ mode: "serial" });

test("onboarding: validação de ano e conclusão no perfil", async ({ page }) => {
  await signedIn(page, "profile-flow-onboarding");

  await test.step("rejeita ano vazio no servidor", async () => {
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

  await test.step("envio vazio não apaga ano já guardado", async () => {
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

  await test.step("rejeita menor de 16 anos no servidor", async () => {
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

  await test.step("grava ano válido e continua no perfil", async () => {
    await page.goto("/onboarding");
    await grantConsent(page, "body_data", "/onboarding");
    await birthYearField(page).fill(SAVED_BIRTH_YEAR);
    await page.getByRole("button", { name: "Guardar e continuar" }).click();
    await page.waitForURL(/\/perfil(\?|$)/);
    await expect(birthYearField(page)).toHaveValue(SAVED_BIRTH_YEAR);
  });
});

test("perfil: rejeita menor de 16 anos no servidor", async ({ page }) => {
  await signedIn(page, "profile-flow-perfil");
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

test("coach: profile_incomplete mostra CTA que foca o ano no perfil", async ({
  page,
}) => {
  await signedIn(page, "profile-flow-coach");
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

  await page.getByRole("link", { name: "Completar ano de nascimento" }).click();
  await expect(page).toHaveURL(/\/perfil#birthYear$/);
  await expect(birthYearField(page)).toBeFocused({ timeout: 10_000 });
});
