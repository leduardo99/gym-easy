import { sql } from "drizzle-orm";

import type { AppDatabase } from "@/db";

import { CONSENT_KEY_VERSION, consentSubjectPseudonym } from "./pseudonym";

export const CONSENT_PROOF_RETENTION_YEARS = 3;

export function consentProofCutoff(now: Date): Date {
  const cutoff = new Date(now.getTime());
  cutoff.setUTCFullYear(
    cutoff.getUTCFullYear() - CONSENT_PROOF_RETENTION_YEARS,
  );
  return cutoff;
}

export async function deleteUserAccount(
  db: AppDatabase,
  userId: string,
  key: string,
): Promise<void> {
  const pseudonym = consentSubjectPseudonym(userId, key);
  await db.execute(
    sql`select delete_account(${userId}::uuid, ${pseudonym}, ${CONSENT_KEY_VERSION}::smallint)`,
  );
}

export async function purgeExpiredConsentProofs(
  db: AppDatabase,
  now: Date = new Date(),
): Promise<number> {
  const cutoff = consentProofCutoff(now);
  const result = await db.execute(
    sql`select purge_expired_consent_proofs(${cutoff.toISOString()}::timestamptz) as removed`,
  );
  return removedCount(result);
}

function removedCount(result: unknown): number {
  const rows = Array.isArray(result)
    ? result
    : result && typeof result === "object" && "rows" in result
      ? (result as { rows: unknown }).rows
      : [];
  if (!Array.isArray(rows)) return 0;
  const row = rows[0];
  if (!row || typeof row !== "object" || !("removed" in row)) return 0;
  const removed = (row as { removed: unknown }).removed;
  if (typeof removed === "number") return removed;
  if (typeof removed === "string") return Number(removed);
  return 0;
}
