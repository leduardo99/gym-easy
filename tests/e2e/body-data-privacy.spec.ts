import { expect, test } from "@playwright/test";

import { grantConsent, signedIn } from "./helpers/auth";
import {
  birthYearField,
  heightField,
  SAVED_BIRTH_YEAR,
} from "./helpers/profile";
import { refuseReconsentWithConfirm } from "./helpers/reconsent";

const bodyDataSwitch = (page: import("@playwright/test").Page) =>
  page.getByRole("switch", { name: "Dados do corpo" });

test("retirar dados do corpo no switch e voltar ao reconsentimento ao guardar altura", async ({
  page,
}) => {
  await signedIn(page, "body-data-privacy");
  await grantConsent(page, "body_data", "/perfil");

  await birthYearField(page).fill(SAVED_BIRTH_YEAR);
  await heightField(page).fill("172");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Perfil guardado.")).toBeVisible();

  await page.goto("/perfil/privacidade");
  await expect(bodyDataSwitch(page)).toBeChecked();

  const switchControl = bodyDataSwitch(page);
  await switchControl.focus();
  await page.keyboard.press(" ");

  await expect(
    page.getByRole("heading", {
      name: "Retirar autorização dos dados do corpo?",
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Retirar autorização" })
    .last()
    .click();
  await expect(
    page
      .getByTestId("body-data-privacy-section")
      .getByText("Autorização retirada e dados do corpo apagados."),
  ).toBeVisible();

  await page.goto("/perfil");
  await expect(birthYearField(page)).toHaveValue(SAVED_BIRTH_YEAR);
  await expect(heightField(page)).toHaveValue("");

  await heightField(page).fill("180");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page).toHaveURL(/\/consentimento\?.*scope=body_data/);
});

test("Agora não no reconsentimento de body_data pede confirmação e apaga altura", async ({
  page,
}) => {
  await signedIn(page, "body-data-reconsent");
  await grantConsent(page, "body_data", "/perfil");
  await birthYearField(page).fill(SAVED_BIRTH_YEAR);
  await heightField(page).fill("168");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Perfil guardado.")).toBeVisible();

  await page.goto("/consentimento?scope=body_data&next=/perfil");
  await refuseReconsentWithConfirm(
    page,
    /Apagamos altura, sexo e todo o histórico de peso/i,
  );
  await expect(page).toHaveURL(/recusado=corpo/);
  await expect(page.getByTestId("reconsent-notice")).toContainText(
    /ano de nascimento no perfil foi mantido/i,
  );
  await expect(
    page.getByText(
      "Nada foi gravado. Sem esta autorização, a ação continua bloqueada.",
    ),
  ).not.toBeVisible();

  await page.goto("/perfil");
  await expect(birthYearField(page)).toHaveValue(SAVED_BIRTH_YEAR);
  await expect(heightField(page)).toHaveValue("");
});

test("o switch de dados do corpo abre a confirmação com Enter", async ({
  page,
}) => {
  await signedIn(page, "body-data-privacy-enter");
  await grantConsent(page, "body_data", "/perfil/privacidade");

  const switchControl = bodyDataSwitch(page);
  await switchControl.focus();
  await page.keyboard.press("Enter");

  await expect(
    page.getByRole("heading", {
      name: "Retirar autorização dos dados do corpo?",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Retirar autorização dos dados do corpo?",
    }),
  ).not.toBeVisible();
});
