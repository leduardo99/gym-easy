import { expect, test } from "@playwright/test";

import { grantConsent, signedIn } from "./helpers/auth";
import {
  countCoachMessagesForEmail,
  insertCoachMessageForEmail,
} from "./helpers/db";
import {
  birthYearField,
  heightField,
  SAVED_BIRTH_YEAR,
} from "./helpers/profile";

const hasDatabase = Boolean(process.env.DATABASE_URL);

async function coachReadyUser(prefix: string) {
  return async (page: import("@playwright/test").Page): Promise<string> => {
    const email = await signedIn(page, prefix);
    await grantConsent(page, "body_data", "/perfil");
    await page.goto("/perfil");
    await birthYearField(page).fill(SAVED_BIRTH_YEAR);
    await heightField(page).fill("170");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Perfil guardado.")).toBeVisible();
    await grantConsent(page, "coach_health", "/perfil/privacidade");
    await grantConsent(page, "coach_chat", "/perfil/privacidade");
    return email;
  };
}

async function postCoach(
  page: import("@playwright/test").Page,
  origin: string,
) {
  return page.request.post("/api/ai/coach", {
    data: { message: "como treinar hoje?" },
    headers: {
      "content-type": "application/json",
      origin,
    },
  });
}

async function refuseReconsentWithConfirm(
  page: import("@playwright/test").Page,
  warning: RegExp,
) {
  await page.getByRole("button", { name: "Agora não" }).click();
  const dialog = page.getByTestId("reconsent-refuse-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(warning);
  await page.getByRole("button", { name: "Voltar" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page).not.toHaveURL(/recusado=/);

  await page.getByRole("button", { name: "Agora não" }).click();
  await expect(dialog).toBeVisible();
  await page.getByRole("button", { name: "Recusar autorização" }).click();
}

test.describe("revogação de saúde do coach", () => {
  test.skip(!hasDatabase, "DATABASE_URL necessário para validar histórico");

  test("retirar saúde em privacidade bloqueia o coach e mantém o histórico", async ({
    page,
    baseURL,
  }) => {
    const setup = await coachReadyUser("coach-health-revoke");
    const email = await setup(page);
    await insertCoachMessageForEmail(email, "mensagem-e2e-revoke-health");
    expect(await countCoachMessagesForEmail(email)).toBe(1);

    await page
      .getByRole("button", { name: "Retirar autorização de saúde" })
      .click();
    await page
      .getByRole("button", { name: "Retirar autorização de saúde" })
      .last()
      .click();
    await expect(
      page
        .getByTestId("coach-privacy-section")
        .getByText("Autorização de saúde do Coach retirada."),
    ).toBeVisible();

    const response = await postCoach(page, baseURL ?? "http://127.0.0.1:3000");
    expect(response.status()).toBe(403);
    const body = (await response.json()) as { error: string; code: string };
    expect(body.code).toBe("consent_missing");
    expect(body.error).toMatch(/falta autorização de saúde/);
    expect(await countCoachMessagesForEmail(email)).toBe(1);
  });

  test("Agora não no reconsentimento de coach_health bloqueia o coach", async ({
    page,
    baseURL,
  }) => {
    const setup = await coachReadyUser("coach-health-reconsent");
    await setup(page);

    await page.goto(
      "/consentimento?scope=coach_health&next=/perfil/privacidade",
    );
    await refuseReconsentWithConfirm(
      page,
      /sugestões de plano do coach são apagadas/i,
    );
    await expect(page).toHaveURL(/recusado=saude/);
    await expect(page.getByTestId("reconsent-notice")).toContainText(
      /sugestões de plano do Coach foram apagadas/i,
    );
    await expect(
      page.getByText("Nada foi gravado. Sem esta autorização"),
    ).toHaveCount(0);

    const response = await postCoach(page, baseURL ?? "http://127.0.0.1:3000");
    expect(response.status()).toBe(403);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/falta autorização de saúde/);
  });

  test("Agora não no reconsentimento de coach_chat revoga e apaga o histórico", async ({
    page,
    baseURL,
  }) => {
    const setup = await coachReadyUser("coach-chat-reconsent");
    const email = await setup(page);
    await insertCoachMessageForEmail(email, "mensagem-e2e-reconsent-chat");
    expect(await countCoachMessagesForEmail(email)).toBe(1);

    await page.goto("/consentimento?scope=coach_chat&next=/perfil/privacidade");
    await refuseReconsentWithConfirm(page, /histórico de conversas é apagado/i);
    await expect(page).toHaveURL(/recusado=chat/);
    await expect(page.getByTestId("reconsent-notice")).toContainText(
      /histórico de conversas foi apagado/i,
    );
    await expect(
      page.getByText("Nada foi gravado. Sem esta autorização"),
    ).toHaveCount(0);
    expect(await countCoachMessagesForEmail(email)).toBe(0);

    const response = await postCoach(page, baseURL ?? "http://127.0.0.1:3000");
    expect(response.status()).toBe(403);
    const body = (await response.json()) as { error: string; code: string };
    expect(body.code).toBe("consent_missing");
    expect(body.error).toMatch(/autorizações vigentes/);
  });
});
