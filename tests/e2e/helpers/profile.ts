import type { Page } from "@playwright/test";

/** Evita colisão com o checkbox de consentimento que menciona «ano de nascimento». */
export function birthYearField(page: Page) {
  return page.getByLabel("Ano de nascimento", { exact: true });
}

export function heightField(page: Page) {
  return page.getByLabel("Altura (cm)", { exact: true });
}
