// @vitest-environment node
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import {
  databaseTlsErrors,
  databaseTlsModeWarning,
} from "../src/db/database-tls.mjs";
import { consentPrivilegeFailures } from "./migrate-on-deploy.mjs";

function runMigrate(env: Record<string, string | undefined>) {
  return spawnSync(process.execPath, ["scripts/migrate-on-deploy.mjs"], {
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      NODE_ENV: "test",
      ...env,
    },
  });
}

const healthyPrivileges = {
  app_update: false,
  app_delete: false,
  app_truncate: false,
  app_purge_expired: false,
  table_owner: "gym_easy_migrator",
  delete_owner: "gym_easy_migrator",
  purge_owner: "gym_easy_migrator",
};

describe("consent privileges", () => {
  it("accepts the migrator-owned append-only shape", () => {
    expect(consentPrivilegeFailures(healthyPrivileges)).toEqual([]);
  });

  it("names every privilege that would let the app mutate consent proofs", () => {
    expect(
      consentPrivilegeFailures({
        ...healthyPrivileges,
        app_update: true,
        app_delete: true,
        app_truncate: true,
        app_purge_expired: true,
        table_owner: "postgres",
        delete_owner: "postgres",
        purge_owner: "postgres",
      }),
    ).toEqual([
      "gym_easy_app still has UPDATE on consent_log",
      "gym_easy_app still has DELETE on consent_log",
      "gym_easy_app still has TRUNCATE on consent_log",
      "gym_easy_app can EXECUTE purge_expired_consent_proofs",
      "consent_log owner is postgres, expected gym_easy_migrator",
      "delete_account owner is postgres, expected gym_easy_migrator",
      "purge_consent_proofs owner is postgres, expected gym_easy_migrator",
    ]);
  });
});

describe("migrate-on-deploy", () => {
  it("skips when RUN_MIGRATIONS is not true", () => {
    const result = runMigrate({ RUN_MIGRATIONS: "false" });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("migrate-on-deploy: skipped");
  });

  it("exits non-zero without DATABASE_URL_MIGRATOR and does not print a URL", () => {
    const result = runMigrate({ RUN_MIGRATIONS: "true" });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("DATABASE_URL_MIGRATOR");
    expect(`${result.stdout}${result.stderr}`).not.toContain("postgres");
  });

  it("refuses a migrator that is not gym_easy_migrator", () => {
    const secret = "app-role-secret-value";
    const result = runMigrate({
      RUN_MIGRATIONS: "true",
      DATABASE_URL_MIGRATOR: `postgresql://gym_easy_app:${secret}@db.internal/gym?sslmode=require`,
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("gym_easy_migrator");
    expect(`${result.stdout}${result.stderr}`).not.toContain(secret);
  });

  it("requires sslmode=verify-full on the migrator URL in production", () => {
    const secret = "migrator-secret-value";
    const result = runMigrate({
      NODE_ENV: "production",
      RUN_MIGRATIONS: "true",
      DATABASE_URL_MIGRATOR: `postgresql://gym_easy_migrator:${secret}@db.internal/gym?sslmode=require`,
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("sslmode=verify-full is required");
    expect(`${result.stdout}${result.stderr}`).not.toContain(secret);
  });

  it("requires sslmode=verify-full on DATABASE_URL in production", () => {
    const secret = "app-secret-value";
    const result = runMigrate({
      NODE_ENV: "production",
      RUN_MIGRATIONS: "true",
      DATABASE_URL_MIGRATOR:
        "postgresql://gym_easy_migrator:migrator@db.internal/gym?sslmode=verify-full",
      DATABASE_URL: `postgresql://gym_easy_app:${secret}@db.internal/gym?sslmode=require`,
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "DATABASE_URL: sslmode=verify-full is required",
    );
    expect(`${result.stdout}${result.stderr}`).not.toContain(secret);
  });

  it("checks neon verify-full without opening a connection", () => {
    const neon = "postgresql://gym_easy_migrator:migrator@ep.neon.tech/gym";
    expect(
      databaseTlsErrors({
        nodeEnv: "production",
        tlsMode: "neon",
        urls: [
          {
            label: "DATABASE_URL_MIGRATOR",
            url: `${neon}?sslmode=verify-full`,
          },
          { label: "DATABASE_URL", url: `${neon}?sslmode=verify-full` },
        ],
      }),
    ).toEqual([]);
    expect(
      databaseTlsErrors({
        nodeEnv: "production",
        tlsMode: "neon",
        urls: [
          { label: "DATABASE_URL_MIGRATOR", url: `${neon}?sslmode=require` },
        ],
      }),
    ).toEqual([
      "DATABASE_URL_MIGRATOR: DB_TLS_MODE=neon requires sslmode=verify-full",
    ]);
    expect(
      databaseTlsErrors({
        nodeEnv: "production",
        tlsMode: "neon",
        urls: [
          {
            label: "DATABASE_URL_MIGRATOR",
            url: "postgresql://gym_easy_migrator:migrator@db.internal/gym?sslmode=verify-full",
          },
        ],
      }),
    ).toEqual([
      "DATABASE_URL_MIGRATOR: DB_TLS_MODE=neon only allows *.neon.tech",
    ]);
    expect(
      databaseTlsModeWarning({ nodeEnv: "production", tlsMode: "neon" }),
    ).toMatch(/DB_TLS_MODE=neon is active/);
  });

  it("allows DB_TLS_MODE=insecure only for localhost", () => {
    const remote = runMigrate({
      NODE_ENV: "production",
      RUN_MIGRATIONS: "true",
      DB_TLS_MODE: "insecure",
      DATABASE_URL_MIGRATOR:
        "postgresql://gym_easy_migrator:migrator@db.internal/gym",
    });
    expect(remote.status).not.toBe(0);
    expect(remote.stderr).toContain("only allowed for localhost");
  });

  it("refuses a pooled host without printing the connection string", () => {
    const secret = "migrator-secret-value";
    const result = runMigrate({
      RUN_MIGRATIONS: "true",
      DATABASE_URL_MIGRATOR: `postgresql://user:${secret}@ep-pooler.example/gym?sslmode=require`,
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("pooled host");
    expect(`${result.stdout}${result.stderr}`).not.toContain(secret);
  });
});
