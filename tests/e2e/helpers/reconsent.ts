import { expect, type Page } from "@playwright/test";

export async function refuseReconsentWithConfirm(page: Page, warning: RegExp) {
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
