import { desc, eq } from "drizzle-orm";

import type { DbClient } from "@/db";
import type { ConsentAction, ConsentPurpose, ConsentSource } from "@/db/domain";
import { consentLog } from "@/db/schema";
import {
  CONSENT_TEXTS,
  consentTextSha256,
  isValidBodyDataConsentGrant,
} from "@/consent/texts";

import { consentInputSchema } from "./schemas";

/** Vigente só com granted na versão e no hash do texto publicado. */
export function isCurrentConsent(event: {
  purpose: ConsentPurpose;
  action: ConsentAction;
  version: string;
  textSha256: string;
}): boolean {
  if (event.purpose === "body_data") {
    return isValidBodyDataConsentGrant(event);
  }
  const published = CONSENT_TEXTS[event.purpose];
  return (
    event.action === "granted" &&
    event.version === published.version &&
    event.textSha256 === consentTextSha256(event.purpose)
  );
}

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
  if (row.userId === null) {
    throw new Error("retained consent proof is not a live event");
  }
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

export function createConsentRepository(db: DbClient) {
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
      const seen = new Set<ConsentPurpose>();
      for (const event of events) {
        if (seen.has(event.purpose)) continue;
        seen.add(event.purpose);
        if (isCurrentConsent(event)) current[event.purpose] = event;
      }
      return current;
    },
  };

  return api;
}
