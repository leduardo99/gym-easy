import { describe, expect, it } from "vitest";

import { buildCoachContext, coachConsentStatus } from "./context";

describe("buildCoachContext", () => {
  it("sends the age band and omits birth year, name, email and ids", () => {
    const built = buildCoachContext({
      profile: {
        birthYear: 1991,
        sex: "female",
        heightCm: 168,
        goal: "hypertrophy",
        level: "intermediate",
        daysPerWeek: 3,
        sessionMinutes: 45,
        trainingPlace: "full_gym",
      },
      weightKg: 64.5,
      consents: {
        bodyData: "current",
        coachHealth: "current",
        coachChat: "current",
      },
      now: new Date("2026-10-14T00:00:00.000Z"),
    });

    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const json = JSON.stringify(built.context);
    expect(built.context.ageBand).toBe("30-39");
    expect(json).not.toContain("1991");
    expect(json).not.toMatch(/birth|email|name|userId|user_id/i);
    expect(Object.keys(built.context)).not.toContain("birthYear");
  });

  it("bloqueia o coach sem ano de nascimento", () => {
    const built = buildCoachContext({
      profile: {
        birthYear: null,
        sex: "female",
        heightCm: 170,
        goal: "health",
        level: "beginner",
        daysPerWeek: 3,
        sessionMinutes: 45,
        trainingPlace: "home",
      },
      weightKg: null,
      consents: {
        bodyData: "current",
        coachHealth: "current",
        coachChat: "current",
      },
      now: new Date("2026-10-14T00:00:00.000Z"),
    });
    expect(built).toEqual({ ok: false, reason: "profile_incomplete" });
  });

  it("does not build context without both current consents", () => {
    const built = buildCoachContext({
      profile: {
        birthYear: 1991,
        sex: null,
        heightCm: null,
        goal: null,
        level: null,
        daysPerWeek: null,
        sessionMinutes: null,
        trainingPlace: null,
      },
      weightKg: null,
      consents: {
        bodyData: "missing",
        coachHealth: "current",
        coachChat: "current",
      },
      now: new Date("2026-10-14T00:00:00.000Z"),
    });
    expect(built).toEqual({ ok: false, reason: "consent_missing" });
  });
});

describe("coachConsentStatus", () => {
  it("accepts only the current published grants", () => {
    expect(
      coachConsentStatus({
        bodyData: "current",
        coachHealth: "current",
        coachChat: "current",
      }),
    ).toBe("ok");
  });

  it("asks for reconsent when coach_health or coach_chat is still the previous version", () => {
    expect(
      coachConsentStatus({
        bodyData: "current",
        coachHealth: "stale",
        coachChat: "current",
      }),
    ).toBe("reconsent_required");
    expect(
      coachConsentStatus({
        bodyData: "current",
        coachHealth: "current",
        coachChat: "stale",
      }),
    ).toBe("reconsent_required");
  });

  it("reports a missing grant when nothing was accepted", () => {
    expect(
      coachConsentStatus({
        bodyData: "current",
        coachHealth: "current",
        coachChat: "missing",
      }),
    ).toBe("consent_missing");
  });
});
