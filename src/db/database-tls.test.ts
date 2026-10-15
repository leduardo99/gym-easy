import { describe, expect, it } from "vitest";

import { databaseTlsError } from "./database-tls.mjs";

const verifyFull =
  "postgresql://gym_easy_app:secret@db.internal/gym?sslmode=verify-full";
const required =
  "postgresql://gym_easy_app:secret@db.internal/gym?sslmode=require";
const missing = "postgresql://gym_easy_app:secret@db.internal/gym";
const neonRequire =
  "postgresql://gym_easy_app:secret@ep-example.eu-central-1.aws.neon.tech/gym?sslmode=require";
const localMissing = "postgresql://gym_easy_app:secret@127.0.0.1:5432/gym";

function check(databaseUrl: string, tlsMode?: string, nodeEnv = "production") {
  return databaseTlsError({
    nodeEnv,
    databaseUrl,
    label: "DATABASE_URL",
    tlsMode,
  });
}

describe("database TLS", () => {
  it("accepts sslmode=verify-full in production", () => {
    expect(check(verifyFull)).toBeNull();
  });

  it("refuses sslmode=require in production", () => {
    expect(check(required)).toMatch(/sslmode=verify-full is required/);
  });

  it("refuses a production URL without sslmode", () => {
    expect(check(missing)).toMatch(/sslmode=verify-full is required/);
  });

  it("accepts sslmode=require on neon.tech when DB_TLS_MODE=neon", () => {
    expect(check(neonRequire, "neon")).toBeNull();
  });

  it("accepts verify-full on neon.tech when DB_TLS_MODE=neon", () => {
    expect(
      check(
        "postgresql://gym_easy_app:secret@ep-example.eu-central-1.aws.neon.tech/gym?sslmode=verify-full",
        "neon",
      ),
    ).toBeNull();
  });

  it("refuses sslmode=require on a non-neon host when DB_TLS_MODE=neon", () => {
    expect(check(required, "neon")).toMatch(
      /only allows sslmode=require on \*\.neon\.tech/,
    );
  });

  it("refuses DB_TLS_MODE=neon without require or verify-full", () => {
    expect(
      check(
        "postgresql://gym_easy_app:secret@ep-example.aws.neon.tech/gym",
        "neon",
      ),
    ).toMatch(/accepts sslmode=require or sslmode=verify-full/);
  });

  it("accepts DB_TLS_MODE=insecure only for a local host", () => {
    expect(check(localMissing, "insecure")).toBeNull();
    expect(
      check("postgresql://gym_easy_app:secret@localhost/gym", "insecure"),
    ).toBeNull();
  });

  it("refuses DB_TLS_MODE=insecure for a remote host", () => {
    expect(check(missing, "insecure")).toMatch(/only allowed for localhost/);
  });

  it("refuses an unknown DB_TLS_MODE", () => {
    expect(check(verifyFull, "off")).toMatch(
      /DB_TLS_MODE must be verify-full, neon, or insecure/,
    );
  });

  it("does not apply outside production or during next build", () => {
    expect(check(missing, undefined, "test")).toBeNull();
    expect(check(missing, undefined, "development")).toBeNull();
    expect(
      databaseTlsError({
        nodeEnv: "production",
        databaseUrl: missing,
        label: "DATABASE_URL",
        productionBuild: true,
      }),
    ).toBeNull();
  });
});
