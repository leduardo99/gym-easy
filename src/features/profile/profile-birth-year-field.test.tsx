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
});

describe("formatProfileBirthYear", () => {
  it("converte número para string", () => {
    expect(formatProfileBirthYear(1991)).toBe("1991");
    expect(formatProfileBirthYear(undefined)).toBe("");
  });
});
