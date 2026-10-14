import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { CONSENT_KEY_VERSION, consentSubjectPseudonym } from "./pseudonym";

const key = "consent-pseudonym-test-key-32b!!";
const userId = "11111111-1111-4111-8111-111111111111";

describe("consentSubjectPseudonym", () => {
  it("é o HMAC-SHA256 da versão da chave e do id, em hex", () => {
    expect(CONSENT_KEY_VERSION).toBe(1);
    expect(consentSubjectPseudonym(userId, key)).toBe(
      createHmac("sha256", key).update(`1:${userId}`).digest("hex"),
    );
  });

  it("muda com o usuário e com a chave, e não contém o id", () => {
    const first = consentSubjectPseudonym(userId, key);
    const otherUser = consentSubjectPseudonym(
      "22222222-2222-4222-8222-222222222222",
      key,
    );
    const otherKey = consentSubjectPseudonym(userId, `${key}-rotated`);

    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(otherUser).not.toBe(first);
    expect(otherKey).not.toBe(first);
    expect(first).not.toContain(userId);
  });
});
