import { describe, expect, it } from "vitest";

import { createMemoryUserStore } from "./memory-user-store";
import { getOwnAccount, resolveSession } from "./resolve-session";
import { IDLE_SESSION_MS } from "./session-policy";
import { sha256 } from "./tokens";

describe("resolveSession", () => {
  it("returns only the session user and drops an idle session", async () => {
    const users = createMemoryUserStore();
    await users.insertUser({
      id: "a",
      name: "Ana",
      email: "ana@example.com",
      passwordHash: "hash-a",
    });
    await users.insertUser({
      id: "b",
      name: "Bia",
      email: "bia@example.com",
      passwordHash: "hash-b",
    });
    const now = new Date("2026-10-14T12:00:00.000Z");
    await users.insertSession({
      tokenHash: sha256("token-a"),
      userId: "a",
      createdAt: now,
      lastSeenAt: now,
      expiresAt: new Date(now.getTime() + IDLE_SESSION_MS),
    });

    const current = await resolveSession("token-a", { users, now });
    expect(current.status).toBe("ok");
    if (current.status === "ok") {
      expect(current.user).toMatchObject({ id: "a", email: "ana@example.com" });
      expect(current.user).not.toHaveProperty("passwordHash");
    }

    const own = await getOwnAccount(users, "a");
    expect(own?.email).toBe("ana@example.com");
    expect((await getOwnAccount(users, "b"))?.email).toBe("bia@example.com");

    const expired = await resolveSession("token-a", {
      users,
      now: new Date(now.getTime() + IDLE_SESSION_MS),
    });
    expect(expired).toEqual({ status: "expired" });
    expect(await users.findSession(sha256("token-a"))).toBeNull();
  });
});
