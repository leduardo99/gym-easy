import { describe, expect, it } from "vitest";

import { CONSENT_TEXTS, consentTextSha256 } from "@/consent/texts";

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
  it("fixa as versões publicadas, com coach na -15a", () => {
    expect(CONSENT_TEXTS.body_data.version).toBe("body_data-pt-BR-2026-10-14c");
    expect(CONSENT_TEXTS.coach_health.version).toBe(
      "coach_health-pt-BR-2026-10-15a",
    );
    expect(CONSENT_TEXTS.coach_chat.version).toBe(
      "coach_chat-pt-BR-2026-10-15a",
    );
    expect(CONSENT_TEXTS.analytics.version).toBe("analytics-pt-BR-2026-10-14c");
    expect(consentTextSha256("coach_health")).toBe(
      "9e02990187a9d2238716816dcec5bf2016818da83e27580d75ea10ce7b42821d",
    );
    expect(consentTextSha256("coach_chat")).toBe(
      "f819b9d9d13289ff66a0d1db09fe8fd7e32d85016678d28313cc8aa0278fa9b7",
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

  it("aceita só a versão e o hash publicados", () => {
    expect(isCurrentConsent(current)).toBe(true);
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
