import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { privacyPolicyText } from "@/features/consent/privacy-policy";
import { serverEnvSchema } from "@/lib/env";

import {
  CONSENT_TEXT_PURPOSES,
  CONSENT_TEXTS,
  CONSENT_TEXTS_BY_LOCALE,
  canonicalConsentText,
  consentTextSha256,
} from "./texts";

const PLACEHOLDER = /\{\{[\s\S]*?\}\}/;

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

describe("canonicalConsentText", () => {
  it("junta título, corpo e checkbox em NFC, sem espaço no fim da linha", () => {
    const canonical = canonicalConsentText({
      title: "a\u0301 ",
      body: "linha  \ncorpo",
      checkbox: "ok\t",
    });

    expect(canonical).toBe("\u00e1\n\nlinha\ncorpo\n\nok");
    expect(canonical.normalize("NFC")).toBe(canonical);
    for (const line of canonical.split("\n")) {
      expect(line).toBe(line.trimEnd());
    }
  });
});

describe("textos publicados", () => {
  it("fixa o sha256 de cada versão publicada", () => {
    const hashes = Object.fromEntries(
      CONSENT_TEXT_PURPOSES.map((purpose) => {
        const text = CONSENT_TEXTS[purpose];
        const canonical = canonicalConsentText(text);
        const versions = {
          body_data: "body_data-pt-BR-2026-10-14c",
          coach_health: "coach_health-pt-BR-2026-10-15a",
          coach_chat: "coach_chat-pt-BR-2026-10-15a",
          analytics: "analytics-pt-BR-2026-10-14c",
        } as const;
        expect(text.version).toBe(versions[purpose]);
        expect(text.locale).toBe("pt-BR");
        expect(consentTextSha256(purpose)).toBe(sha256(canonical));
        return [text.version, consentTextSha256(purpose)];
      }),
    );

    expect(hashes).toMatchSnapshot();
  });

  it("falha se algum texto ainda tiver placeholder", () => {
    expect("{{CONTACT_EMAIL}}").toMatch(PLACEHOLDER);

    const published = [
      ...Object.values(CONSENT_TEXTS_BY_LOCALE).flatMap((locale) =>
        Object.values(locale).flatMap((text) => [
          text.version,
          text.title,
          text.body,
          text.checkbox,
          text.transferCheckbox ?? "",
          canonicalConsentText(text),
        ]),
      ),
      privacyPolicyText(),
    ];

    for (const value of published) {
      expect(value).not.toMatch(PLACEHOLDER);
    }
  });

  it("grava contacto@gaffer.pt no texto e não lê CONTACT_EMAIL", () => {
    expect(serverEnvSchema.shape).not.toHaveProperty("CONTACT_EMAIL");
    const serialized = JSON.stringify(CONSENT_TEXTS_BY_LOCALE);
    expect(serialized).toContain("contacto@gaffer.pt");
    expect(serialized).not.toContain("CONTACT_EMAIL");
    expect(serialized).not.toContain("{{");
  });
});
