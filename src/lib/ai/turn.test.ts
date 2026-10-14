import { describe, expect, it, vi } from "vitest";

import { createMemoryRateLimiter } from "@/features/auth/rate-limit";

import { createMemoryRedFlagLockStore } from "./cooldown";
import { handleCoachTurn, type CoachModelRequest } from "./turn";

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
        consents: { bodyData: true, coachHealth: true },
        profile,
        weightKg: 64,
        limiter: createMemoryRateLimiter(() => now.getTime()),
        locks,
        callModel,
        log: (record) => logs.push(record),
        sleep: async () => undefined,
        models: ["alpha/example:free"],
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

  it("refuses to call the model without body and coach health consent", async () => {
    const callModel = vi.fn(async () => ({ text: "não" }));
    const result = await handleCoachTurn({
      userId: "user-1",
      message: "qual treino eu faço?",
      now: new Date("2026-10-14T12:00:00.000Z"),
      consents: { bodyData: true, coachHealth: false },
      profile,
      weightKg: 64,
      limiter: createMemoryRateLimiter(),
      locks: createMemoryRedFlagLockStore(),
      callModel,
      log: () => undefined,
      sleep: async () => undefined,
      models: ["alpha/example:free"],
    });

    expect(result.status).toBe("consent_missing");
    expect(callModel).not.toHaveBeenCalled();
  });
});
