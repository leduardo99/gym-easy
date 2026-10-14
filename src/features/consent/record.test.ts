import { describe, expect, it } from "vitest";

import { CONSENT_TEXTS, consentTextSha256 } from "@/consent/texts";

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
  it("fixa a versão pt-BR 2026-10-14c, incluindo o chat", () => {
    expect(CONSENT_TEXTS.body_data.version).toBe("body_data-pt-BR-2026-10-14c");
    expect(CONSENT_TEXTS.coach_health.version).toBe(
      "coach_health-pt-BR-2026-10-14c",
    );
    expect(CONSENT_TEXTS.coach_chat.version).toBe(
      "coach_chat-pt-BR-2026-10-14c",
    );
    expect(CONSENT_TEXTS.analytics.version).toBe("analytics-pt-BR-2026-10-14c");
    expect(consentTextSha256("body_data")).toMatch(/^[a-f0-9]{64}$/);
    expect(consentTextSha256("coach_chat")).toMatch(/^[a-f0-9]{64}$/);
  });
});
