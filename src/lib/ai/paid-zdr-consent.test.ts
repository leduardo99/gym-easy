import { describe, expect, it } from "vitest";

import {
  coachConsentVersionsMeetPaidZdr,
  PAID_ZDR_COACH_CHAT_VERSION_ID,
  PAID_ZDR_COACH_HEALTH_VERSION_ID,
  PAID_ZDR_CONSENT_VERSION_SUFFIX,
} from "./paid-zdr-consent";

describe("paid_zdr coach consent", () => {
  it("rejects -15b style versions when -15c suffix is configured", () => {
    expect(
      coachConsentVersionsMeetPaidZdr(
        {
          coachHealth: "coach_health-pt-BR-2026-10-15b",
          coachChat: "coach_chat-pt-BR-2026-10-15b",
        },
        PAID_ZDR_CONSENT_VERSION_SUFFIX,
      ),
    ).toBe(false);
  });

  it("accepts matching -15c coach_health and coach_chat versions", () => {
    expect(
      coachConsentVersionsMeetPaidZdr(
        {
          coachHealth: PAID_ZDR_COACH_HEALTH_VERSION_ID,
          coachChat: PAID_ZDR_COACH_CHAT_VERSION_ID,
        },
        PAID_ZDR_CONSENT_VERSION_SUFFIX,
      ),
    ).toBe(true);
  });

  it("fails closed when the configured suffix is unset", () => {
    expect(
      coachConsentVersionsMeetPaidZdr(
        {
          coachHealth: PAID_ZDR_COACH_HEALTH_VERSION_ID,
          coachChat: PAID_ZDR_COACH_CHAT_VERSION_ID,
        },
        null,
      ),
    ).toBe(false);
  });
});
