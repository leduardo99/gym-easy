import { CONFIRMATION_GRACE_MS, ABSOLUTE_SESSION_MS } from "./session-policy";
import { sha256 } from "./tokens";
import type { UserStore } from "./user-store";

export type ConfirmEmailResult =
  { status: "confirmed"; token: string } | { status: "invalid" };

export async function confirmEmail(
  rawToken: string,
  input: { now: Date; existingTokenHash: string | null },
  deps: { users: UserStore; createToken: () => string },
): Promise<ConfirmEmailResult> {
  if (!rawToken) return { status: "invalid" };

  const tokenHash = sha256(rawToken);
  const taken = await deps.users.takeUnusedVerificationToken(
    tokenHash,
    input.now,
  );
  let userId = taken?.userId ?? null;

  if (!userId) {
    const existing = await deps.users.findVerificationToken(tokenHash);
    const recentlyUsed =
      existing?.usedAt &&
      input.now.getTime() - existing.usedAt.getTime() <=
        CONFIRMATION_GRACE_MS &&
      existing.expiresAt.getTime() > input.now.getTime();
    if (!recentlyUsed || !existing) return { status: "invalid" };
    userId = existing.userId;
  } else {
    await deps.users.markEmailVerified(userId, input.now);
  }

  if (input.existingTokenHash) {
    await deps.users.deleteSession(input.existingTokenHash);
  }

  const token = deps.createToken();
  await deps.users.insertSession({
    tokenHash: sha256(token),
    userId,
    createdAt: input.now,
    lastSeenAt: input.now,
    expiresAt: new Date(input.now.getTime() + ABSOLUTE_SESSION_MS),
  });

  return { status: "confirmed", token };
}
