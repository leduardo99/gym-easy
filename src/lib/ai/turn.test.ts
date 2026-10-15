import { describe, expect, it, vi } from "vitest";

import { createMemoryRateLimiter } from "@/features/auth/rate-limit";

import { PROFILE_INCOMPLETE_CTA, UNDER_AGE_RESPONSE } from "./copy";
import { createMemoryRedFlagLockStore } from "./cooldown";
import {
  PAID_ZDR_COACH_CHAT_VERSION_ID,
  PAID_ZDR_COACH_HEALTH_VERSION_ID,
} from "./paid-zdr-consent";
import {
  assessCoachTurn,
  handleCoachTurn,
  type CoachModelRequest,
} from "./turn";

const defaultCoachConsentVersions = {
  coachHealth: "coach_health-pt-BR-2026-10-15b",
  coachChat: "coach_chat-pt-BR-2026-10-15b",
};

const profile = {
  birthYear: 1991,
  sex: "female" as const,
  heightCm: 168,
  goal: "hypertrophy" as const,
  level: "intermediate" as const,
  daysPerWeek: 3,
  sessionMinutes: 45,
  trainingPlace: "full_gym" as const,
};

function harness() {
  const callModel = vi.fn(async (request: CoachModelRequest) => {
    if (!request.context) throw new Error("missing context");
    return { text: "Quatro séries de supino." };
  });
  const locks = createMemoryRedFlagLockStore();
  const logs: unknown[] = [];
  return {
    callModel,
    locks,
    logs,
    async run(message: string, now = new Date("2026-10-14T12:00:00.000Z")) {
      return handleCoachTurn({
        userId: "user-1",
        message,
        now,
        consents: {
          bodyData: "current",
          coachHealth: "current",
          coachChat: "current",
        },
        coachConsentVersions: defaultCoachConsentVersions,
        paidZdrConsentVersionSuffix: null,
        profile,
        weightKg: 64,
        limiter: createMemoryRateLimiter(() => now.getTime()),
        locks,
        callModel,
        log: (record) => logs.push(record),
        sleep: async () => undefined,
        models: ["alpha/example:free"],
        privacyMode: "zdr_only",
        pinnedProviders: [],
      });
    },
  };
}

describe("coach risk gate", () => {
  it("returns the fixed red-flag response and never calls the model", async () => {
    const gate = harness();
    const result = await gate.run("senti dor no peito no supino");

    expect(result.status).toBe("safety_block");
    expect(result.text).toMatch(/Pare o treino/);
    expect(result.text).not.toMatch(/peito no supino/);
    expect(gate.callModel).not.toHaveBeenCalled();
    expect(await gate.locks.get("user-1")).not.toBeNull();
    expect(JSON.stringify(gate.logs)).not.toContain("dor no peito");
    expect(JSON.stringify(gate.logs)).not.toContain("user-1");
    expect(gate.logs[0]).toMatchObject({ outcome: "safety_block" });
  });

  it("blocks plan changes during the 24 hour cooldown but still answers chat", async () => {
    const gate = harness();
    await gate.run("desmaiei depois do treino");
    gate.callModel.mockClear();

    const later = await gate.run(
      "troca meu treino de hoje",
      new Date("2026-10-14T15:00:00.000Z"),
    );

    expect(later.status).toBe("ok");
    expect(gate.callModel).toHaveBeenCalledTimes(1);
    expect(gate.callModel.mock.calls[0]?.[0]).toMatchObject({
      planChangesAllowed: false,
    });
  });

  it("lets a normal training question reach the model", async () => {
    const gate = harness();
    const result = await gate.run("como melhorar meu agachamento?");
    expect(result.status).toBe("ok");
    expect(gate.callModel).toHaveBeenCalledTimes(1);
    expect(result.policy).toBe("zdr");
  });

  it("returns profile_incomplete without birth year and links to the perfil field", async () => {
    const callModel = vi.fn(async () => ({ text: "não" }));
    const result = await handleCoachTurn({
      userId: "user-1",
      message: "qual treino eu faço?",
      now: new Date("2026-10-14T12:00:00.000Z"),
      consents: {
        bodyData: "current",
        coachHealth: "current",
        coachChat: "current",
      },
      coachConsentVersions: defaultCoachConsentVersions,
      paidZdrConsentVersionSuffix: null,
      profile: { ...profile, birthYear: null },
      weightKg: 64,
      limiter: createMemoryRateLimiter(),
      locks: createMemoryRedFlagLockStore(),
      callModel,
      log: () => undefined,
      sleep: async () => undefined,
      models: ["alpha/example:free"],
      privacyMode: "zdr_only",
      pinnedProviders: [],
    });

    expect(result.status).toBe("profile_incomplete");
    expect(result.httpStatus).toBe(400);
    expect(result.cta).toEqual(PROFILE_INCOMPLETE_CTA);
    expect(callModel).not.toHaveBeenCalled();
  });

  it("blocks the coach for users under the minimum age", async () => {
    const callModel = vi.fn(async () => ({ text: "não" }));
    const result = await handleCoachTurn({
      userId: "user-1",
      message: "qual treino eu faço?",
      now: new Date("2026-10-14T12:00:00.000Z"),
      consents: {
        bodyData: "current",
        coachHealth: "current",
        coachChat: "current",
      },
      coachConsentVersions: defaultCoachConsentVersions,
      paidZdrConsentVersionSuffix: null,
      profile: { ...profile, birthYear: 2010 },
      weightKg: 64,
      limiter: createMemoryRateLimiter(),
      locks: createMemoryRedFlagLockStore(),
      callModel,
      log: () => undefined,
      sleep: async () => undefined,
      models: ["alpha/example:free"],
      privacyMode: "zdr_only",
      pinnedProviders: [],
    });

    expect(result.status).toBe("safety_block");
    expect(result.text).toBe(UNDER_AGE_RESPONSE);
    expect(callModel).not.toHaveBeenCalled();
  });

  it("explains missing coach health when chat consent is still active", async () => {
    const callModel = vi.fn(async () => ({ text: "não" }));
    const result = await handleCoachTurn({
      userId: "user-1",
      message: "qual treino eu faço?",
      now: new Date("2026-10-14T12:00:00.000Z"),
      consents: {
        bodyData: "current",
        coachHealth: "missing",
        coachChat: "current",
      },
      coachConsentVersions: defaultCoachConsentVersions,
      paidZdrConsentVersionSuffix: null,
      profile,
      weightKg: 64,
      limiter: createMemoryRateLimiter(),
      locks: createMemoryRedFlagLockStore(),
      callModel,
      log: () => undefined,
      sleep: async () => undefined,
      models: ["alpha/example:free"],
      privacyMode: "zdr_only",
      pinnedProviders: [],
    });

    expect(result.status).toBe("consent_missing");
    expect(result.text).toMatch(/falta autorização de saúde/);
    expect(callModel).not.toHaveBeenCalled();
  });

  it("refuses to call the model without body and coach health consent", async () => {
    const callModel = vi.fn(async () => ({ text: "não" }));
    const result = await handleCoachTurn({
      userId: "user-1",
      message: "qual treino eu faço?",
      now: new Date("2026-10-14T12:00:00.000Z"),
      consents: {
        bodyData: "current",
        coachHealth: "current",
        coachChat: "missing",
      },
      coachConsentVersions: defaultCoachConsentVersions,
      paidZdrConsentVersionSuffix: null,
      profile,
      weightKg: 64,
      limiter: createMemoryRateLimiter(),
      locks: createMemoryRedFlagLockStore(),
      callModel,
      log: () => undefined,
      sleep: async () => undefined,
      models: ["alpha/example:free"],
      privacyMode: "zdr_only",
      pinnedProviders: [],
    });

    expect(result.status).toBe("consent_missing");
    expect(callModel).not.toHaveBeenCalled();
  });

  it("blocks the model when coach consent is still the previous version", async () => {
    const callModel = vi.fn(async () => ({ text: "não" }));
    const result = await handleCoachTurn({
      userId: "user-1",
      message: "qual treino eu faço?",
      now: new Date("2026-10-14T12:00:00.000Z"),
      consents: {
        bodyData: "current",
        coachHealth: "stale",
        coachChat: "stale",
      },
      coachConsentVersions: defaultCoachConsentVersions,
      paidZdrConsentVersionSuffix: null,
      profile,
      weightKg: 64,
      limiter: createMemoryRateLimiter(),
      locks: createMemoryRedFlagLockStore(),
      callModel,
      log: () => undefined,
      sleep: async () => undefined,
      models: ["alpha/example:free"],
      privacyMode: "zdr_only",
      pinnedProviders: [],
    });

    expect(result.status).toBe("reconsent_required");
    expect(result.httpStatus).toBe(403);
    expect(result.text).toMatch(/versão atual/);
    expect(callModel).not.toHaveBeenCalled();
  });

  it("blocks paid_zdr when coach consents are still on -15b", async () => {
    const callModel = vi.fn(async () => ({ text: "ok" }));
    const turn = await assessCoachTurn({
      userId: "user-1",
      message: "como treinar?",
      now: new Date("2026-10-14T12:00:00.000Z"),
      consents: {
        bodyData: "current",
        coachHealth: "current",
        coachChat: "current",
      },
      coachConsentVersions: defaultCoachConsentVersions,
      paidZdrConsentVersionSuffix: "2026-10-15c",
      profile,
      weightKg: 64,
      limiter: createMemoryRateLimiter(),
      locks: createMemoryRedFlagLockStore(),
      models: ["google/gemma-4-31b-it"],
      privacyMode: "paid_zdr",
      pinnedProviders: ["deepinfra"],
      callModel,
      log: () => undefined,
      sleep: async () => undefined,
    });

    expect(turn.action).toBe("respond");
    if (turn.action === "respond") {
      expect(turn.result.status).toBe("reconsent_required");
    }
    expect(callModel).not.toHaveBeenCalled();
  });

  it("allows paid_zdr generation when coach consents are on -15c", async () => {
    const callModel = vi.fn(async () => ({ text: "ok" }));
    const turn = await assessCoachTurn({
      userId: "user-1",
      message: "como treinar?",
      now: new Date("2026-10-14T12:00:00.000Z"),
      consents: {
        bodyData: "current",
        coachHealth: "current",
        coachChat: "current",
      },
      coachConsentVersions: {
        coachHealth: PAID_ZDR_COACH_HEALTH_VERSION_ID,
        coachChat: PAID_ZDR_COACH_CHAT_VERSION_ID,
      },
      paidZdrConsentVersionSuffix: "2026-10-15c",
      profile,
      weightKg: 64,
      limiter: createMemoryRateLimiter(),
      locks: createMemoryRedFlagLockStore(),
      models: ["google/gemma-4-31b-it"],
      privacyMode: "paid_zdr",
      pinnedProviders: ["deepinfra"],
      callModel,
      log: () => undefined,
      sleep: async () => undefined,
    });

    expect(turn.action).toBe("generate");
    expect(callModel).not.toHaveBeenCalled();
  });
});
