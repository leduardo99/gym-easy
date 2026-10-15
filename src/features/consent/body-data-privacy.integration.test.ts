import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { AppDatabase } from "@/db";
import { databaseUrlForRole, isLocalDatabaseUrl } from "@/db/driver";
import { repairPostgresJsSerializers } from "@/db/postgres";
import * as schema from "@/db/schema";
import { bodyMeasurements, consentLog, userProfiles, users } from "@/db/schema";
import {
  createConsentRepository,
  isCurrentConsent,
} from "@/features/consent/repository";

import { submitReconsent } from "./reconsent";
import { revokeBodyDataConsent } from "./revoke-body-data";

const databaseUrl = process.env.DATABASE_URL ?? "";
const runIntegration =
  databaseUrl.length > 0 && isLocalDatabaseUrl(databaseUrl);

describe.skipIf(!runIntegration)("body_data privacy integration", () => {
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

  it("revoga body_data, apaga altura/sexo/medidas e mantém o ano de nascimento", async () => {
    const userId = await insertUser("body-data-revoke");
    const consents = createConsentRepository(db as unknown as AppDatabase);
    await consents.recordConsent(userId, {
      purpose: "body_data",
      action: "granted",
      source: "reconsent",
    });

    await db.insert(userProfiles).values({
      userId,
      birthYear: 1990,
      sex: "female",
      heightCm: 172,
    });
    await db.insert(bodyMeasurements).values({
      userId,
      recordedOn: "2026-01-10",
      weightKg: "70.0",
    });
    await db.insert(bodyMeasurements).values({
      userId,
      recordedOn: "2026-02-10",
      weightKg: "71.5",
    });

    const result = await revokeBodyDataConsent(
      db as unknown as AppDatabase,
      userId,
    );
    expect(result).toEqual({ ok: true });

    const events = await db
      .select()
      .from(consentLog)
      .where(eq(consentLog.userId, userId));
    const revokedEvent = events.find(
      (event) =>
        event.purpose === "body_data" &&
        event.action === "revoked" &&
        event.source === "profile",
    );
    expect(revokedEvent).toBeDefined();
    if (!revokedEvent) return;
    expect(
      isCurrentConsent({
        purpose: "body_data",
        action: revokedEvent.action,
        version: revokedEvent.version,
        textSha256: revokedEvent.textSha256,
      }),
    ).toBe(false);

    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    expect(profile?.birthYear).toBe(1990);
    expect(profile?.heightCm).toBeNull();
    expect(profile?.sex).toBeNull();

    const measurements = await db
      .select()
      .from(bodyMeasurements)
      .where(eq(bodyMeasurements.userId, userId));
    expect(measurements).toHaveLength(0);
  });

  it("recusa reconsentimento de body_data e apaga os dados do corpo", async () => {
    const userId = await insertUser("body-data-reconsent-refuse");
    const consents = createConsentRepository(db as unknown as AppDatabase);
    await consents.recordConsent(userId, {
      purpose: "body_data",
      action: "granted",
      source: "reconsent",
    });

    await db.insert(userProfiles).values({
      userId,
      birthYear: 1988,
      sex: "male",
      heightCm: 180,
    });
    await db.insert(bodyMeasurements).values({
      userId,
      recordedOn: "2026-03-01",
      weightKg: "82.0",
    });

    const result = await submitReconsent(db as unknown as AppDatabase, userId, {
      scope: "body_data",
      intent: "refuse",
      accepted: false,
    });
    expect(result).toEqual({ status: "refused" });

    const events = await db
      .select()
      .from(consentLog)
      .where(eq(consentLog.userId, userId));
    expect(
      events.some(
        (event) =>
          event.purpose === "body_data" &&
          event.action === "revoked" &&
          event.source === "reconsent",
      ),
    ).toBe(true);

    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    expect(profile?.birthYear).toBe(1988);
    expect(profile?.heightCm).toBeNull();
    expect(profile?.sex).toBeNull();

    const measurements = await db
      .select()
      .from(bodyMeasurements)
      .where(eq(bodyMeasurements.userId, userId));
    expect(measurements).toHaveLength(0);
  });
});
