import { describe, expect, it } from "vitest";

import {
  DEFAULT_DB_CONNECT_TIMEOUT_SECONDS,
  DEFAULT_DB_IDLE_TIMEOUT_SECONDS,
  DEFAULT_DB_POOL_MAX,
  DEFAULT_DB_STATEMENT_TIMEOUT_MS,
  isLocalDatabaseUrl,
  postgresClientOptions,
  readDbPoolConfig,
} from "./driver";

describe("readDbPoolConfig", () => {
  it("defaults the pool to 5 and sets the timeouts", () => {
    expect(readDbPoolConfig({})).toEqual({
      poolMax: DEFAULT_DB_POOL_MAX,
      idleTimeoutSeconds: DEFAULT_DB_IDLE_TIMEOUT_SECONDS,
      connectTimeoutSeconds: DEFAULT_DB_CONNECT_TIMEOUT_SECONDS,
      statementTimeoutMs: DEFAULT_DB_STATEMENT_TIMEOUT_MS,
    });
  });

  it("accepts a pool from 5 to 10", () => {
    expect(readDbPoolConfig({ DB_POOL_MAX: "10" })).toMatchObject({
      poolMax: 10,
    });
  });

  it("rejects a pool outside 5 to 10", () => {
    expect(readDbPoolConfig({ DB_POOL_MAX: "4" })).toMatch(
      /DB_POOL_MAX must be an integer from 5 to 10/,
    );
    expect(readDbPoolConfig({ DB_POOL_MAX: "11" })).toMatch(/DB_POOL_MAX/);
    expect(readDbPoolConfig({ DB_POOL_MAX: "five" })).toMatch(/DB_POOL_MAX/);
  });
});

describe("postgresClientOptions", () => {
  it("maps the pool settings and leaves TLS to sslmode on the URL", () => {
    expect(
      postgresClientOptions({
        poolMax: 5,
        idleTimeoutSeconds: 20,
        connectTimeoutSeconds: 10,
        statementTimeoutMs: 15_000,
      }),
    ).toEqual({
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
      connection: { statement_timeout: 15_000 },
    });
    expect(
      "ssl" in
        postgresClientOptions({
          poolMax: 5,
          idleTimeoutSeconds: 20,
          connectTimeoutSeconds: 10,
          statementTimeoutMs: 15_000,
        }),
    ).toBe(false);
  });
});

describe("isLocalDatabaseUrl", () => {
  it("recognizes the CI postgres host and a remote URL with sslmode", () => {
    expect(
      isLocalDatabaseUrl("postgresql://postgres:postgres@127.0.0.1:5432/gym"),
    ).toBe(true);
    expect(
      isLocalDatabaseUrl(
        "postgresql://user:pass@db.internal/gym?sslmode=require",
      ),
    ).toBe(false);
  });
});
