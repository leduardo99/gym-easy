import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("0010_consent_hardening", () => {
  const sql = readFileSync(
    "src/db/migrations/0010_consent_hardening.sql",
    "utf8",
  );

  it("cria as roles de forma idempotente e entrega o purge à app", () => {
    expect(sql).toContain('CREATE ROLE "gym_easy_app" NOLOGIN');
    expect(sql).toContain('CREATE ROLE "gym_easy_purge" NOLOGIN');
    expect(sql).toContain("WHEN duplicate_object THEN NULL");
    expect(sql).toContain('GRANT "gym_easy_purge" TO "gym_easy_app"');
  });

  it("tira o bypass por set_config e fixa o corte de 3 anos na função", () => {
    expect(sql).not.toContain("gym_easy.consent_retention");
    expect(sql).not.toContain("set_config");
    expect(sql).toContain(
      'CREATE OR REPLACE FUNCTION "purge_consent_proofs"()',
    );
    expect(sql).toContain("now() - interval '3 years'");
    expect(sql).toContain(
      'GRANT EXECUTE ON FUNCTION "purge_consent_proofs"() TO "gym_easy_purge"',
    );
    expect(sql).toContain(
      'REVOKE ALL ON FUNCTION "purge_expired_consent_proofs"(timestamp with time zone) FROM PUBLIC, "gym_easy_app"',
    );
    expect(sql).toContain("SECURITY DEFINER");
  });
});
