import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("0011_ai_foundation", () => {
  const sql = readFileSync("src/db/migrations/0011_ai_foundation.sql", "utf8");

  it("adds coach_chat and keeps generation logs free of message text", () => {
    expect(sql).toContain(
      `ALTER TYPE "public"."consent_purpose" ADD VALUE 'coach_chat'`,
    );
    const logs = sql.slice(
      sql.indexOf('CREATE TABLE "ai_generation_logs"'),
      sql.indexOf('CREATE TABLE "coach_messages"'),
    );
    expect(logs).not.toMatch(/content|prompt|message|health|birth/i);
    expect(sql).not.toMatch(/GRANT|DEFAULT PRIVILEGES/i);
  });

  it("cascades coach rows when the user is deleted", () => {
    expect(sql).toContain(
      '"coach_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade',
    );
    expect(sql).toContain(
      '"coach_red_flag_locks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade',
    );
    expect(sql).toContain(
      '"plan_change_proposals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade',
    );
  });
});
