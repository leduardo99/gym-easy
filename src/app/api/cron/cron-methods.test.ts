import { describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({
  connection: vi.fn(async () => undefined),
}));

vi.mock("@/db", () => ({
  getDb: vi.fn(() => ({})),
}));

vi.mock("@/features/consent/retention", () => ({
  purgeExpiredConsentProofs: vi.fn(),
}));

vi.mock("@/lib/ai/messages", () => ({
  purgeExpiredCoachMessages: vi.fn(),
  purgeExpiredAiGenerationLogs: vi.fn(),
}));

import { GET as getCoachPurge } from "./purge-coach-messages/route";
import { GET as getConsentPurge } from "./purge-consent-proofs/route";

describe("cron routes", () => {
  it("returns 405 for GET on every purge endpoint", async () => {
    for (const handler of [getCoachPurge, getConsentPurge]) {
      const response = await handler();
      expect(response.status).toBe(405);
      await expect(response.json()).resolves.toEqual({
        error: "method_not_allowed",
      });
    }
  });
});
