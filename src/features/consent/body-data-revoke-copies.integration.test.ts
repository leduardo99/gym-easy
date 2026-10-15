import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { AppDatabase } from "@/db";
import { databaseUrlForRole, isLocalDatabaseUrl } from "@/db/driver";
import { repairPostgresJsSerializers } from "@/db/postgres";
import * as schema from "@/db/schema";
import {
  aiGenerationLogs,
  coachMessages,
  userProfiles,
  users,
} from "@/db/schema";
import { createConsentRepository } from "@/features/consent/repository";
import { revokeBodyDataConsent } from "@/features/consent/revoke-body-data";
import { hashUserId } from "@/lib/ai/log";

const databaseUrl = process.env.DATABASE_URL ?? "";
const runIntegration =
  databaseUrl.length > 0 && isLocalDatabaseUrl(databaseUrl);

describe.skipIf(!runIntegration)(
  "body_data revoke — cópias residuais (Delta)",
  () => {
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

    it("apaga dados do corpo mas mensagens do coach e logs técnicos da IA permanecem", async () => {
      const id = crypto.randomUUID();
      await db.insert(users).values({
        id,
        name: "delta-audit",
        email: `${id}@example.com`,
        passwordHash: "hash",
      });
      const consents = createConsentRepository(db as unknown as AppDatabase);
      await consents.recordConsent(id, {
        purpose: "body_data",
        action: "granted",
        source: "profile",
      });
      await db.insert(userProfiles).values({
        userId: id,
        birthYear: 1992,
        sex: "male",
        heightCm: 180,
      });
      await db.insert(coachMessages).values({
        userId: id,
        role: "assistant",
        content: "Com 80 kg e 180 cm, o volume está adequado.",
      });
      await db.insert(aiGenerationLogs).values({
        requestId: `req-${id}`,
        userIdHash: hashUserId(id),
        model: "test/model",
        dataPolicy: "zdr",
        latencyMs: 12,
        outcome: "ok",
      });

      const result = await revokeBodyDataConsent(
        db as unknown as AppDatabase,
        id,
      );
      expect(result).toEqual({ ok: true });

      const [profile] = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, id));
      expect(profile?.heightCm).toBeNull();
      expect(profile?.birthYear).toBe(1992);

      const messages = await db
        .select()
        .from(coachMessages)
        .where(eq(coachMessages.userId, id));
      expect(messages).toHaveLength(1);

      const logs = await db
        .select()
        .from(aiGenerationLogs)
        .where(eq(aiGenerationLogs.userIdHash, hashUserId(id)));
      expect(logs.length).toBeGreaterThanOrEqual(1);
    });
  },
);
