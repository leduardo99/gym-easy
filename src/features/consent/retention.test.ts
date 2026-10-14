import { describe, expect, it } from "vitest";

import { consentProofCutoff } from "./retention";
import { PRIVACY_POLICY, privacyPolicyText } from "./privacy-policy";

describe("consentProofCutoff", () => {
  it("recua exatamente 3 anos em UTC", () => {
    expect(consentProofCutoff(new Date("2026-10-14T12:30:00.000Z"))).toEqual(
      new Date("2023-10-14T12:30:00.000Z"),
    );
  });
});

describe("privacy policy", () => {
  it("declara a retenção de 3 anos da prova pseudonimizada", () => {
    const text = privacyPolicyText();
    expect(PRIVACY_POLICY.retentionYears).toBe(3);
    expect(text).toMatch(/3 anos/);
    expect(text).toMatch(/pseudônim/i);
    expect(text).toMatch(/não guarda email/i);
    expect(text).toMatch(/defesa legal/i);
  });
});
