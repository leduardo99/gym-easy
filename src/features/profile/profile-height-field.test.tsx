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
});

describe("formatProfileHeightCm", () => {
  it("converte número inteiro para string", () => {
    expect(formatProfileHeightCm(175)).toBe("175");
    expect(formatProfileHeightCm(undefined)).toBe("");
  });
});
