import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  formatProfileBirthYear,
  ProfileBirthYearField,
} from "./profile-birth-year-field";

afterEach(() => {
  cleanup();
});

describe("ProfileBirthYearField", () => {
  it("mostra o ano guardado no defaultValue", () => {
    render(<ProfileBirthYearField birthYear={1991} />);
    expect(screen.getByLabelText("Ano de nascimento")).toHaveValue("1991");
  });

  it("deixa o campo vazio sem ano guardado", () => {
    render(<ProfileBirthYearField birthYear={null} />);
    expect(screen.getByLabelText("Ano de nascimento")).toHaveValue("");
  });

  it("expõe aria-invalid e aria-describedby quando inválido", () => {
    render(
      <ProfileBirthYearField
        birthYear={null}
        invalid
        errorMessageId="birthYear-error"
      />,
    );

    const input = screen.getByLabelText("Ano de nascimento");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute(
      "aria-describedby",
      "birthYear-error birthYear-hint",
    );
  });
});

describe("formatProfileBirthYear", () => {
  it("converte número para string", () => {
    expect(formatProfileBirthYear(1991)).toBe("1991");
    expect(formatProfileBirthYear(undefined)).toBe("");
  });
});
