import { eq } from "drizzle-orm";

import type { DbClient } from "@/db";
import { bodyMeasurements, userProfiles } from "@/db/schema";

export async function purgeBodyDataRows(
  tx: DbClient,
  userId: string,
): Promise<void> {
  await tx.delete(bodyMeasurements).where(eq(bodyMeasurements.userId, userId));
  await tx
    .update(userProfiles)
    .set({
      heightCm: null,
      sex: null,
      updatedAt: new Date(),
    })
    .where(eq(userProfiles.userId, userId));
}
