import { describe, expect, it } from "vitest";

import { FILTERED_OUTPUT, sanitizeCoachOutput } from "./output";

describe("sanitizeCoachOutput", () => {
  it("replaces medication and diagnosis wording with the fixed refusal", () => {
    for (const text of [
      "Tome 500mg de algo.",
      "Ibuprofeno ajuda na dor.",
      "PARACETAMOL antes do treino.",
      "Evite anabolizante.",
      "Winstrol não é treino.",
      "Use 10 mg por dia.",
    ]) {
      const result = sanitizeCoachOutput(text);
      expect(result.filtered).toBe(true);
      expect(result.text).toBe(FILTERED_OUTPUT);
    }
  });

  it("keeps normal coaching text when no medication pattern matches", () => {
    const text = "Faça quatro séries de agachamento com boa forma.";
    const result = sanitizeCoachOutput(text);
    expect(result.filtered).toBe(false);
    expect(result.text).toBe(text);
  });

  it("does not filter isolated mg without a dose", () => {
    const text = "A sigla mg aparece no texto sem número.";
    const result = sanitizeCoachOutput(text);
    expect(result.filtered).toBe(false);
    expect(result.text).toBe(text);
  });

  it("strips HTML, markdown links and bare URLs but keeps readable text", () => {
    const raw =
      "<b>Supino</b> com [guia](https://example.com/a) e https://evil.test/x";
    const result = sanitizeCoachOutput(raw);
    expect(result.filtered).toBe(true);
    expect(result.text).toBe("Supino com guia e");
  });

  it("returns empty text when stripping removes everything", () => {
    const result = sanitizeCoachOutput("  <span></span>  ");
    expect(result.filtered).toBe(true);
    expect(result.text).toBe("");
  });
});
