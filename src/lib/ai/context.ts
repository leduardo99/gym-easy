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

/** `current` é a versão publicada. `stale` é um grant antigo, como a -14c. */
export type ConsentFreshness = "current" | "stale" | "missing";

export type CoachConsents = {
  bodyData: ConsentFreshness;
  coachHealth: ConsentFreshness;
  coachChat: ConsentFreshness;
};

export function coachConsentStatus(
  consents: CoachConsents,
): "ok" | "reconsent_required" | "consent_missing" {
  const values = [consents.bodyData, consents.coachHealth, consents.coachChat];
  if (values.includes("stale")) return "reconsent_required";
  if (values.some((value) => value !== "current")) return "consent_missing";
  return "ok";
}

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
  if (coachConsentStatus(input.consents) !== "ok") {
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
