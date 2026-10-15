// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  createOnboardingBirthYearInputSchema,
  createProfileInputSchema,
} from "./schemas";
import { parseOnboardingBirthYearForm } from "@/features/profile/parse-profile-form";

const now = new Date("2026-10-14T12:00:00.000Z");

function form(entries: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
}

describe("validação de perfil no servidor (integração de schema)", () => {
  it("rejeita menor de 16 no perfil e no onboarding", () => {
    const profileSchema = createProfileInputSchema(now);
    const onboardingSchema = createOnboardingBirthYearInputSchema(now);
    const underAgeYear = String(now.getUTCFullYear() - 15);
    const input = parseOnboardingBirthYearForm(
      form({ birthYear: underAgeYear }),
    );

    expect(profileSchema.safeParse(input).success).toBe(false);
    expect(onboardingSchema.safeParse(input).success).toBe(false);
  });

  it("rejeita ano vazio no onboarding", () => {
    const onboardingSchema = createOnboardingBirthYearInputSchema(now);
    expect(
      onboardingSchema.safeParse(parseOnboardingBirthYearForm(form({})))
        .success,
    ).toBe(false);
  });
});
