import { desc, eq } from "drizzle-orm";

import type { AppDatabase } from "@/db";
import type { ConsentAction, ConsentPurpose, ConsentSource } from "@/db/domain";
import { consentLog } from "@/db/schema";
import { CONSENT_TEXTS, consentTextSha256 } from "@/consent/texts";

import { consentInputSchema } from "./schemas";

export type ConsentEvent = {
  id: string;
  userId: string;
  purpose: ConsentPurpose;
  action: ConsentAction;
  version: string;
  textSha256: string;
  source: ConsentSource;
  createdAt: Date;
};

export type ConsentResult<T> =
  { ok: true; value: T } | { ok: false; error: "invalid"; message: string };

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function mapEvent(row: typeof consentLog.$inferSelect): ConsentEvent {
  return {
    id: row.id,
    userId: row.userId,
    purpose: row.purpose,
    action: row.action,
    version: row.version,
    textSha256: row.textSha256,
    source: row.source,
    createdAt: asDate(row.createdAt),
  };
}

export function createConsentRepository(db: AppDatabase) {
  const api = {
    async recordConsent(
      userId: string,
      input: unknown,
    ): Promise<ConsentResult<ConsentEvent>> {
      const parsed = consentInputSchema.safeParse(input);
      if (!parsed.success) {
        return { ok: false, error: "invalid", message: "Dados inválidos." };
      }
      const text = CONSENT_TEXTS[parsed.data.purpose];
      const rows = await db
        .insert(consentLog)
        .values({
          userId,
          purpose: parsed.data.purpose,
          action: parsed.data.action,
          version: text.version,
          textSha256: consentTextSha256(parsed.data.purpose),
          source: parsed.data.source,
        })
        .returning();
      const row = rows[0];
      if (!row) {
        return { ok: false, error: "invalid", message: "Dados inválidos." };
      }
      return { ok: true, value: mapEvent(row) };
    },

    async listConsents(userId: string): Promise<ConsentEvent[]> {
      const rows = await db
        .select()
        .from(consentLog)
        .where(eq(consentLog.userId, userId))
        .orderBy(desc(consentLog.createdAt));
      return rows.map(mapEvent);
    },

    async currentConsent(
      userId: string,
    ): Promise<Partial<Record<ConsentPurpose, ConsentEvent>>> {
      const events = await api.listConsents(userId);
      const current: Partial<Record<ConsentPurpose, ConsentEvent>> = {};
      for (const event of events) {
        if (!current[event.purpose]) current[event.purpose] = event;
      }
      return current;
    },
  };

  return api;
}
