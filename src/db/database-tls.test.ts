import { describe, expect, it } from "vitest";

import {
  databaseTlsError,
  databaseTlsErrors,
  databaseTlsModeWarning,
} from "./database-tls.mjs";

const verifyFull =
  "postgresql://gym_easy_app:secret@db.internal/gym?sslmode=verify-full";
const required =
  "postgresql://gym_easy_app:secret@db.internal/gym?sslmode=require";
const missing = "postgresql://gym_easy_app:secret@db.internal/gym";
const neonVerifyFull =
  "postgresql://gym_easy_app:secret@ep-example.eu-central-1.aws.neon.tech/gym?sslmode=verify-full";
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

  it("accepts verify-full on neon.tech when DB_TLS_MODE=neon", () => {
    expect(check(neonVerifyFull, "neon")).toBeNull();
  });

  it("refuses sslmode=require on neon.tech when DB_TLS_MODE=neon", () => {
    expect(check(neonRequire, "neon")).toMatch(
      /DB_TLS_MODE=neon requires sslmode=verify-full/,
    );
  });

  it("refuses a non-neon host when DB_TLS_MODE=neon", () => {
    expect(check(verifyFull, "neon")).toMatch(
      /DB_TLS_MODE=neon only allows \*\.neon\.tech/,
    );
  });

  it("requires both URLs to be neon verify-full", () => {
    const errors = databaseTlsErrors({
      nodeEnv: "production",
      tlsMode: "neon",
      urls: [
        { label: "DATABASE_URL", url: neonVerifyFull },
        { label: "DATABASE_URL_MIGRATOR", url: verifyFull },
      ],
    });
    expect(errors).toEqual([
      "DATABASE_URL_MIGRATOR: DB_TLS_MODE=neon only allows *.neon.tech",
    ]);
  });

  it("warns when neon or insecure mode is active and omits the URL", () => {
    const neonWarning = databaseTlsModeWarning({
      nodeEnv: "production",
      tlsMode: "neon",
    });
    const insecureWarning = databaseTlsModeWarning({
      nodeEnv: "production",
      tlsMode: "insecure",
    });
    expect(neonWarning).toMatch(/DB_TLS_MODE=neon is active/);
    expect(neonWarning).toMatch(/both use sslmode=verify-full/);
    expect(insecureWarning).toMatch(/DB_TLS_MODE=insecure is active/);
    expect(`${neonWarning}${insecureWarning}`).not.toMatch(/postgres|secret/u);
    expect(
      databaseTlsModeWarning({ nodeEnv: "test", tlsMode: "neon" }),
    ).toBeNull();
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
