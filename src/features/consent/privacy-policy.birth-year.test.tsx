import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  PRIVACY_POLICY_BIRTH_YEAR_AGE_BAND_ID,
  privacyPolicyBirthYearAgeBandSentence,
} from "@/features/consent/privacy-policy";

import PrivacyPage from "@/app/privacidade/page";

afterEach(() => {
  cleanup();
});

describe("privacy policy birthYear contexts (opção A)", () => {
  it("birthYear no perfil contratual; uso com body_data explicado no texto -15b, não na lista body_data", () => {
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

    const ageBand = document.getElementById(
      PRIVACY_POLICY_BIRTH_YEAR_AGE_BAND_ID,
    );
    expect(ageBand).toHaveTextContent(privacyPolicyBirthYearAgeBandSentence());
    expect(ageBand).toHaveTextContent("2026-10-15b");
    expect(ageBand).toHaveTextContent("birthYear");
    expect(ageBand).toHaveTextContent(/faixa etária/);
    expect(ageBand).toHaveTextContent(/base contratual/);
  });
});
