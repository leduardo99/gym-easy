import { describe, expect, it } from "vitest";

import { signupRegistrationIp } from "./signup-ip";

describe("signupRegistrationIp", () => {
  it("usa o IP real quando a captura de email está desativada", () => {
    expect(signupRegistrationIp(null, "203.0.113.10")).toBe("203.0.113.10");
  });

  it("não envia IP quando a captura de email está ativa", () => {
    expect(signupRegistrationIp(".data/e2e-emails.jsonl", "203.0.113.10")).toBe(
      null,
    );
  });
});
