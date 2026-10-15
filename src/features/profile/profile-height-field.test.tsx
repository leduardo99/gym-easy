import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  formatProfileHeightCm,
  ProfileHeightField,
} from "./profile-height-field";

afterEach(() => {
  cleanup();
});

describe("ProfileHeightField", () => {
  it("mostra a altura guardada no defaultValue do campo", () => {
    render(<ProfileHeightField heightCm={175} />);

    expect(screen.getByLabelText("Altura (cm)")).toHaveValue("175");
  });

  it("deixa o campo vazio sem altura guardada", () => {
    render(<ProfileHeightField heightCm={null} />);

    expect(screen.getByLabelText("Altura (cm)")).toHaveValue("");
  });

  it("marca o campo como só leitura sem consentimento", () => {
    render(<ProfileHeightField heightCm={175} disabled />);
    const input = screen.getByLabelText("Altura (cm)");
    expect(input).toHaveAttribute("readonly");
    expect(input).toHaveAttribute("name", "heightCm");
  });
});

describe("formatProfileHeightCm", () => {
  it("converte número inteiro para string", () => {
    expect(formatProfileHeightCm(175)).toBe("175");
    expect(formatProfileHeightCm(undefined)).toBe("");
  });
});
