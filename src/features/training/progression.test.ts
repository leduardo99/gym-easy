import { describe, expect, it } from "vitest";

import { summarizeLoadProgression } from "./progression";

const t1 = new Date("2026-10-01T18:00:00.000Z");
const t2 = new Date("2026-10-08T18:00:00.000Z");
const t3 = new Date("2026-10-14T18:00:00.000Z");

describe("summarizeLoadProgression", () => {
  it("orders sessions by time and flags a heavier load as a personal record", () => {
    const points = summarizeLoadProgression([
      { sessionId: "s1", finishedAt: t1, loadKg: "60.0", reps: 10 },
      { sessionId: "s1", finishedAt: t1, loadKg: "60.0", reps: 8 },
      { sessionId: "s2", finishedAt: t2, loadKg: "50.0", reps: 10 },
      { sessionId: "s3", finishedAt: t3, loadKg: "62.5", reps: 5 },
    ]);

    expect(points).toEqual([
      {
        sessionId: "s1",
        finishedAt: t1,
        maxLoadKg: "60.0",
        volumeKg: "1080.0",
        isPersonalRecord: true,
      },
      {
        sessionId: "s2",
        finishedAt: t2,
        maxLoadKg: "50.0",
        volumeKg: "500.0",
        isPersonalRecord: false,
      },
      {
        sessionId: "s3",
        finishedAt: t3,
        maxLoadKg: "62.5",
        volumeKg: "312.5",
        isPersonalRecord: true,
      },
    ]);
  });

  it("ignores loads with zero reps when deciding the record", () => {
    const points = summarizeLoadProgression([
      { sessionId: "s1", finishedAt: t1, loadKg: "40.0", reps: 8 },
      { sessionId: "s2", finishedAt: t2, loadKg: "100.0", reps: 0 },
      { sessionId: "s2", finishedAt: t2, loadKg: "40.0", reps: 8 },
    ]);

    expect(points[1]?.maxLoadKg).toBe("40.0");
    expect(points[1]?.isPersonalRecord).toBe(false);
    expect(points[1]?.volumeKg).toBe("320.0");
  });
});
