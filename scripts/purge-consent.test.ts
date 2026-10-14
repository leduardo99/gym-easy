// @vitest-environment node
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { postPurge } from "./purge-consent.mjs";

const secret = "ci-cron-secret-value-32-characters-ok";

describe("purge-consent", () => {
  it("exits 1 when CRON_SECRET is missing", () => {
    const result = spawnSync(process.execPath, ["scripts/purge-consent.mjs"], {
      encoding: "utf8",
      env: { PATH: process.env.PATH, NODE_ENV: "test" },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("CRON_SECRET is required");
  });

  it("posts to localhost with the bearer secret and returns 1 on an error status", async () => {
    const seen: { url?: string; authorization?: string; method?: string } = {};
    const code = await postPurge({
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
      "http://localhost:3000/api/cron/purge-consent-proofs",
    );
    expect(seen.method).toBe("POST");
    expect(seen.authorization).toBe(`Bearer ${secret}`);
  });
});
