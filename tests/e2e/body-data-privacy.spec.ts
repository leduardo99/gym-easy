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

test("guarda o perfil contratual com o switch de dados do corpo desligado", async ({
  page,
}) => {
  await signedIn(page, "body-data-profile-no-consent");
  await birthYearField(page).fill(SAVED_BIRTH_YEAR);
  await page.getByRole("button", { name: "Guardar e continuar" }).click();
  await page.waitForURL("**/perfil");
  await expect(heightField(page)).toHaveAttribute("readonly", "");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Perfil guardado.")).toBeVisible();
});

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

  const switchRow = page.getByTestId("body-data-switch-row");
  await expect(switchRow).toHaveClass(/min-h-11/);
  const switchLabel = page.getByTestId("body-data-switch-label");
  await expect(switchLabel).toHaveClass(/min-h-11/);
  const labelBox = await switchLabel.boundingBox();
  expect(labelBox?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(labelBox?.height ?? 0).toBeGreaterThanOrEqual(44);

  const switchControl = bodyDataSwitch(page);
  const switchBox = await switchControl.boundingBox();
  expect(switchBox?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(switchBox?.height ?? 0).toBeGreaterThanOrEqual(44);
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
  await expect(page.getByRole("status")).toBeFocused();

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
    /Apagamos altura, sexo e os registos de peso/i,
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
  await expect(switchControl).toBeFocused();
});

test("Voltar no reconsentimento de body_data mantém a altura no perfil", async ({
  page,
}) => {
  await signedIn(page, "body-data-reconsent-voltar");
  await grantConsent(page, "body_data", "/perfil");
  await birthYearField(page).fill(SAVED_BIRTH_YEAR);
  await heightField(page).fill("168");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Perfil guardado.")).toBeVisible();

  await page.goto("/consentimento?scope=body_data&next=/perfil");
  await page.getByRole("button", { name: "Agora não" }).click();
  const dialog = page.getByTestId("reconsent-refuse-dialog");
  await expect(dialog).toBeVisible();
  await page.getByRole("button", { name: "Voltar" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page).not.toHaveURL(/recusado=/);

  await page.goto("/perfil");
  await expect(birthYearField(page)).toHaveValue(SAVED_BIRTH_YEAR);
  await expect(heightField(page)).toHaveValue("168");
});
