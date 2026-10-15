import { expect, test } from "@playwright/test";

import { grantConsent, signedIn } from "./helpers/auth";
import { birthYearField, heightField } from "./helpers/profile";

test("perfil com ano de nascimento evita profile_incomplete no coach", async ({
  page,
}) => {
  await signedIn(page, "profile-coach");
  await grantConsent(page, "body_data");

  await birthYearField(page).fill("1991");
  await heightField(page).fill("175");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Perfil guardado.")).toBeVisible();
  await page.reload();
  await expect(birthYearField(page)).toHaveValue("1991");

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
