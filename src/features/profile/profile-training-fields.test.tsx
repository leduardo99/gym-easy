import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ProfileTrainingFields } from "./profile-training-fields";

afterEach(() => {
  cleanup();
});

describe("ProfileTrainingFields", () => {
  it("preenche os campos com o perfil guardado", () => {
    render(
      <ProfileTrainingFields
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
    expect(screen.getByLabelText("Altura (cm)")).toHaveValue("180");
    expect(screen.getByLabelText("Sexo")).toHaveValue("male");
    expect(screen.getByLabelText("Objetivo")).toHaveValue("strength");
    expect(screen.getByLabelText("Nível")).toHaveValue("beginner");
    expect(screen.getByLabelText("Dias por semana")).toHaveValue("3");
    expect(screen.getByLabelText("Duração da sessão (min)")).toHaveValue("45");
    expect(screen.getByLabelText("Onde treina")).toHaveValue("home");
  });
});
