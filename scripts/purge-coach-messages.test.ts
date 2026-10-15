// @vitest-environment node
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { postPurgeCoachMessages } from "./purge-coach-messages.mjs";

const secret = "ci-cron-secret-value-32-characters-ok";

describe("purge-coach-messages", () => {
  it("exits 1 when CRON_SECRET is missing", () => {
    const result = spawnSync(
      process.execPath,
      ["scripts/purge-coach-messages.mjs"],
      {
        encoding: "utf8",
        env: { PATH: process.env.PATH, NODE_ENV: "test" },
      },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("CRON_SECRET is required");
  });

  it("posts to localhost with the bearer secret", async () => {
    const seen: { url?: string; authorization?: string; method?: string } = {};
    const code = await postPurgeCoachMessages({
      secret,
      port: "3000",
      fetchImpl: async (url, init) => {
        seen.url = String(url);
        seen.method = init?.method;
        const headers = new Headers(init?.headers);
        seen.authorization = headers.get("authorization") ?? undefined;
        return new Response(null, { status: 401 });
      },
    });

    expect(code).toBe(1);
    expect(seen.url).toBe(
      "http://localhost:3000/api/cron/purge-coach-messages",
    );
    expect(seen.method).toBe("POST");
    expect(seen.authorization).toBe(`Bearer ${secret}`);
  });
});
