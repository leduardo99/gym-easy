import { describe, expect, it } from "vitest";

import {
  RATE_LIMIT_RESPONSE,
  RED_FLAG_RESPONSE,
  SELF_HARM_RESPONSE,
} from "./copy";

describe("RATE_LIMIT_RESPONSE", () => {
  it("uses formal você concordance (Volte)", () => {
    expect(RATE_LIMIT_RESPONSE).toBe(
      "Você usou as mensagens do coach de hoje. Volte amanhã.",
    );
  });
});

describe("crisis copy", () => {
  it("uses Portuguese emergency contacts and never 911", () => {
    for (const text of [RED_FLAG_RESPONSE, SELF_HARM_RESPONSE]) {
      expect(text).toContain("112 (Portugal)");
      expect(text).toContain("SNS 24 — 808 24 24 24, opção 4");
      expect(text).toContain("SOS Voz Amiga");
      expect(text).toContain("192 (Brasil)");
      expect(text).toContain("CVV — 188");
      expect(text).not.toContain("911");
    }
  });
});
