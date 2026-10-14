import { beforeEach, describe, expect, it, vi } from "vitest";

const execute = vi.fn();

vi.mock("next/server", () => ({
  connection: vi.fn(async () => undefined),
}));

vi.mock("@/db", () => ({
  getDb: vi.fn(() => ({
    execute,
  })),
}));

import { GET } from "./route";

describe("GET /api/cron/purge-consent-proofs", () => {
  beforeEach(() => {
    execute.mockReset();
    delete process.env.CRON_SECRET;
  });

  it("rejects a call without the cron secret", async () => {
    const response = await GET(
      new Request("http://localhost/api/cron/purge-consent-proofs"),
    );

    expect(response.status).toBe(401);
    expect(execute).not.toHaveBeenCalled();
  });

  it("purges expired proofs when the bearer secret matches", async () => {
    process.env.CRON_SECRET = "cron-secret";
    execute.mockResolvedValue([{ removed: 2 }]);

    const response = await GET(
      new Request("http://localhost/api/cron/purge-consent-proofs", {
        headers: { authorization: "Bearer cron-secret" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ removed: 2 });
    const statement = execute.mock.calls[0]?.[0] as {
      queryChunks?: unknown[];
    };
    expect(JSON.stringify(statement.queryChunks)).toMatch(
      /purge_expired_consent_proofs/i,
    );
  });
});
