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

import { GET, POST } from "./route";

const cronSecret = "cron-secret-value-32-characters-ok";

describe("POST /api/cron/purge-consent-proofs", () => {
  beforeEach(() => {
    execute.mockReset();
    delete process.env.CRON_SECRET;
  });

  it("rejects a call without the cron secret", async () => {
    const response = await POST(
      new Request("http://localhost/api/cron/purge-consent-proofs", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
    expect(execute).not.toHaveBeenCalled();
  });

  it("rejects a short secret, a wrong bearer, and a secret in the query", async () => {
    process.env.CRON_SECRET = "short-secret";
    const short = await POST(
      new Request("http://localhost/api/cron/purge-consent-proofs", {
        method: "POST",
        headers: { authorization: "Bearer short-secret" },
      }),
    );
    expect(short.status).toBe(401);

    process.env.CRON_SECRET = cronSecret;
    const wrong = await POST(
      new Request("http://localhost/api/cron/purge-consent-proofs", {
        method: "POST",
        headers: { authorization: "Bearer not-the-cron-secret-value-at-all" },
      }),
    );
    expect(wrong.status).toBe(401);

    const query = await POST(
      new Request(
        `http://localhost/api/cron/purge-consent-proofs?token=${cronSecret}`,
        {
          method: "POST",
          headers: { authorization: `Bearer ${cronSecret}` },
        },
      ),
    );
    expect(query.status).toBe(401);
    expect(execute).not.toHaveBeenCalled();
  });

  it("purges expired proofs when the bearer secret matches", async () => {
    process.env.CRON_SECRET = cronSecret;
    execute.mockResolvedValue([{ removed: 2 }]);

    const response = await POST(
      new Request("http://localhost/api/cron/purge-consent-proofs", {
        method: "POST",
        headers: { authorization: `Bearer ${cronSecret}` },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ removed: 2 });
    const statement = execute.mock.calls[0]?.[0] as {
      queryChunks?: unknown[];
    };
    expect(JSON.stringify(statement.queryChunks)).toMatch(
      /purge_consent_proofs/i,
    );
    expect(JSON.stringify(statement.queryChunks)).not.toMatch(/p_cutoff|2026/);
  });

  it("does not purge on GET", async () => {
    process.env.CRON_SECRET = cronSecret;
    const response = await GET();

    expect(response.status).toBe(405);
    expect(execute).not.toHaveBeenCalled();
  });
});
