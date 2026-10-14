import { createHmac } from "node:crypto";

/** Bump together with a new CONSENT_PSEUDONYM_KEY so old proofs stay verifiable. */
export const CONSENT_KEY_VERSION = 1;

export function consentSubjectPseudonym(
  userId: string,
  key: string,
  keyVersion: number = CONSENT_KEY_VERSION,
): string {
  return createHmac("sha256", key)
    .update(`${keyVersion}:${userId}`)
    .digest("hex");
}
