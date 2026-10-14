import { describe, expect, it } from "vitest";

import { BUILD_DATABASE_URL, readServerEnv } from "./env";

const validUrl = "postgresql://user:password@localhost:5432/gym_easy";

describe("readServerEnv", () => {
  it("accepts a postgres connection string", () => {
    expect(readServerEnv({ DATABASE_URL: validUrl, NODE_ENV: "test" })).toEqual(
      {
        DATABASE_URL: validUrl,
        NODE_ENV: "test",
      },
    );
  });

  it("rejects a missing database url outside of the production build", () => {
    expect(() => readServerEnv({ NODE_ENV: "development" })).toThrow(
      /DATABASE_URL/,
    );
  });

  it("rejects a non-postgres url", () => {
    expect(() =>
      readServerEnv({
        DATABASE_URL: "mysql://user:password@localhost:3306/gym_easy",
        NODE_ENV: "test",
      }),
    ).toThrow(/postgres/);
  });

  it("rejects a database url exposed with the public prefix", () => {
    expect(() =>
      readServerEnv({
        DATABASE_URL: validUrl,
        NEXT_PUBLIC_DATABASE_URL: validUrl,
        NODE_ENV: "test",
      }),
    ).toThrow(/NEXT_PUBLIC_/);
  });

  it("uses a non-connecting placeholder while next build has no database url", () => {
    expect(
      readServerEnv({
        NODE_ENV: "production",
        NEXT_PHASE: "phase-production-build",
      }).DATABASE_URL,
    ).toBe(BUILD_DATABASE_URL);
  });

  it("does not treat the npm build lifecycle as a next production build", () => {
    expect(() =>
      readServerEnv({
        NODE_ENV: "production",
        npm_lifecycle_event: "build",
      }),
    ).toThrow(/DATABASE_URL/);
  });
});
