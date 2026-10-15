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
  const email = `reconsent-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
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

test("guardar a altura sem consentimento atual abre o reconsentimento", async ({
  page,
}) => {
  await signedIn(page);
  await page.goto("/perfil");
  await page.getByLabel("Altura (cm)").fill("170");
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

  await page.getByLabel("Ano de nascimento").fill("1990");
  await page.getByLabel("Altura (cm)").fill("170");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Perfil guardado.")).toBeVisible();
  await page.goto("/perfil");
  await expect(page.getByLabel("Ano de nascimento")).toHaveValue("1990");
  await expect(page.getByLabel("Altura (cm)")).toHaveValue("170");
});

test("recusar o reconsentimento não libera a ação", async ({ page }) => {
  await signedIn(page);
  await page.goto("/consentimento?scope=body_data&next=/perfil");
  await page.getByRole("button", { name: "Agora não" }).click();
  await expect(
    page.getByText(
      "Nada foi gravado. Sem esta autorização, a ação continua bloqueada.",
    ),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/consentimento\?/);

  await page.goto("/perfil");
  await page.getByLabel("Altura (cm)").fill("170");
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
