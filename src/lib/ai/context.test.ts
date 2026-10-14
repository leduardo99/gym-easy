import { describe, expect, it } from "vitest";

import { buildCoachContext } from "./context";

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
      consents: { bodyData: true, coachHealth: true },
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
      consents: { bodyData: false, coachHealth: true },
      now: new Date("2026-10-14T00:00:00.000Z"),
    });
    expect(built).toEqual({ ok: false, reason: "consent_missing" });
  });
});
