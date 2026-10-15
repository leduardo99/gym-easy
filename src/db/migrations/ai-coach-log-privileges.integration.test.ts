import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { databaseUrlForRole, isLocalDatabaseUrl } from "@/db/driver";
import * as schema from "@/db/schema";

const databaseUrl = process.env.DATABASE_URL ?? "";
const runIntegration =
  databaseUrl.length > 0 && isLocalDatabaseUrl(databaseUrl);

const userHash = "a".repeat(64);

describe.skipIf(!runIntegration)("0012 ai coach log privileges", () => {
  const sql = postgres(databaseUrl, { max: 1 });

  beforeAll(async () => {
    const migrator = postgres(
      databaseUrlForRole(databaseUrl, "gym_easy_migrator", "migrator"),
      { max: 1 },
    );
    try {
      await migrate(drizzle({ client: migrator, schema }), {
        migrationsFolder: "src/db/migrations",
      });
    } finally {
      await migrator.end({ timeout: 5 });
    }
  });

  afterAll(async () => {
    await sql`reset role`;
    await sql.end({ timeout: 5 });
  });

  it("nega UPDATE e TRUNCATE em ai_generation_logs à gym_easy_app", async () => {
    await sql`set role gym_easy_app`;
    const inserted = await sql`
      insert into "ai_generation_logs" (
        "request_id",
        "user_id_hash",
        "latency_ms",
        "outcome"
      )
      values ('req-priv-0012', ${userHash}, 1, 'ok')
      returning "id"
    `;
    const id = inserted[0]?.id;
    expect(id).toBeTruthy();

    await expect(
      sql`update "ai_generation_logs" set "outcome" = "outcome" where "id" = ${id}`,
    ).rejects.toSatisfy(isInsufficientPrivilege);
    await expect(sql`truncate "ai_generation_logs"`).rejects.toSatisfy(
      isInsufficientPrivilege,
    );

    await sql`delete from "ai_generation_logs" where "id" = ${id}`;
    await sql`reset role`;
  });

  it("nega UPDATE mas permite DELETE em coach_messages à gym_easy_app", async () => {
    const userId = crypto.randomUUID();
    await sql`
      insert into "users" ("id", "name", "email", "password_hash")
      values (
        ${userId}::uuid,
        'Privilégios',
        ${`${userId}@example.com`},
        'hash'
      )
    `;

    await sql`set role gym_easy_app`;
    const inserted = await sql`
      insert into "coach_messages" ("user_id", "role", "content")
      values (${userId}::uuid, 'user', 'olá')
      returning "id"
    `;
    const messageId = inserted[0]?.id;
    expect(messageId).toBeTruthy();

    await expect(
      sql`update "coach_messages" set "content" = "content" where "id" = ${messageId}`,
    ).rejects.toSatisfy(isInsufficientPrivilege);

    await sql`delete from "coach_messages" where "id" = ${messageId}`;
    await sql`reset role`;

    await sql`delete from "users" where "id" = ${userId}::uuid`;
  });

  it("permite DELETE em plan_change_proposals à gym_easy_app", async () => {
    const userId = crypto.randomUUID();
    await sql`
      insert into "users" ("id", "name", "email", "password_hash")
      values (
        ${userId}::uuid,
        'Propostas',
        ${`${userId}@example.com`},
        'hash'
      )
    `;

    await sql`set role gym_easy_app`;
    const inserted = await sql`
      insert into "plan_change_proposals" ("user_id", "status", "payload")
      values (
        ${userId}::uuid,
        'rejected',
        ${JSON.stringify({ type: "deload", rationale: "teste" })}::jsonb
      )
      returning "id"
    `;
    const proposalId = inserted[0]?.id;
    expect(proposalId).toBeTruthy();

    await sql`delete from "plan_change_proposals" where "id" = ${proposalId}`;
    await sql`reset role`;

    await sql`delete from "users" where "id" = ${userId}::uuid`;
  });
});

function isInsufficientPrivilege(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "42501"
  );
}
