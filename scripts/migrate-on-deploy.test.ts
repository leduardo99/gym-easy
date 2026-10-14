// @vitest-environment node
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

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
