import { parseOptions } from "@node-rs/argon2";
import { describe, expect, it } from "vitest";

import { ARGON2_OPTIONS, hashPassword, verifyPassword } from "./password";

describe("hashPassword", () => {
  it("stores argon2id with the OWASP minimum parameters", async () => {
    const password = "senha com espaço";
    const stored = await hashPassword(password);
    const parsed = parseOptions(stored);

    expect(stored).not.toContain(password);
    expect(stored.startsWith("$argon2id$")).toBe(true);
    expect(parsed.algorithm).toBe(2);
    expect(parsed.memoryCost).toBe(ARGON2_OPTIONS.memoryCost);
    expect(parsed.timeCost).toBe(ARGON2_OPTIONS.timeCost);
    expect(parsed.parallelism).toBe(ARGON2_OPTIONS.parallelism);
    expect(await verifyPassword(stored, password)).toBe(true);
    expect(await verifyPassword(stored, "outra senha")).toBe(false);
  });
});
