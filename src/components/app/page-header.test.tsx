import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageHeader } from "./page-header";

describe("PageHeader", () => {
  it("renders the title and description", () => {
    render(<PageHeader title="Gym Easy" description="Registro de treinos" />);

    expect(
      screen.getByRole("heading", { name: "Gym Easy" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Registro de treinos")).toBeInTheDocument();
  });
});
