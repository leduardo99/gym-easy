import { sessionStatus, shouldTouchSession } from "./session-policy";
import { sha256 } from "./tokens";
import { toPublicUser, type PublicUser, type UserStore } from "./user-store";

export type SessionLookup =
  | { status: "anonymous" }
  | { status: "expired" }
  | { status: "ok"; user: PublicUser };

export async function resolveSession(
  token: string | undefined,
  deps: { users: UserStore; now: Date },
): Promise<SessionLookup> {
  if (!token) return { status: "anonymous" };

  const session = await deps.users.findSession(sha256(token));
  if (!session) return { status: "anonymous" };

  if (sessionStatus(session, deps.now) === "expired") {
    await deps.users.deleteSession(session.tokenHash);
    return { status: "expired" };
  }

  if (shouldTouchSession(session.lastSeenAt, deps.now)) {
    await deps.users.touchSession(session.tokenHash, deps.now);
  }

  const user = await deps.users.findUserById(session.userId);
  if (!user) return { status: "anonymous" };
  return { status: "ok", user: toPublicUser(user) };
}

export async function getOwnAccount(
  users: UserStore,
  userId: string,
): Promise<PublicUser | null> {
  const user = await users.findUserById(userId);
  return user ? toPublicUser(user) : null;
}
