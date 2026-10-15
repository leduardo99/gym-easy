import { readFile } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";

const capturePath = ".data/e2e-emails.jsonl";

async function latestEmail(email: string) {
  const text = await readFile(capturePath, "utf8").catch(() => "");
  const entries = text
    .split("\n")
    .filter(Boolean)
    .map(
      (line) =>
        JSON.parse(line) as { kind: string; to: string; confirmUrl?: string },
    );
  return [...entries]
    .reverse()
    .find(
      (entry) => entry.to === email && entry.kind === "account_confirmation",
    );
}

async function signedIn(page: Page) {
  const email = `coach-privacy-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill("Ana Souza");
  await page.getByLabel("Email").fill(email);
  await page
    .getByLabel("Senha", { exact: true })
    .fill("gym-easy-e2e-senha-9f3f");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/cadastro\/confirme/);
  await expect
    .poll(() => latestEmail(email))
    .toMatchObject({ kind: "account_confirmation" });
  const confirmation = await latestEmail(email);
  await page.goto(confirmation?.confirmUrl ?? "/");
  await page.waitForURL("**/onboarding");
}

async function grantCoachChat(page: Page) {
  await page.goto("/consentimento?scope=coach_chat&next=/perfil/privacidade");
  await page
    .getByRole("checkbox", {
      name: /Autorizo o Gym Easy a enviar as mensagens/,
    })
    .check();
  await page
    .getByRole("checkbox", {
      name: /transferidas para o OpenRouter/,
    })
    .check();
  await page.getByRole("button", { name: "Autorizar" }).click();
  await page.waitForURL("**/perfil/privacidade");
}

test("perfil privacidade mostra o Coach de IA e apaga histórico com confirmação", async ({
  page,
}) => {
  await signedIn(page);
  await grantCoachChat(page);
  await expect(
    page.getByRole("heading", { name: "Coach de IA" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Apagar histórico" }).click();
  await expect(
    page.getByRole("heading", { name: "Apagar histórico do chat?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Apagar histórico" }).last().click();
  await expect(
    page
      .getByTestId("coach-privacy-section")
      .getByText("Histórico do chat apagado."),
  ).toBeVisible();
});

test("retirar consentimento do Coach pede confirmação e mostra sucesso", async ({
  page,
}) => {
  await signedIn(page);
  await grantCoachChat(page);
  await page.getByRole("button", { name: "Retirar consentimento" }).click();
  await expect(
    page.getByRole("heading", { name: "Retirar consentimento do Coach?" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Retirar consentimento" })
    .last()
    .click();
  await expect(
    page
      .getByTestId("coach-privacy-section")
      .getByText("Consentimento do Coach retirado."),
  ).toBeVisible();
});

test("o perfil liga para privacidade", async ({ page }) => {
  await signedIn(page);
  await page.goto("/perfil");
  await page.getByRole("link", { name: "Privacidade" }).click();
  await expect(page).toHaveURL(/\/perfil\/privacidade/);
});
