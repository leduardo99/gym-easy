import { spawnSync } from "node:child_process";

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { isLocalDatabaseUrl } from "@/db/driver";
import { repairPostgresJsSerializers } from "@/db/postgres";
import * as schema from "@/db/schema";
import { consentLog, users } from "@/db/schema";

import { CONSENT_KEY_VERSION, consentSubjectPseudonym } from "./pseudonym";

const databaseUrl = process.env.DATABASE_URL ?? "";
const runIntegration =
  databaseUrl.length > 0 && isLocalDatabaseUrl(databaseUrl);

describe.skipIf(!runIntegration)("consent retention privileges", () => {
  const sql = postgres(databaseUrl, { max: 1 });
  const db = drizzle({ client: sql, schema });
  repairPostgresJsSerializers(sql);

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "src/db/migrations" });
  });

  afterAll(async () => {
    await sql`reset role`;
    await sql.end({ timeout: 5 });
  });

  async function insertUser(name: string): Promise<string> {
    const id = crypto.randomUUID();
    await db.insert(users).values({
      id,
      name,
      email: `${id}@example.com`,
      passwordHash: "hash",
    });
    await db.insert(consentLog).values({
      userId: id,
      purpose: "body_data",
      action: "granted",
      version: "2026-10-14c",
      textSha256: "a".repeat(64),
      source: "onboarding",
    });
    return id;
  }

  it("nega set_config com delete ou update à gym_easy_app e deixa delete_account e o purge de 3 anos", async () => {
    const blockedId = await insertUser("Bloqueada");
    const expiredId = await insertUser("Expirada");
    const recentId = await insertUser("Recente");
    const expiredPseudonym = consentSubjectPseudonym(expiredId, "k".repeat(32));
    const recentPseudonym = consentSubjectPseudonym(recentId, "k".repeat(32));

    await sql`set role gym_easy_app`;
    await sql`select set_config('gym_easy.consent_retention', 'delete', true)`;

    await expect(sql`delete from "consent_log"`).rejects.toSatisfy(
      isInsufficientPrivilege,
    );
    await expect(
      sql`update "consent_log" set "source" = "source"`,
    ).rejects.toSatisfy(isInsufficientPrivilege);
    await expect(sql`truncate "consent_log"`).rejects.toSatisfy(
      isInsufficientPrivilege,
    );
    await expect(
      sql`select purge_expired_consent_proofs(now())`,
    ).rejects.toSatisfy(isInsufficientPrivilege);

    await sql`select delete_account(${expiredId}::uuid, ${expiredPseudonym}, ${CONSENT_KEY_VERSION}::smallint, ${"2020-01-01T00:00:00.000Z"}::timestamptz)`;
    await sql`select delete_account(${recentId}::uuid, ${recentPseudonym}, ${CONSENT_KEY_VERSION}::smallint)`;
    const removed = await sql`select purge_consent_proofs() as removed`;
    expect(Number(removed[0]?.removed)).toBeGreaterThanOrEqual(1);

    await sql`reset role`;

    expect(
      await db
        .select({ id: consentLog.id })
        .from(consentLog)
        .where(eq(consentLog.userId, blockedId)),
    ).toHaveLength(1);
    expect(
      await db
        .select({ id: consentLog.id })
        .from(consentLog)
        .where(eq(consentLog.subjectPseudonym, expiredPseudonym)),
    ).toEqual([]);
    expect(
      await db
        .select({ id: consentLog.id })
        .from(consentLog)
        .where(eq(consentLog.subjectPseudonym, recentPseudonym)),
    ).toHaveLength(1);
    expect(
      await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, expiredId)),
    ).toEqual([]);
  });

  it("faz o migrate-on-deploy sair com 1 se a app recuperar UPDATE", async () => {
    const migratorUrl = migratorDatabaseUrl(databaseUrl);
    await sql`grant update on "consent_log" to gym_easy_app`;
    try {
      const result = spawnSync(
        process.execPath,
        ["scripts/migrate-on-deploy.mjs"],
        {
          encoding: "utf8",
          env: {
            PATH: process.env.PATH,
            NODE_ENV: "test",
            RUN_MIGRATIONS: "true",
            DATABASE_URL_MIGRATOR: migratorUrl,
          },
        },
      );
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(
        "gym_easy_app still has UPDATE on consent_log",
      );
      expect(result.stderr).not.toContain(migratorUrl);
    } finally {
      await sql`reset role`;
      await sql`revoke update on "consent_log" from gym_easy_app`;
    }
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

function migratorDatabaseUrl(superuserUrl: string): string {
  const url = new URL(superuserUrl);
  url.username = "gym_easy_migrator";
  url.password = "migrator";
  return url.toString();
}
