import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { CONSENT_TEXTS, consentTextSha256 } from "@/consent/texts";
import type { AppDatabase } from "@/db";
import { databaseUrlForRole, isLocalDatabaseUrl } from "@/db/driver";
import { repairPostgresJsSerializers } from "@/db/postgres";
import * as schema from "@/db/schema";
import {
  coachMessages,
  consentLog,
  planChangeProposals,
  users,
} from "@/db/schema";
import {
  createConsentRepository,
  isCurrentConsent,
} from "@/features/consent/repository";
import { submitReconsent } from "@/features/consent/reconsent";
import { createMemoryRateLimiter } from "@/features/auth/rate-limit";
import { createMemoryRedFlagLockStore } from "@/lib/ai/cooldown";
import * as coachMessagesModule from "@/lib/ai/messages";
import * as proposalsModule from "@/lib/ai/proposals";
import { assessCoachTurn } from "@/lib/ai/turn";

import { deleteUserCoachChatHistory } from "./delete-chat-history";
import {
  revokeCoachChatConsent,
  revokeCoachConsent,
  revokeCoachHealthConsent,
} from "./revoke-consent";

const databaseUrl = process.env.DATABASE_URL ?? "";
const runIntegration =
  databaseUrl.length > 0 && isLocalDatabaseUrl(databaseUrl);

const coachProfile = {
  birthYear: 1990,
  sex: "female" as const,
  heightCm: 170,
  goal: "health" as const,
  level: "beginner" as const,
  daysPerWeek: 3,
  sessionMinutes: 45,
  trainingPlace: "full_gym" as const,
};

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

  afterEach(() => {
    vi.restoreAllMocks();
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

  async function insertCoachMessage(userId: string, content: string) {
    await db.insert(coachMessages).values({
      userId,
      role: "user",
      content,
      risk: "none",
      model: null,
      dataPolicy: null,
      promptVersion: null,
    });
  }

  async function insertPlanProposal(
    userId: string,
    status: "proposed" | "rejected" | "expired" | "confirmed" = "proposed",
  ) {
    await db.insert(planChangeProposals).values({
      userId,
      status,
      payload: { type: "deload", rationale: "ajuste após PAR-Q+" },
    });
  }

  it("apaga só as mensagens do próprio utilizador", async () => {
    const owner = await insertUser("owner");
    const other = await insertUser("other");
    await insertCoachMessage(owner, "mensagem do dono");
    await insertCoachMessage(other, "mensagem de outro");

    const deleted = await deleteUserCoachChatHistory(
      db as unknown as AppDatabase,
      owner,
    );
    expect(deleted).toBe(1);
    const remaining = await db.select().from(coachMessages);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.userId).toBe(other);
  });

  it("não grava revogações se o delete do histórico falhar ao revogar o chat", async () => {
    const userId = await insertUser("rollback-chat");
    await grantCoach(userId);
    await insertCoachMessage(userId, "fica até rollback");

    vi.spyOn(
      coachMessagesModule,
      "deleteCoachChatHistory",
    ).mockRejectedValueOnce(new Error("delete_failed"));

    const result = await revokeCoachChatConsent(
      db as unknown as AppDatabase,
      userId,
      "profile",
    );
    expect(result).toEqual({ ok: false, error: "transaction_failed" });

    const events = await db
      .select()
      .from(consentLog)
      .where(eq(consentLog.userId, userId));
    expect(events.some((event) => event.action === "revoked")).toBe(false);

    const messages = await db
      .select()
      .from(coachMessages)
      .where(eq(coachMessages.userId, userId));
    expect(messages).toHaveLength(1);
  });

  it("não grava revogações se apagar propostas falhar ao revogar saúde", async () => {
    const userId = await insertUser("rollback-health");
    await grantCoach(userId);
    await insertPlanProposal(userId);

    vi.spyOn(proposalsModule, "deleteCoachProposals").mockRejectedValueOnce(
      new Error("delete_failed"),
    );

    const result = await revokeCoachHealthConsent(
      db as unknown as AppDatabase,
      userId,
      "profile",
    );
    expect(result).toEqual({ ok: false, error: "transaction_failed" });

    const events = await db
      .select()
      .from(consentLog)
      .where(eq(consentLog.userId, userId));
    expect(events.some((event) => event.action === "revoked")).toBe(false);

    const proposals = await db
      .select()
      .from(planChangeProposals)
      .where(eq(planChangeProposals.userId, userId));
    expect(proposals).toHaveLength(1);
  });

  it("revoga coach_health, apaga propostas e mantém chat e coach_chat", async () => {
    const userId = await insertUser("health-only");
    await grantCoach(userId);
    await insertCoachMessage(userId, "mensagem");
    await insertPlanProposal(userId);

    const callModel = vi.fn(async () => ({ text: "não" }));
    const revoked = await revokeCoachHealthConsent(
      db as unknown as AppDatabase,
      userId,
      "profile",
    );
    expect(revoked).toMatchObject({ ok: true, deletedProposals: 1 });

    const healthEvents = await db
      .select()
      .from(consentLog)
      .where(eq(consentLog.userId, userId));
    const healthRevoke = healthEvents.filter(
      (event) => event.purpose === "coach_health" && event.action === "revoked",
    );
    expect(healthRevoke).toHaveLength(1);
    expect(healthRevoke[0]?.textSha256).toBe(consentTextSha256("coach_health"));
    expect(healthRevoke[0]?.version).toBe(CONSENT_TEXTS.coach_health.version);
    expect(
      healthEvents.some(
        (event) => event.purpose === "coach_chat" && event.action === "revoked",
      ),
    ).toBe(false);

    const proposals = await db
      .select()
      .from(planChangeProposals)
      .where(eq(planChangeProposals.userId, userId));
    expect(proposals).toHaveLength(0);

    const messages = await db
      .select()
      .from(coachMessages)
      .where(eq(coachMessages.userId, userId));
    expect(messages).toHaveLength(1);

    const consents = await createConsentRepository(
      db as unknown as AppDatabase,
    ).currentConsent(userId);
    expect(consents.coach_chat).toBeDefined();
    expect(consents.coach_health).toBeUndefined();

    const turn = await assessCoachTurn({
      userId,
      message: "como treinar hoje?",
      now: new Date("2026-10-14T12:00:00.000Z"),
      consents: {
        bodyData: "current",
        coachHealth: "missing",
        coachChat: "current",
      },
      profile: coachProfile,
      weightKg: 70,
      limiter: createMemoryRateLimiter(),
      locks: createMemoryRedFlagLockStore(),
      models: ["alpha/example:free"],
      privacyMode: "zdr_only",
      pinnedProviders: [],
      coachConsentVersions: {
        coachHealth: "coach_health-pt-BR-2026-10-15b",
        coachChat: "coach_chat-pt-BR-2026-10-15b",
      },
      paidZdrConsentVersionSuffix: null,
      callModel,
      log: () => undefined,
      sleep: async () => undefined,
    });
    expect(turn.action).toBe("respond");
    if (turn.action === "respond") {
      expect(turn.result.httpStatus).toBe(403);
      expect(turn.result.status).toBe("consent_missing");
      expect(turn.result.text).toMatch(/falta autorização de saúde/);
    }
    expect(callModel).not.toHaveBeenCalled();
  });

  it("revoga coach_chat, apaga histórico e mantém coach_health e propostas", async () => {
    const userId = await insertUser("chat-only");
    await grantCoach(userId);
    await insertCoachMessage(userId, "mensagem");
    await insertPlanProposal(userId);

    const revoked = await revokeCoachChatConsent(
      db as unknown as AppDatabase,
      userId,
      "profile",
    );
    expect(revoked).toMatchObject({ ok: true, deletedMessages: 1 });

    const events = await db
      .select()
      .from(consentLog)
      .where(eq(consentLog.userId, userId));
    expect(
      events.some(
        (event) => event.purpose === "coach_chat" && event.action === "revoked",
      ),
    ).toBe(true);
    expect(
      events.some(
        (event) =>
          event.purpose === "coach_health" && event.action === "revoked",
      ),
    ).toBe(false);

    const messages = await db
      .select()
      .from(coachMessages)
      .where(eq(coachMessages.userId, userId));
    expect(messages).toHaveLength(0);

    const proposals = await db
      .select()
      .from(planChangeProposals)
      .where(eq(planChangeProposals.userId, userId));
    expect(proposals).toHaveLength(1);

    const consents = await createConsentRepository(
      db as unknown as AppDatabase,
    ).currentConsent(userId);
    expect(consents.coach_health).toBeDefined();
    expect(consents.coach_chat).toBeUndefined();
  });

  it("regista revogação total no consent_log, bloqueia o coach de A e não afeta B", async () => {
    const userA = await insertUser("revoke-a");
    const userB = await insertUser("revoke-b");
    await grantCoach(userA);
    await grantCoach(userB);
    await insertCoachMessage(userA, "chat de A");
    await insertCoachMessage(userB, "chat de B");

    const revoked = await revokeCoachConsent(
      db as unknown as AppDatabase,
      userA,
      "profile",
    );
    expect(revoked).toMatchObject({ ok: true, deletedMessages: 1 });

    const eventsA = await db
      .select()
      .from(consentLog)
      .where(eq(consentLog.userId, userA));
    const coachRevokesA = eventsA.filter(
      (event) =>
        event.action === "revoked" &&
        (event.purpose === "coach_health" || event.purpose === "coach_chat"),
    );
    expect(coachRevokesA).toHaveLength(2);
    for (const event of coachRevokesA) {
      expect(event.version).toBe(CONSENT_TEXTS[event.purpose].version);
      expect(event.textSha256).toBe(consentTextSha256(event.purpose));
      expect(isCurrentConsent(event)).toBe(false);
    }

    const messagesA = await db
      .select()
      .from(coachMessages)
      .where(eq(coachMessages.userId, userA));
    expect(messagesA).toHaveLength(0);

    const consentsB = await createConsentRepository(
      db as unknown as AppDatabase,
    ).currentConsent(userB);
    expect(consentsB.coach_health).toBeDefined();
    expect(consentsB.coach_chat).toBeDefined();

    const messagesB = await db
      .select()
      .from(coachMessages)
      .where(eq(coachMessages.userId, userB));
    expect(messagesB).toHaveLength(1);

    const turnA = await assessCoachTurn({
      userId: userA,
      message: "como treinar hoje?",
      now: new Date("2026-10-14T12:00:00.000Z"),
      consents: {
        bodyData: "current",
        coachHealth: "missing",
        coachChat: "missing",
      },
      profile: coachProfile,
      weightKg: 70,
      limiter: createMemoryRateLimiter(),
      locks: createMemoryRedFlagLockStore(),
      models: ["alpha/example:free"],
      privacyMode: "zdr_only",
      pinnedProviders: [],
      coachConsentVersions: {
        coachHealth: null,
        coachChat: null,
      },
      paidZdrConsentVersionSuffix: null,
      callModel: async () => ({ text: "não" }),
      log: () => undefined,
      sleep: async () => undefined,
    });
    expect(turnA.action).toBe("respond");
    if (turnA.action === "respond") {
      expect(turnA.result.httpStatus).toBe(403);
      expect(turnA.result.status).toBe("consent_missing");
    }

    const turnB = await assessCoachTurn({
      userId: userB,
      message: "como treinar hoje?",
      now: new Date("2026-10-14T12:00:00.000Z"),
      consents: {
        bodyData: "current",
        coachHealth: "current",
        coachChat: "current",
      },
      profile: coachProfile,
      weightKg: 70,
      limiter: createMemoryRateLimiter(),
      locks: createMemoryRedFlagLockStore(),
      models: ["alpha/example:free"],
      privacyMode: "zdr_only",
      pinnedProviders: [],
      coachConsentVersions: {
        coachHealth: "coach_health-pt-BR-2026-10-15b",
        coachChat: "coach_chat-pt-BR-2026-10-15b",
      },
      paidZdrConsentVersionSuffix: null,
      callModel: async () => ({ text: "ok" }),
      log: () => undefined,
      sleep: async () => undefined,
    });
    expect(turnB.action).toBe("generate");
  });

  it("revoga coach_health e apaga propostas em qualquer estado", async () => {
    const userId = await insertUser("health-proposals");
    await grantCoach(userId);
    await insertPlanProposal(userId, "proposed");
    await insertPlanProposal(userId, "rejected");

    const revoked = await revokeCoachHealthConsent(
      db as unknown as AppDatabase,
      userId,
      "profile",
    );
    expect(revoked).toMatchObject({ ok: true, deletedProposals: 2 });

    const proposals = await db
      .select()
      .from(planChangeProposals)
      .where(eq(planChangeProposals.userId, userId));
    expect(proposals).toHaveLength(0);
  });

  it("reconsent recusado para coach_health revoga e apaga propostas", async () => {
    const userId = await insertUser("reconsent-refuse");
    await grantCoach(userId);
    await insertPlanProposal(userId);

    const result = await submitReconsent(db as unknown as AppDatabase, userId, {
      scope: "coach_health",
      intent: "refuse",
      accepted: false,
    });
    expect(result.status).toBe("refused");

    const events = await db
      .select()
      .from(consentLog)
      .where(eq(consentLog.userId, userId));
    expect(
      events.some(
        (event) =>
          event.purpose === "coach_health" &&
          event.action === "revoked" &&
          event.source === "reconsent",
      ),
    ).toBe(true);

    const proposals = await db
      .select()
      .from(planChangeProposals)
      .where(eq(planChangeProposals.userId, userId));
    expect(proposals).toHaveLength(0);
  });

  it("reconsent recusado para coach_chat revoga, apaga histórico e não afeta outro utilizador", async () => {
    const userA = await insertUser("reconsent-chat-a");
    const userB = await insertUser("reconsent-chat-b");
    await grantCoach(userA);
    await grantCoach(userB);
    await insertCoachMessage(userA, "chat de A");
    await insertCoachMessage(userB, "chat de B");

    const result = await submitReconsent(db as unknown as AppDatabase, userA, {
      scope: "coach_chat",
      intent: "refuse",
      accepted: false,
    });
    expect(result.status).toBe("refused");

    const eventsA = await db
      .select()
      .from(consentLog)
      .where(eq(consentLog.userId, userA));
    expect(
      eventsA.some(
        (event) =>
          event.purpose === "coach_chat" &&
          event.action === "revoked" &&
          event.source === "reconsent",
      ),
    ).toBe(true);

    const messagesA = await db
      .select()
      .from(coachMessages)
      .where(eq(coachMessages.userId, userA));
    expect(messagesA).toHaveLength(0);

    const messagesB = await db
      .select()
      .from(coachMessages)
      .where(eq(coachMessages.userId, userB));
    expect(messagesB).toHaveLength(1);
  });
});
