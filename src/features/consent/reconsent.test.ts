import { describe, expect, it } from "vitest";

import type { AppDatabase } from "@/db";

import {
  RECONSENT_COPY,
  parseReconsentNotice,
  parseReconsentScope,
  reconsentNoticeMessage,
  reconsentPath,
  reconsentRefuseNoticeForScope,
  reconsentRefuseRequiresConfirmation,
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

  it("exige confirmação ao recusar body_data, coach_health e coach_chat", () => {
    expect(reconsentRefuseRequiresConfirmation("body_data")).toBe(true);
    expect(reconsentRefuseRequiresConfirmation("coach_health")).toBe(true);
    expect(reconsentRefuseRequiresConfirmation("coach_chat")).toBe(true);
    expect(reconsentRefuseRequiresConfirmation("analytics")).toBe(false);
  });

  it("codifica avisos de recusa por finalidade", () => {
    expect(reconsentPath("body_data", "/perfil", "refused_body_data")).toBe(
      "/consentimento?scope=body_data&next=%2Fperfil&recusado=corpo",
    );
    expect(parseReconsentNotice("corpo", undefined)).toBe("refused_body_data");
    expect(reconsentRefuseNoticeForScope("body_data")).toBe(
      "refused_body_data",
    );
    expect(reconsentNoticeMessage("refused_body_data")).toBe(
      RECONSENT_COPY.refusedBodyData,
    );
    expect(
      reconsentPath("coach_health", "/perfil", "refused_coach_health"),
    ).toBe("/consentimento?scope=coach_health&next=%2Fperfil&recusado=saude");
    expect(reconsentPath("coach_chat", "/perfil", "refused_coach_chat")).toBe(
      "/consentimento?scope=coach_chat&next=%2Fperfil&recusado=chat",
    );
    expect(parseReconsentNotice("saude", undefined)).toBe(
      "refused_coach_health",
    );
    expect(parseReconsentNotice("chat", undefined)).toBe("refused_coach_chat");
    expect(reconsentRefuseNoticeForScope("coach_health")).toBe(
      "refused_coach_health",
    );
    expect(reconsentNoticeMessage("refused_coach_health")).toBe(
      RECONSENT_COPY.refusedCoachHealth,
    );
    expect(reconsentNoticeMessage("refused_coach_chat")).toBe(
      RECONSENT_COPY.refusedCoachChat,
    );
  });

  it("allowlists purposes that can be recorded", () => {
    expect(parseReconsentScope("body_data")).toBe("body_data");
    expect(parseReconsentScope("coach_health")).toBe("coach_health");
    expect(parseReconsentScope("analytics")).toBe("analytics");
    expect(parseReconsentScope("coach_chat")).toBe("coach_chat");
    expect(parseReconsentScope("admin")).toBeNull();
  });
});

describe("submitReconsent", () => {
  it("refuses and skips the checkbox without writing", async () => {
    const db = dbThatMustNotBeUsed();
    await expect(
      submitReconsent(db, "user", {
        scope: "analytics",
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
    ).resolves.toEqual({ status: "needs_checkbox" });
    await expect(
      submitReconsent(db, "user", {
        scope: "admin",
        intent: "grant",
        accepted: true,
        transferAccepted: true,
      }),
    ).resolves.toEqual({ status: "invalid_scope" });
    expect(RECONSENT_COPY.refused).toContain("continua bloqueada");
  });
});
