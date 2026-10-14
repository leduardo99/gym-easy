import { describe, expect, it } from "vitest";

import {
  ABSOLUTE_SESSION_MS,
  IDLE_SESSION_MS,
  sessionStatus,
  shouldTouchSession,
} from "./session-policy";

describe("sessionStatus", () => {
  const created = new Date("2026-01-01T00:00:00.000Z");

  it("expires at the absolute deadline and after seven idle days", () => {
    expect(
      sessionStatus(
        {
          lastSeenAt: created,
          expiresAt: new Date(created.getTime() + ABSOLUTE_SESSION_MS),
        },
        new Date(created.getTime() + IDLE_SESSION_MS),
      ),
    ).toBe("expired");

    expect(
      sessionStatus(
        {
          lastSeenAt: new Date(created.getTime() + ABSOLUTE_SESSION_MS - 1000),
          expiresAt: new Date(created.getTime() + ABSOLUTE_SESSION_MS),
        },
        new Date(created.getTime() + ABSOLUTE_SESSION_MS),
      ),
    ).toBe("expired");
  });

  it("stays valid inside both windows and touches after five minutes", () => {
    const now = new Date(created.getTime() + 60_000);
    expect(
      sessionStatus(
        {
          lastSeenAt: created,
          expiresAt: new Date(created.getTime() + ABSOLUTE_SESSION_MS),
        },
        now,
      ),
    ).toBe("valid");
    expect(shouldTouchSession(created, now)).toBe(false);
    expect(
      shouldTouchSession(created, new Date(created.getTime() + 5 * 60 * 1000)),
    ).toBe(true);
  });
});
