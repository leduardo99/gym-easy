import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import PrivacyPage from "@/app/privacidade/page";

afterEach(() => {
  cleanup();
});

describe("privacy policy birthYear contexts", () => {
  it("nomeia birthYear no armazenamento contratual e no uso com body_data (-15b)", () => {
    render(<PrivacyPage />);

    const profileBody = screen.getByRole("region", {
      name: "Dados do perfil e do corpo",
    });
    const lists = within(profileBody).getAllByRole("list");

    expect(lists[0].textContent).toContain("ano de nascimento (birthYear)");
    expect(profileBody).toHaveTextContent("execução do contrato");

    expect(lists[1].textContent).toContain(
      "uso do ano de nascimento (birthYear)",
    );
    expect(lists[1].textContent).toContain("2026-10-15b");
    expect(lists[1].textContent).toContain("sexo (sex)");
    expect(lists[1].textContent).toContain("heightCm");
  });
});
