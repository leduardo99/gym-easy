import { describe, expect, it } from "vitest";

import { openConfirmEmail, sealConfirmEmail } from "./confirm-email-cookie";
import { CONFIRM_EMAIL_MAX_AGE_SECONDS } from "./session-cookie";

const secret = "confirm-email-secret-for-unit-tests-00";
const otherSecret = "another-confirm-email-secret-for-tests";
const now = Date.parse("2026-10-14T12:00:00.000Z");

describe("confirm email cookie", () => {
  it("seals the address so the cookie value is not the email", () => {
    const sealed = sealConfirmEmail("ana@example.com", secret, now);

    expect(sealed.startsWith("v1.")).toBe(true);
    expect(sealed).not.toContain("ana@example.com");
    expect(openConfirmEmail(sealed, secret, now)).toBe("ana@example.com");
  });

  it("rejects a tampered cookie", () => {
    const sealed = sealConfirmEmail("ana@example.com", secret, now);
    const [version, packed, signature] = sealed.split(".");
    const flipped = `${packed.slice(0, -1)}${packed.endsWith("a") ? "b" : "a"}`;

    expect(
      openConfirmEmail(`${version}.${flipped}.${signature}`, secret, now),
    ).toBe(null);
    expect(
      openConfirmEmail(
        `${version}.${packed}.${signature.slice(0, -1)}x`,
        secret,
        now,
      ),
    ).toBeNull();
    expect(openConfirmEmail(sealed, otherSecret, now)).toBeNull();
    expect(openConfirmEmail("ana@example.com", secret, now)).toBeNull();
    expect(openConfirmEmail("", secret, now)).toBeNull();
  });

  it("rejects an expired cookie", () => {
    const sealed = sealConfirmEmail("ana@example.com", secret, now);
    const later = now + CONFIRM_EMAIL_MAX_AGE_SECONDS * 1000;

    expect(openConfirmEmail(sealed, secret, later - 1)).toBe("ana@example.com");
    expect(openConfirmEmail(sealed, secret, later)).toBeNull();
  });
});
