import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("0003_birth_year_consent", () => {
  const sql = readFileSync(
    "src/db/migrations/0003_birth_year_consent.sql",
    "utf8",
  );

  it("copies the year before dropping the full birth date", () => {
    const updateAt = sql.indexOf('extract(year from "birth_date")');
    const dropAt = sql.indexOf('DROP COLUMN "birth_date"');
    expect(updateAt).toBeGreaterThan(-1);
    expect(dropAt).toBeGreaterThan(updateAt);
    expect(sql).not.toContain("birth_date date");
  });

  it("keeps consent_log append-only except for account cascade", () => {
    expect(sql).toContain("consent_log is append-only");
    expect(sql).toContain("pg_trigger_depth() > 1");
    expect(sql).toContain('REVOKE UPDATE, DELETE ON "consent_log" FROM PUBLIC');
  });
});
