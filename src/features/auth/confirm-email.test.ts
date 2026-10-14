import { describe, expect, it } from "vitest";

import { confirmEmail } from "./confirm-email";
import { createMemoryUserStore } from "./memory-user-store";
import { CONFIRMATION_GRACE_MS, CONFIRMATION_TTL_MS } from "./session-policy";
import { sha256 } from "./tokens";

const now = new Date("2026-10-14T12:00:00.000Z");

async function prepare() {
  const users = createMemoryUserStore();
  await users.insertUser({
    id: "user-1",
    name: "Ana",
    email: "ana@example.com",
    passwordHash: "hash",
  });
  await users.saveVerificationToken({
    tokenHash: sha256("raw-token"),
    userId: "user-1",
    expiresAt: new Date(now.getTime() + CONFIRMATION_TTL_MS),
  });
  return users;
}

describe("confirmEmail", () => {
  it("verifies the account once and opens a session", async () => {
    const users = await prepare();
    const result = await confirmEmail(
      "raw-token",
      { now, existingTokenHash: null },
      { users, createToken: () => "session-token" },
    );

    expect(result).toEqual({ status: "confirmed", token: "session-token" });
    expect((await users.findUserById("user-1"))?.emailVerifiedAt).toEqual(now);
    expect(await users.findSession(sha256("session-token"))).toMatchObject({
      userId: "user-1",
    });
    expect(
      (await users.findVerificationToken(sha256("raw-token")))?.usedAt,
    ).toEqual(now);
  });

  it("does not open another session when a used link is submitted again", async () => {
    const users = await prepare();
    const deps = { users, createToken: () => "session-a" };
    await confirmEmail("raw-token", { now, existingTokenHash: null }, deps);

    deps.createToken = () => "session-b";
    const again = await confirmEmail(
      "raw-token",
      { now: new Date(now.getTime() + 10_000), existingTokenHash: null },
      deps,
    );
    expect(again).toEqual({ status: "invalid" });
    expect(await users.findSession(sha256("session-a"))).toMatchObject({
      userId: "user-1",
    });
    expect(await users.findSession(sha256("session-b"))).toBeNull();

    const later = await confirmEmail(
      "raw-token",
      {
        now: new Date(now.getTime() + CONFIRMATION_GRACE_MS + 1),
        existingTokenHash: sha256("session-a"),
      },
      deps,
    );
    expect(later).toEqual({ status: "invalid" });
    expect(await users.findSession(sha256("session-a"))).toMatchObject({
      userId: "user-1",
    });
  });

  it("rejects an expired or unknown token", async () => {
    const users = await prepare();
    const expired = await confirmEmail(
      "raw-token",
      {
        now: new Date(now.getTime() + CONFIRMATION_TTL_MS + 1),
        existingTokenHash: null,
      },
      { users, createToken: () => "session" },
    );
    const unknown = await confirmEmail(
      "missing",
      { now, existingTokenHash: null },
      { users, createToken: () => "session" },
    );

    expect(expired).toEqual({ status: "invalid" });
    expect(unknown).toEqual({ status: "invalid" });
    expect((await users.findUserById("user-1"))?.emailVerifiedAt).toBeNull();
  });
});
