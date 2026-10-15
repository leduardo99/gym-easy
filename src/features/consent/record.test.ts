import { describe, expect, it } from "vitest";

import {
  BODY_DATA_CONSENT_TEXT_SHA256_15B,
  CONSENT_TEXTS,
  consentTextSha256,
  isValidBodyDataConsentGrant,
} from "@/consent/texts";

import { isCurrentConsent } from "./repository";
import { consentInputSchema } from "./schemas";

describe("consentInputSchema", () => {
  it("aceita uma revogação nova e rejeita userId vindo do cliente", () => {
    expect(
      consentInputSchema.parse({
        purpose: "body_data",
        action: "revoked",
        source: "profile",
      }),
    ).toEqual({
      purpose: "body_data",
      action: "revoked",
      source: "profile",
    });

    expect(
      consentInputSchema.safeParse({
        purpose: "analytics",
        action: "granted",
        source: "onboarding",
        userId: "22222222-2222-4222-8222-222222222222",
      }).success,
    ).toBe(false);
  });
});

describe("consent texts", () => {
  it("fixa as versões publicadas (body_data -15c; demais -15b)", () => {
    expect(CONSENT_TEXTS.body_data.version).toBe("body_data-pt-BR-2026-10-15c");
    expect(CONSENT_TEXTS.coach_health.version).toBe(
      "coach_health-pt-BR-2026-10-15b",
    );
    expect(CONSENT_TEXTS.coach_chat.version).toBe(
      "coach_chat-pt-BR-2026-10-15b",
    );
    expect(CONSENT_TEXTS.analytics.version).toBe("analytics-pt-BR-2026-10-15b");
    expect(consentTextSha256("coach_health")).toBe(
      "dbae5392ac91d477f71c5776c19dab7b8ada7b55338f0128b21620465fe5fece",
    );
    expect(consentTextSha256("coach_chat")).toBe(
      "1dc468b4177fa51d916f401f30a3c6e114eefdf55a8bd98cc5d3df55a5d219dc",
    );
    expect(consentTextSha256("analytics")).toBe(
      "3f7e46dc6a382c68570c7b31ed81ea852508f128ca5dda4c7f923e0b78f2ec27",
    );
  });
});

describe("isCurrentConsent", () => {
  const current = {
    purpose: "body_data" as const,
    action: "granted" as const,
    version: CONSENT_TEXTS.body_data.version,
    textSha256: consentTextSha256("body_data"),
  };

  it("aceita a versão publicada e o grant -15b sem reconsentimento", () => {
    expect(isCurrentConsent(current)).toBe(true);
    expect(
      isValidBodyDataConsentGrant({
        action: "granted",
        version: "body_data-pt-BR-2026-10-15b",
        textSha256: BODY_DATA_CONSENT_TEXT_SHA256_15B,
      }),
    ).toBe(true);
    expect(
      isCurrentConsent({
        purpose: "body_data",
        action: "granted",
        version: "body_data-pt-BR-2026-10-15b",
        textSha256: BODY_DATA_CONSENT_TEXT_SHA256_15B,
      }),
    ).toBe(true);
    expect(
      isCurrentConsent({ ...current, version: "body_data-2026-10-14" }),
    ).toBe(false);
    expect(isCurrentConsent({ ...current, textSha256: "ab".repeat(32) })).toBe(
      false,
    );
    expect(isCurrentConsent({ ...current, action: "revoked" })).toBe(false);
  });

  it("recusa a versão -14c de coach_health e coach_chat", () => {
    expect(
      isCurrentConsent({
        purpose: "coach_health",
        action: "granted",
        version: "coach_health-pt-BR-2026-10-14c",
        textSha256: consentTextSha256("coach_health"),
      }),
    ).toBe(false);
    expect(
      isCurrentConsent({
        purpose: "coach_chat",
        action: "granted",
        version: "coach_chat-pt-BR-2026-10-14c",
        textSha256:
          "512ef10a3ea3f8efc2444884553763c6c195fb8dd4e20bfccf23f7ebac140400",
      }),
    ).toBe(false);
    expect(
      isCurrentConsent({
        purpose: "coach_chat",
        action: "granted",
        version: CONSENT_TEXTS.coach_chat.version,
        textSha256: consentTextSha256("coach_chat"),
      }),
    ).toBe(true);
  });
});
