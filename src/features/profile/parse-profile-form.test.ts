import { describe, expect, it } from "vitest";

import { createProfileInputSchema } from "@/features/training/schemas";

import {
  parseProfileFormData,
  profileFormErrorFlag,
} from "./parse-profile-form";

const schema = createProfileInputSchema(new Date("2026-10-14T12:00:00Z"));

function form(entries: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
}

describe("parseProfileFormData", () => {
  it("mapeia campos preenchidos para o schema do perfil", () => {
    const parsed = schema.safeParse(
      parseProfileFormData(
        form({
          birthYear: "1992",
          sex: "female",
          heightCm: "175",
          goal: "health",
          level: "intermediate",
          daysPerWeek: "4",
          sessionMinutes: "60",
          trainingPlace: "full_gym",
        }),
      ),
    );

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toMatchObject({
        birthYear: 1992,
        sex: "female",
        heightCm: 175,
        goal: "health",
        level: "intermediate",
        daysPerWeek: 4,
        sessionMinutes: 60,
        trainingPlace: "full_gym",
      });
    }
  });

  it("trata campos vazios como null", () => {
    const parsed = schema.safeParse(parseProfileFormData(form({})));
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.birthYear).toBeNull();
      expect(parsed.data.heightCm).toBeNull();
    }
  });

  it("rejeita ano de nascimento inválido", () => {
    const parsed = schema.safeParse(
      parseProfileFormData(form({ birthYear: "2010" })),
    );
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(profileFormErrorFlag(parsed)).toBe("nascimento");
    }
  });

  it("rejeita altura fora da faixa", () => {
    const parsed = schema.safeParse(
      parseProfileFormData(form({ heightCm: "90" })),
    );
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(profileFormErrorFlag(parsed)).toBe("altura");
    }
  });
});
