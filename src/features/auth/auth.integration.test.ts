import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { isLocalDatabaseUrl } from "@/db/driver";
import { repairPostgresJsSerializers } from "@/db/postgres";
import * as schema from "@/db/schema";
import { users } from "@/db/schema";
import type { AppDatabase } from "@/db";

import { createDrizzleRateLimiter } from "./drizzle-rate-limiter";
import { RATE_LIMIT_RETENTION_MS } from "./rate-limit";
import { createDrizzleUserStore } from "./drizzle-user-store";
import { hashPassword, verifyPassword } from "./password";
import { getOwnAccount } from "./resolve-session";
import { sha256 } from "./tokens";

const databaseUrl = process.env.DATABASE_URL ?? "";
const runIntegration =
  databaseUrl.length > 0 && isLocalDatabaseUrl(databaseUrl);

describe.skipIf(!runIntegration)("auth database", () => {
  const sql = postgres(databaseUrl, { max: 1 });
  const db = drizzle({ client: sql, schema });
  repairPostgresJsSerializers(sql);
  const store = createDrizzleUserStore(db as unknown as AppDatabase);
  const limiter = createDrizzleRateLimiter(db as unknown as AppDatabase);

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "src/db/migrations" });
  });

  afterAll(async () => {
    await sql.end({ timeout: 5 });
  });

  it("stores an argon2 hash and only returns the requested user", async () => {
    const password = "senha de integração";
    const passwordHash = await hashPassword(password);
    const suffix = crypto.randomUUID();
    const emailA = `a-${suffix}@example.com`;
    const emailB = `b-${suffix}@example.com`;

    expect(
      await store.insertUser({
        id: crypto.randomUUID(),
        name: "Ana",
        email: emailA,
        passwordHash,
      }),
    ).toBe("inserted");
    const userA = await store.findUserByEmail(emailA);
    expect(userA?.passwordHash).not.toBe(password);
    expect(userA?.passwordHash.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(userA?.passwordHash ?? "", password)).toBe(
      true,
    );

    const idB = crypto.randomUUID();
    await store.insertUser({
      id: idB,
      name: "Bia",
      email: emailB,
      passwordHash,
    });
    expect(
      await store.insertUser({
        id: crypto.randomUUID(),
        name: "Ana de novo",
        email: emailA,
        passwordHash: "plaintext",
      }),
    ).toBe("exists");

    const own = await getOwnAccount(store, userA?.id ?? "");
    expect(own?.email).toBe(emailA);
    expect(own).not.toHaveProperty("passwordHash");
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.id, userA?.id ?? ""));
    expect(rows.map((row) => row.email)).toEqual([emailA]);
    expect((await store.findUserById(idB))?.email).toBe(emailB);
  });

  it("stores the confirmation token as a hash and rate limits in postgres", async () => {
    const userId = crypto.randomUUID();
    const email = `rate-${userId}@example.com`;
    await store.insertUser({
      id: userId,
      name: "Rate",
      email,
      passwordHash: "hash",
    });
    const raw = `raw-confirmation-token-${userId}`;
    await store.saveVerificationToken({
      tokenHash: sha256(raw),
      userId,
      expiresAt: new Date(Date.now() + 60_000),
    });
    const saved = await store.findVerificationToken(sha256(raw));
    expect(saved?.tokenHash).toBe(sha256(raw));
    expect(saved?.tokenHash).not.toBe(raw);

    const bucket = `test:${userId}`;
    for (let hit = 0; hit < 5; hit += 1) {
      expect((await limiter.hit(bucket, 5, 60_000)).allowed).toBe(true);
    }
    const blocked = await limiter.hit(bucket, 5, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("deletes rate-limit rows older than the longest window", async () => {
    const stale = `stale:${crypto.randomUUID()}`;
    const fresh = `fresh:${crypto.randomUUID()}`;
    const now = new Date();
    await db.insert(schema.authRateLimits).values([
      {
        bucket: stale,
        hits: 4,
        windowStartedAt: new Date(
          now.getTime() - RATE_LIMIT_RETENTION_MS - 1000,
        ),
      },
      {
        bucket: fresh,
        hits: 1,
        windowStartedAt: now,
      },
    ]);

    await limiter.hit(`probe:${crypto.randomUUID()}`, 5, 60_000);

    const rows = await db
      .select({ bucket: schema.authRateLimits.bucket })
      .from(schema.authRateLimits)
      .where(inArray(schema.authRateLimits.bucket, [stale, fresh]));
    expect(rows.map((row) => row.bucket)).toEqual([fresh]);
  });

  it("clears one rate-limit bucket and leaves the other", async () => {
    const account = `account:${crypto.randomUUID()}`;
    const ip = `ip:${crypto.randomUUID()}`;
    await limiter.hit(account, 5, 60_000);
    await limiter.hit(account, 5, 60_000);
    await limiter.hit(ip, 20, 60_000);

    await limiter.reset(account);

    expect((await limiter.hit(account, 5, 60_000)).hits).toBe(1);
    expect((await limiter.hit(ip, 20, 60_000)).hits).toBe(2);
  });
});
