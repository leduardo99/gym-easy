import { expect, test } from "@playwright/test";

import { signedIn } from "./helpers/auth";
import { birthYearField, fillHeightCm, heightField } from "./helpers/profile";
import { refuseReconsentWithConfirm } from "./helpers/reconsent";

test("guardar a altura sem consentimento atual abre o reconsentimento", async ({
  page,
}) => {
  await signedIn(page);
  await page.goto("/perfil");
  await fillHeightCm(page, "170");
  await page.getByRole("button", { name: "Guardar" }).click();
  await page.waitForURL(/\/consentimento\?/);
  const url = new URL(page.url());
  expect(url.searchParams.get("scope")).toBe("body_data");
  expect(url.searchParams.get("next")).toBe("/perfil");
  await expect(
    page.getByRole("heading", { name: "Seus dados do corpo" }),
  ).toBeVisible();
  await page.getByText("Ler o texto completo").click();
  await expect(page.getByText(/contacto@gaffer.pt/)).toBeVisible();
  await page
    .getByRole("checkbox", {
      name: /Autorizo o Gym Easy a guardar e usar meu peso/,
    })
    .check();
  await page.getByRole("button", { name: "Autorizar" }).click();
  await page.waitForURL("**/perfil");

  await birthYearField(page).fill("1990");
  await fillHeightCm(page, "170");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Perfil guardado.")).toBeVisible();
  await page.goto("/perfil");
  await expect(birthYearField(page)).toHaveValue("1990");
  await expect(heightField(page)).toHaveValue("170");
});

test("recusar o reconsentimento não libera a ação", async ({ page }) => {
  await signedIn(page);
  await page.goto("/consentimento?scope=body_data&next=/perfil");
  await refuseReconsentWithConfirm(
    page,
    /Apagamos altura, sexo e os registos de peso/i,
  );
  await expect(page.getByTestId("reconsent-notice")).toContainText(
    /ano de nascimento no perfil foi mantido/i,
  );
  await expect(page).toHaveURL(/recusado=corpo/);

  await page.goto("/perfil");
  await fillHeightCm(page, "170");
  await page.getByRole("button", { name: "Guardar" }).click();
  await page.waitForURL(/\/consentimento\?/);
  expect(new URL(page.url()).searchParams.get("scope")).toBe("body_data");
});

test("um next externo volta para o perfil e um scope fora da lista não autoriza", async ({
  page,
}) => {
  await signedIn(page);
  await page.goto(
    "/consentimento?scope=body_data&next=https://evil.example/roubo",
  );
  await expect(page.locator('form input[name="next"]').first()).toHaveValue(
    "/perfil",
  );
  await page
    .getByRole("checkbox", {
      name: /Autorizo o Gym Easy a guardar e usar meu peso/,
    })
    .check();
  await page.getByRole("button", { name: "Autorizar" }).click();
  await page.waitForURL("**/perfil");
  expect(page.url()).not.toContain("evil.example");

  await page.goto("/consentimento?scope=admin&next=/perfil");
  await expect(
    page.getByText("Esta finalidade não pode ser autorizada por aqui."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Autorizar" })).toHaveCount(0);
});

test("o chat do coach exige os dois checkboxes da versão atual", async ({
  page,
}) => {
  await signedIn(page);
  await page.goto("/consentimento?scope=coach_chat&next=/perfil");
  await expect(
    page.getByRole("heading", { name: "Chat com o Coach" }),
  ).toBeVisible();
  const chat = page.getByRole("checkbox", {
    name: /Autorizo o Gym Easy a enviar as mensagens/,
  });
  const transfer = page.getByRole("checkbox", {
    name: /transferidas para o OpenRouter/,
  });
  await expect(chat).toBeVisible();
  await expect(transfer).not.toBeChecked();
  await chat.check();
  await expect(page.getByRole("button", { name: "Autorizar" })).toBeDisabled();
  await transfer.check();
  await expect(page.getByRole("button", { name: "Autorizar" })).toBeEnabled();
  await page.getByRole("button", { name: "Autorizar" }).click();
  await page.waitForURL("**/perfil");
});
