import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PROFILE_COACH_OPTIONAL_HINT } from "./profile-copy";
import { ProfilePerfilFields } from "./profile-perfil-fields";

afterEach(() => {
  cleanup();
});

describe("ProfilePerfilFields", () => {
  it("preenche o ano e os campos opcionais com o perfil guardado", () => {
    render(
      <ProfilePerfilFields
        profile={{
          birthYear: 1990,
          sex: "male",
          heightCm: 180,
          goal: "strength",
          level: "beginner",
          daysPerWeek: 3,
          sessionMinutes: 45,
          trainingPlace: "home",
        }}
      />,
    );

    expect(screen.getByLabelText("Ano de nascimento")).toHaveValue("1990");
    expect(screen.getByText(PROFILE_COACH_OPTIONAL_HINT)).toBeInTheDocument();
    expect(screen.getByLabelText("Altura (cm)")).toHaveValue("180");
  });
});
