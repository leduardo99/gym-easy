export const ABSOLUTE_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
export const IDLE_SESSION_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_TOUCH_MS = 5 * 60 * 1000;
export const CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000;
/** Absorbs a duplicate submit without keeping the link alive. */
export const CONFIRMATION_GRACE_MS = 2 * 60 * 1000;

export function sessionStatus(
  session: { lastSeenAt: Date; expiresAt: Date },
  now: Date,
): "valid" | "expired" {
  if (now.getTime() >= session.expiresAt.getTime()) return "expired";
  if (now.getTime() >= session.lastSeenAt.getTime() + IDLE_SESSION_MS) {
    return "expired";
  }
  return "valid";
}

export function shouldTouchSession(lastSeenAt: Date, now: Date): boolean {
  return now.getTime() - lastSeenAt.getTime() >= SESSION_TOUCH_MS;
}
