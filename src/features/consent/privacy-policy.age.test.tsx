import { readFileSync } from "node:fs";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.unmock("@/features/profile/age");

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  cleanup();
});

describe("privacy policy minimum age", () => {
  it("não hardcodeia anos na fonte da política", () => {
    const source = readFileSync(
      "src/features/consent/privacy-policy.ts",
      "utf8",
    );
    expect(source).toContain("MINIMUM_AGE_YEARS");
    expect(source).not.toMatch(/é 16 anos/);
    expect(source).not.toMatch(/pelo menos 16 anos/);
    expect(source).not.toMatch(/idade mínima.*\b16\b/);
  });

  it("liga a frase de idade mínima a MINIMUM_AGE_YEARS (mock 18)", async () => {
    vi.doMock("@/features/profile/age", () => ({
      MINIMUM_AGE_YEARS: 18,
    }));
    const { privacyPolicyMinimumAgeSentence, PRIVACY_POLICY_MINIMUM_AGE_ID } =
      await import("./privacy-policy");
    const { default: PrivacyPage } = await import("@/app/privacidade/page");

    const expectedMinimumAge = `A idade mínima para usar o Gym Easy é ${18} anos.`;
    expect(privacyPolicyMinimumAgeSentence()).toBe(expectedMinimumAge);

    render(<PrivacyPage />);
    expect(
      document.getElementById(PRIVACY_POLICY_MINIMUM_AGE_ID),
    ).toHaveTextContent(expectedMinimumAge);
    expect(
      document.getElementById(PRIVACY_POLICY_MINIMUM_AGE_ID),
    ).not.toHaveTextContent(`${16} anos`);
  });
});
