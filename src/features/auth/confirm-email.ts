import { ABSOLUTE_SESSION_MS } from "./session-policy";
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
  if (!taken) return { status: "invalid" };

  const userId = taken.userId;
  await deps.users.markEmailVerified(userId, input.now);

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
