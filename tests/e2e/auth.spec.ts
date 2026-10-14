import { readFile } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";

const capturePath = ".data/e2e-emails.jsonl";

async function latestEmail(email: string, kind: string) {
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
    .find((entry) => entry.to === email && entry.kind === kind);
}

async function signup(page: Page, email: string, name = "Ana Souza") {
  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill(name);
  await page.getByLabel("Email").fill(email);
  await page
    .getByLabel("Senha", { exact: true })
    .fill("gym-easy-e2e-senha-9f3f");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(
    page.getByText("Se o email for válido, enviamos um link para continuar."),
  ).toBeVisible();
}

test("cadastro, confirmação, logout e login", async ({ page }) => {
  const email = `qa-${Date.now()}@example.com`;
  await signup(page, email, "<script>alert(1)</script>");
  await expect(page.getByText(email)).toBeVisible();

  await expect
    .poll(() => latestEmail(email, "account_confirmation"))
    .toMatchObject({ kind: "account_confirmation" });
  const confirmation = await latestEmail(email, "account_confirmation");
  await page.goto(confirmation?.confirmUrl ?? "/");
  await page.waitForURL("**/onboarding");
  await expect(page.getByText("<script>alert(1)</script>")).toBeVisible();
  await expect(page.locator("script", { hasText: "alert(1)" })).toHaveCount(0);

  const cookies = await page.context().cookies();
  const session = cookies.find((cookie) => cookie.name === "ge_session");
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe("Lax");
  const stored = await page.evaluate(() => Object.keys(localStorage));
  expect(stored).not.toContain("ge_session");

  await page.getByRole("button", { name: "Sair" }).click();
  await page.waitForURL("**/");
  await page.goto("/onboarding");
  await expect(page).toHaveURL(/\/login\?next=/);

  await page.getByLabel("Email").fill(email);
  await page
    .getByLabel("Senha", { exact: true })
    .fill("gym-easy-e2e-senha-9f3f");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/onboarding");
});

test("cadastro com email já usado mostra a mesma confirmação", async ({
  page,
}) => {
  const email = `dup-${Date.now()}@example.com`;
  await signup(page, email);
  const confirmation = await latestEmail(email, "account_confirmation");
  await page.goto(confirmation?.confirmUrl ?? "/");
  await page.waitForURL("**/onboarding");
  await page.getByRole("button", { name: "Sair" }).click();
  await page.waitForURL("**/");

  await signup(page, email);
  await expect
    .poll(() => latestEmail(email, "account_exists_notice"))
    .toMatchObject({ kind: "account_exists_notice" });

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page
    .getByLabel("Senha", { exact: true })
    .fill("gym-easy-e2e-senha-9f3f");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/onboarding");
});

test("login com senha errada usa a mensagem genérica", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("ninguem@example.com");
  await page.getByLabel("Senha", { exact: true }).fill("senha-que-nao-existe");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Email ou senha incorretos.")).toBeVisible();
  await expect(page.getByLabel("Senha", { exact: true })).toHaveValue("");
});

test("rotas internas e a API exigem sessão", async ({ page, request }) => {
  for (const path of ["/inicio", "/treinos", "/historico", "/perfil"]) {
    await page.goto(path);
    await expect(page).toHaveURL(
      new RegExp(
        `/login\\?next=${encodeURIComponent(path).replace(/\//g, "\\/")}`,
      ),
    );
    await expect(
      page.getByRole("navigation", { name: "Principal" }),
    ).toHaveCount(0);
  }

  const response = await request.get("/api/me?userId=outro");
  expect(response.status()).toBe(401);
});

test("cadastro vazio mostra os erros dos campos", async ({ page }) => {
  await page.goto("/cadastro");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByText("Informe seu nome.")).toBeVisible();
  await expect(page.getByText("Informe seu email.")).toBeVisible();
  await expect(
    page.getByText("A senha precisa de pelo menos 8 caracteres."),
  ).toBeVisible();
  await expect(
    page.getByText("Corrija 3 campos para continuar."),
  ).toBeVisible();
});
