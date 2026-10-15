import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import PrivacyPage from "@/app/privacidade/page";

afterEach(() => {
  cleanup();
});

describe("privacy policy birthYear contexts (opção A)", () => {
  it("birthYear no perfil contratual; body_data lista só sexo, altura e peso", () => {
    render(<PrivacyPage />);

    const profileBody = screen.getByRole("region", {
      name: "Dados do perfil e do corpo",
    });
    const lists = within(profileBody).getAllByRole("list");
    const contractualList = lists[0];
    const bodyDataList = lists[1];
    expect(contractualList).toBeDefined();
    expect(bodyDataList).toBeDefined();
    if (!contractualList || !bodyDataList) return;

    expect(contractualList.textContent).toContain(
      "ano de nascimento (birthYear)",
    );
    expect(profileBody).toHaveTextContent("execução do contrato");
    expect(bodyDataList.textContent).toContain("sexo (sex)");
    expect(bodyDataList.textContent).toContain("heightCm");
    expect(bodyDataList.textContent).not.toContain(
      "ano de nascimento (birthYear)",
    );
    expect(profileBody).not.toHaveTextContent(/faixa etária/);
    expect(profileBody).not.toHaveTextContent(/2026-10-15b/);
    expect(profileBody).not.toHaveTextContent(/Nota técnica temporária/);
  });
});
