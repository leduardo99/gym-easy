import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { CONSENT_TEXTS, consentTextSha256 } from "@/consent/texts";
import type { AppDatabase } from "@/db";
import { databaseUrlForRole, isLocalDatabaseUrl } from "@/db/driver";
import { repairPostgresJsSerializers } from "@/db/postgres";
import * as schema from "@/db/schema";
import { coachMessages, consentLog, users } from "@/db/schema";
import {
  createConsentRepository,
  isCurrentConsent,
} from "@/features/consent/repository";
import { assessCoachTurn } from "@/lib/ai/turn";
import { createMemoryRateLimiter } from "@/features/auth/rate-limit";
import { createMemoryRedFlagLockStore } from "@/lib/ai/cooldown";

import { deleteUserCoachChatHistory } from "./delete-chat-history";
import { revokeCoachConsent } from "./revoke-consent";

const databaseUrl = process.env.DATABASE_URL ?? "";
const runIntegration =
  databaseUrl.length > 0 && isLocalDatabaseUrl(databaseUrl);

describe.skipIf(!runIntegration)("coach privacy integration", () => {
  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle({ client, schema });
  repairPostgresJsSerializers(client);

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
    await client.end({ timeout: 5 });
  });

  async function insertUser(label: string) {
    const id = crypto.randomUUID();
    await db.insert(users).values({
      id,
      name: label,
      email: `${id}@example.com`,
      passwordHash: "hash",
    });
    return id;
  }

  async function grantCoach(userId: string) {
    const consents = createConsentRepository(db as unknown as AppDatabase);
    for (const purpose of ["coach_health", "coach_chat"] as const) {
      await consents.recordConsent(userId, {
        purpose,
        action: "granted",
        source: "reconsent",
      });
    }
  }

  it("apaga só as mensagens do próprio utilizador", async () => {
    const owner = await insertUser("owner");
    const other = await insertUser("other");
    await db.insert(coachMessages).values([
      {
        userId: owner,
        role: "user",
        content: "mensagem do dono",
        risk: "none",
        model: null,
        dataPolicy: null,
        promptVersion: null,
      },
      {
        userId: other,
        role: "user",
        content: "mensagem de outro",
        risk: "none",
        model: null,
        dataPolicy: null,
        promptVersion: null,
      },
    ]);

    const deleted = await deleteUserCoachChatHistory(
      db as unknown as AppDatabase,
      owner,
    );
    expect(deleted).toBe(1);
    const remaining = await db.select().from(coachMessages);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.userId).toBe(other);
  });

  it("regista revogação no consent_log e bloqueia o coach", async () => {
    const userId = await insertUser("revoke");
    await grantCoach(userId);
    await db.insert(coachMessages).values({
      userId,
      role: "assistant",
      content: "resposta",
      risk: "none",
      model: "test",
      dataPolicy: "zdr",
      promptVersion: "v1",
    });

    const revoked = await revokeCoachConsent(
      db as unknown as AppDatabase,
      userId,
    );
    expect(revoked).toMatchObject({ ok: true, deletedMessages: 1 });

    const events = await db
      .select()
      .from(consentLog)
      .where(eq(consentLog.userId, userId))
      .orderBy(consentLog.createdAt);
    const coachRevokes = events.filter(
      (event) =>
        event.action === "revoked" &&
        (event.purpose === "coach_health" || event.purpose === "coach_chat"),
    );
    expect(coachRevokes).toHaveLength(2);
    for (const event of coachRevokes) {
      expect(event.version).toBe(CONSENT_TEXTS[event.purpose].version);
      expect(event.textSha256).toBe(consentTextSha256(event.purpose));
      expect(isCurrentConsent(event)).toBe(false);
    }

    const turn = await assessCoachTurn({
      userId,
      message: "como treinar hoje?",
      now: new Date("2026-10-14T12:00:00.000Z"),
      consents: {
        bodyData: "current",
        coachHealth: "missing",
        coachChat: "missing",
      },
      profile: {
        birthYear: 1990,
        sex: "female",
        heightCm: 170,
        goal: "health",
        level: "beginner",
        daysPerWeek: 3,
        sessionMinutes: 45,
        trainingPlace: "full_gym",
      },
      weightKg: 70,
      limiter: createMemoryRateLimiter(),
      locks: createMemoryRedFlagLockStore(),
      models: ["alpha/example:free"],
      callModel: async () => ({ text: "não" }),
      log: () => undefined,
      sleep: async () => undefined,
    });
    expect(turn.action).toBe("respond");
    if (turn.action === "respond") {
      expect(turn.result.httpStatus).toBe(403);
      expect(turn.result.status).toBe("consent_missing");
    }
  });
});
