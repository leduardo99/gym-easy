import { createHash, timingSafeEqual } from "node:crypto";

export function isCronAuthorized(
  authorization: string | null,
  secret: string | null,
): boolean {
  if (!secret) return false;
  const expected = createHash("sha256").update(`Bearer ${secret}`).digest();
  const actual = createHash("sha256")
    .update(authorization ?? "")
    .digest();
  return timingSafeEqual(expected, actual);
}
