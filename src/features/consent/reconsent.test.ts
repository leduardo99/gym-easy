import { describe, expect, it } from "vitest";

import type { AppDatabase } from "@/db";

import {
  RECONSENT_COPY,
  parseReconsentScope,
  reconsentPath,
  safeReconsentNext,
  submitReconsent,
} from "./reconsent";

function dbThatMustNotBeUsed(): AppDatabase {
  return new Proxy({} as AppDatabase, {
    get() {
      throw new Error("consent_log não devia ser lido");
    },
  });
}

describe("reconsent path", () => {
  it("keeps an internal next path and rejects open redirects", () => {
    expect(safeReconsentNext("/perfil")).toBe("/perfil");
    expect(safeReconsentNext("/treinos?aba=1")).toBe("/treinos?aba=1");
    expect(safeReconsentNext("https://evil.example")).toBe("/perfil");
    expect(safeReconsentNext("//evil.example")).toBe("/perfil");
    expect(safeReconsentNext("/\\evil")).toBe("/perfil");
    expect(safeReconsentNext("/consentimento?scope=body_data")).toBe("/perfil");
    expect(reconsentPath("body_data", "https://evil.example")).toBe(
      "/consentimento?scope=body_data&next=%2Fperfil",
    );
  });

  it("allowlists purposes that can be recorded", () => {
    expect(parseReconsentScope("body_data")).toBe("body_data");
    expect(parseReconsentScope("coach_health")).toBe("coach_health");
    expect(parseReconsentScope("analytics")).toBe("analytics");
    expect(parseReconsentScope("coach_chat")).toBeNull();
    expect(parseReconsentScope("admin")).toBeNull();
  });
});

describe("submitReconsent", () => {
  it("refuses and skips the checkbox without writing", async () => {
    const db = dbThatMustNotBeUsed();
    await expect(
      submitReconsent(db, "user", {
        scope: "body_data",
        intent: "refuse",
        accepted: true,
      }),
    ).resolves.toEqual({ status: "refused" });
    await expect(
      submitReconsent(db, "user", {
        scope: "body_data",
        intent: "grant",
        accepted: false,
      }),
    ).resolves.toEqual({ status: "needs_checkbox" });
    await expect(
      submitReconsent(db, "user", {
        scope: "coach_chat",
        intent: "grant",
        accepted: true,
      }),
    ).resolves.toEqual({ status: "invalid_scope" });
    expect(RECONSENT_COPY.refused).toContain("continua bloqueada");
  });
});
