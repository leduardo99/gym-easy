import { readFile } from "node:fs/promises";

import { expect, type Page } from "@playwright/test";

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

export async function signedIn(
  page: Page,
  prefix = "profile-flow",
): Promise<string> {
  const email = `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill("Ana Souza");
  await page.getByLabel("Email").fill(email);
  await page
    .getByLabel("Senha", { exact: true })
    .fill("gym-easy-e2e-senha-9f3f");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/cadastro\/confirme/, { timeout: 20_000 });
  await expect
    .poll(() => latestEmail(email))
    .toMatchObject({ kind: "account_confirmation" });
  const confirmation = await latestEmail(email);
  await page.goto(confirmation?.confirmUrl ?? "/");
  await page.waitForURL("**/onboarding");
  return email;
}

export async function grantConsent(
  page: Page,
  scope: string,
  next = "/perfil",
) {
  await page.goto(
    `/consentimento?scope=${scope}&next=${encodeURIComponent(next)}`,
  );
  const checkboxes = page.getByRole("checkbox");
  const count = await checkboxes.count();
  for (let index = 0; index < count; index += 1) {
    await checkboxes.nth(index).check();
  }
  await page.getByRole("button", { name: "Autorizar" }).click();
  await page.waitForURL(`**${next}`);
}
