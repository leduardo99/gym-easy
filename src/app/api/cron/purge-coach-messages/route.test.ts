import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({
  connection: vi.fn(async () => undefined),
}));

vi.mock("@/db", () => ({
  getDb: vi.fn(() => ({})),
}));

vi.mock("@/lib/ai/messages", () => ({
  purgeExpiredCoachMessages: vi.fn(),
}));

import { purgeExpiredCoachMessages } from "@/lib/ai/messages";

import { GET } from "./route";

describe("GET /api/cron/purge-coach-messages", () => {
  beforeEach(() => {
    vi.mocked(purgeExpiredCoachMessages).mockReset();
    delete process.env.CRON_SECRET;
  });

  it("rejects a call without the cron secret", async () => {
    const response = await GET(
      new Request("http://localhost/api/cron/purge-coach-messages"),
    );
    expect(response.status).toBe(401);
    expect(purgeExpiredCoachMessages).not.toHaveBeenCalled();
  });

  it("purges messages older than the retention window when the secret matches", async () => {
    process.env.CRON_SECRET = "cron-secret";
    vi.mocked(purgeExpiredCoachMessages).mockResolvedValue(4);
    const response = await GET(
      new Request("http://localhost/api/cron/purge-coach-messages", {
        headers: { authorization: "Bearer cron-secret" },
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ removed: 4 });
    expect(purgeExpiredCoachMessages).toHaveBeenCalledTimes(1);
  });
});
