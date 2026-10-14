import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({
  connection: vi.fn(async () => undefined),
}));

vi.mock("@/db", () => ({
  getDb: vi.fn(() => ({})),
}));

vi.mock("@/lib/ai/messages", () => ({
  purgeExpiredCoachMessages: vi.fn(),
  purgeExpiredAiGenerationLogs: vi.fn(),
}));

import {
  purgeExpiredAiGenerationLogs,
  purgeExpiredCoachMessages,
} from "@/lib/ai/messages";

import { GET, POST } from "./route";

const cronSecret = "cron-secret-value-32-characters-ok";

describe("POST /api/cron/purge-coach-messages", () => {
  beforeEach(() => {
    vi.mocked(purgeExpiredCoachMessages).mockReset();
    vi.mocked(purgeExpiredAiGenerationLogs).mockReset();
    delete process.env.CRON_SECRET;
  });

  it("rejects GET and a missing secret", async () => {
    expect((await GET()).status).toBe(405);
    const response = await POST(
      new Request("http://localhost/api/cron/purge-coach-messages", {
        method: "POST",
      }),
    );
    expect(response.status).toBe(401);
    expect(purgeExpiredCoachMessages).not.toHaveBeenCalled();
  });

  it("rejects a wrong bearer of the same length", async () => {
    process.env.CRON_SECRET = cronSecret;
    const wrong = "x".repeat(cronSecret.length);
    const response = await POST(
      new Request("http://localhost/api/cron/purge-coach-messages", {
        method: "POST",
        headers: { authorization: `Bearer ${wrong}` },
      }),
    );
    expect(response.status).toBe(401);
    expect(wrong.length).toBe(cronSecret.length);
    expect(purgeExpiredCoachMessages).not.toHaveBeenCalled();
  });

  it("purges chat and generation logs when the bearer matches", async () => {
    process.env.CRON_SECRET = cronSecret;
    vi.mocked(purgeExpiredCoachMessages).mockResolvedValue(4);
    vi.mocked(purgeExpiredAiGenerationLogs).mockResolvedValue(2);
    const response = await POST(
      new Request("http://localhost/api/cron/purge-coach-messages", {
        method: "POST",
        headers: { authorization: `Bearer ${cronSecret}` },
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ removed: 4, logs: 2 });
  });
});
