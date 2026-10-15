import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Switch } from "./switch";

afterEach(() => {
  cleanup();
});

describe("Switch", () => {
  it("expõe área de toque expandida com after:-inset", () => {
    render(<Switch aria-label="teste" />);
    const control = screen.getByRole("switch", { name: "teste" });
    expect(control.className).toMatch(/after:-inset-x-3/);
    expect(control.className).toMatch(/after:-inset-y-2/);
  });
});
