import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  CONSENT_TEXTS,
  canonicalConsentText,
  consentTextSha256,
} from "@/consent/texts";

/** Garante que LED-53 não altera os textos -15b (hash canónico). */
describe("consent texts frozen for coach privacy (LED-53)", () => {
  it("mantém o hash SHA-256 canónico de coach_health e coach_chat", () => {
    for (const purpose of ["coach_health", "coach_chat"] as const) {
      const copy = CONSENT_TEXTS[purpose];
      const manual = createHash("sha256")
        .update(canonicalConsentText(copy), "utf8")
        .digest("hex");
      expect(consentTextSha256(purpose)).toBe(manual);
    }
    expect(consentTextSha256("coach_health")).toBe(
      "dbae5392ac91d477f71c5776c19dab7b8ada7b55338f0128b21620465fe5fece",
    );
    expect(consentTextSha256("coach_chat")).toBe(
      "1dc468b4177fa51d916f401f30a3c6e114eefdf55a8bd98cc5d3df55a5d219dc",
    );
  });
});
