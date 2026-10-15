import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("0013_ai_generation_log_privacy", () => {
  const sql = readFileSync(
    "src/db/migrations/0013_ai_generation_log_privacy.sql",
    "utf8",
  );

  it("adds served_with_zdr and extends allowed log outcomes", () => {
    expect(sql).toContain('"served_with_zdr" boolean');
    expect(sql).toContain("provider_policy_unavailable");
    expect(sql).toContain("coach_unavailable");
    expect(sql).toContain("plan_unavailable");
    expect(sql).not.toMatch(/GRANT|DEFAULT PRIVILEGES/i);
  });
});
