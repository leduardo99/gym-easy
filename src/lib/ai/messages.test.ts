import { describe, expect, it } from "vitest";

import {
  COACH_CHAT_RETENTION_DAYS,
  coachChatRetentionCutoff,
} from "./messages";

describe("coach chat retention", () => {
  it("cuts conversations off 90 days before now", () => {
    const now = new Date("2026-10-14T03:15:00.000Z");
    const cutoff = coachChatRetentionCutoff(now);
    expect(COACH_CHAT_RETENTION_DAYS).toBe(90);
    expect(now.getTime() - cutoff.getTime()).toBe(90 * 24 * 60 * 60 * 1000);
  });
});
