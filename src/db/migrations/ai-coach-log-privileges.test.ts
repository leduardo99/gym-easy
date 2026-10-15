import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("0012_ai_coach_log_privileges", () => {
  const sql = readFileSync(
    "src/db/migrations/0012_ai_coach_log_privileges.sql",
    "utf8",
  );

  it("revokes UPDATE and TRUNCATE on ai_generation_logs and UPDATE on coach_messages", () => {
    expect(sql).toContain(
      'REVOKE UPDATE, TRUNCATE ON "ai_generation_logs" FROM "gym_easy_app"',
    );
    expect(sql).toContain(
      'REVOKE UPDATE ON "coach_messages" FROM "gym_easy_app"',
    );
    expect(sql).not.toMatch(/CREATE ROLE/i);
    expect(sql).not.toMatch(/GRANT/i);
  });
});
