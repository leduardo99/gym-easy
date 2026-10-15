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
  const email = `profile-coach-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
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

async function grantConsent(page: Page, scope: string, next = "/perfil") {
  await page.goto(`/consentimento?scope=${scope}&next=${next}`);
  const checkboxes = page.getByRole("checkbox");
  const count = await checkboxes.count();
  for (let index = 0; index < count; index += 1) {
    await checkboxes.nth(index).check();
  }
  await page.getByRole("button", { name: "Autorizar" }).click();
  await page.waitForURL(`**${next}`);
}

test("perfil com ano de nascimento evita profile_incomplete no coach", async ({
  page,
}) => {
  await signedIn(page);
  await grantConsent(page, "body_data");

  await page.getByLabel("Ano de nascimento").fill("1991");
  await page.getByLabel("Altura (cm)").fill("175");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Perfil guardado.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Ano de nascimento")).toHaveValue("1991");

  await grantConsent(page, "coach_health");
  await grantConsent(page, "coach_chat");

  const response = await page.request.post("/api/ai/coach", {
    data: { message: "oi" },
    headers: { "content-type": "application/json" },
  });

  const payload = await response.json();
  const serialized = JSON.stringify(payload);
  expect(serialized).not.toMatch(/Falta o ano de nascimento/);
});
