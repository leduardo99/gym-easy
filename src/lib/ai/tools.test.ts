import { describe, expect, it, vi } from "vitest";

import { createMemoryProposalStore } from "./proposals";
import { executeGetHistory, executeProposePlanChange } from "./tools";

describe("coach tools", () => {
  it("reads history for the session user and ignores a client user id", async () => {
    const read = vi.fn(async () => [
      {
        date: "2026-10-10",
        sets: [{ weight_kg: 40, reps: 8, rpe: null }],
      },
    ]);

    const result = await executeGetHistory(
      { exercise_id: "supino_reto_com_halteres", days: 30 },
      { userId: "session-user", read, now: new Date("2026-10-14T00:00:00Z") },
    );

    expect(read).toHaveBeenCalledWith(
      "session-user",
      "supino_reto_com_halteres",
      30,
      expect.any(Date),
    );
    expect(result).toMatchObject({ sessions: [{ date: "2026-10-10" }] });
    await expect(
      executeGetHistory(
        {
          exercise_id: "supino_reto_com_halteres",
          days: 30,
          user_id: "other-user",
        },
        { userId: "session-user", read, now: new Date() },
      ),
    ).rejects.toThrow(/invalid/);
  });

  it("returns a proposal and does not apply it", async () => {
    const store = createMemoryProposalStore();
    const apply = vi.fn();

    const result = await executeProposePlanChange(
      {
        type: "change_volume",
        sets: 3,
        rationale: "Mantém o volume do iniciante.",
      },
      {
        userId: "session-user",
        planChangesAllowed: true,
        proposals: store,
      },
    );

    expect(apply).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: "proposed",
      applied: false,
      requiresConfirmation: true,
    });
    expect(store.proposals).toHaveLength(1);
    expect(store.proposals[0]?.status).toBe("proposed");
  });

  it("refuses a proposal while the red-flag cooldown is active", async () => {
    const store = createMemoryProposalStore();
    const result = await executeProposePlanChange(
      { type: "deload", rationale: "Semana leve." },
      {
        userId: "session-user",
        planChangesAllowed: false,
        proposals: store,
      },
    );

    expect(result).toMatchObject({
      status: "blocked",
      applied: false,
    });
    expect(store.proposals).toHaveLength(0);
  });
});
