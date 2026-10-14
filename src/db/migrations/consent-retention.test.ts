import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("0008_consent_retention", () => {
  const sql = readFileSync(
    "src/db/migrations/0008_consent_retention.sql",
    "utf8",
  );

  it("troca o cascade por set null e guarda a prova pseudonimizada", () => {
    expect(sql).toContain(
      'ADD CONSTRAINT "consent_log_id_user_id_unique" UNIQUE("id","user_id")',
    );
    expect(sql).toContain('ADD COLUMN "subject_pseudonym" text');
    expect(sql).toContain('ADD COLUMN "key_version" smallint');
    expect(sql).toContain(
      'ADD COLUMN "deleted_account_at" timestamp with time zone',
    );
    expect(sql).toMatch(/ON DELETE set null/i);
    expect(sql).not.toMatch(
      /consent_log_user_id_users_id_fk" FOREIGN KEY \("user_id"\) REFERENCES "public"\."users"\("id"\) ON DELETE cascade/i,
    );
    expect(sql).toContain('CREATE OR REPLACE FUNCTION "delete_account"');
    expect(sql).toContain(
      'CREATE OR REPLACE FUNCTION "purge_expired_consent_proofs"',
    );
  });

  it("só deixa a exclusão da conta nulificar o usuário e o purge apagar prova já pseudonimizada", () => {
    expect(sql).toContain("consent_log is append-only");
    expect(sql).toContain("gym_easy.consent_retention");
    expect(sql).toContain("subject_pseudonym");
    expect(sql).toContain(
      "consent proof must be pseudonymized before account deletion",
    );
  });
});
