import type { Goal, Sex, TrainingLevel, TrainingPlace } from "@/db/domain";
import { ageBand } from "@/features/profile/age";

import { coachContextSchema, type CoachContext } from "./schemas";

export type CoachProfileSource = {
  birthYear: number | null;
  sex: Sex | null;
  heightCm: number | null;
  goal: Goal | null;
  level: TrainingLevel | null;
  daysPerWeek: number | null;
  sessionMinutes: number | null;
  trainingPlace: TrainingPlace | null;
};

/**
 * Consentimentos já gravados em `consent_log`.
 * `coach_chat` entra aqui quando a LED-53 adicionar o valor ao enum.
 */
export type CoachConsents = {
  bodyData: boolean;
  coachHealth: boolean;
};

export type CoachContextResult =
  | { ok: true; context: CoachContext }
  | {
      ok: false;
      reason: "consent_missing" | "profile_incomplete" | "under_age";
    };

export function buildCoachContext(input: {
  profile: CoachProfileSource;
  weightKg: number | null;
  consents: CoachConsents;
  now: Date;
}): CoachContextResult {
  if (!input.consents.bodyData || !input.consents.coachHealth) {
    return { ok: false, reason: "consent_missing" };
  }
  if (input.profile.birthYear === null) {
    return { ok: false, reason: "profile_incomplete" };
  }

  const band = ageBand(input.profile.birthYear, input.now);
  if (band === null) return { ok: false, reason: "under_age" };

  const context = coachContextSchema.parse({
    ageBand: band,
    sex: input.profile.sex,
    heightCm: input.profile.heightCm,
    weightKg: input.weightKg,
    goal: input.profile.goal,
    experienceLevel: input.profile.level,
    daysPerWeek: input.profile.daysPerWeek,
    sessionMinutes: input.profile.sessionMinutes,
    equipment: input.profile.trainingPlace,
  });

  return { ok: true, context };
}
