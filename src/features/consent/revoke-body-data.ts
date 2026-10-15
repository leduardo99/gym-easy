import { eq } from "drizzle-orm";

import type { AppDatabase } from "@/db";
import { bodyMeasurements, userProfiles } from "@/db/schema";

import { createConsentRepository } from "./repository";

export type RevokeBodyDataConsentResult =
  { ok: true } | { ok: false; error: "invalid" | "transaction_failed" };

export async function revokeBodyDataConsent(
  db: AppDatabase,
  userId: string,
): Promise<RevokeBodyDataConsentResult> {
  try {
    await db.transaction(async (tx) => {
      const consents = createConsentRepository(tx);
      const saved = await consents.recordConsent(userId, {
        purpose: "body_data",
        action: "revoked",
        source: "profile",
      });
      if (!saved.ok) {
        throw new Error("consent_invalid");
      }
      await tx
        .delete(bodyMeasurements)
        .where(eq(bodyMeasurements.userId, userId));
      await tx
        .update(userProfiles)
        .set({
          heightCm: null,
          sex: null,
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.userId, userId));
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === "consent_invalid") {
      return { ok: false, error: "invalid" };
    }
    return { ok: false, error: "transaction_failed" };
  }
}
