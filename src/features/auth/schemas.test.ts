import { describe, expect, it } from "vitest";

import { copy, fieldSummary, rateLimitMessage } from "./copy";
import { loginSchema, signupSchema } from "./schemas";

const validSignup = {
  name: "Ana Souza",
  email: "ana@example.com",
  password: "senha segura",
};

describe("signupSchema", () => {
  it("normalizes email and keeps spaces inside the password", () => {
    expect(
      signupSchema.parse({
        ...validSignup,
        email: "  Ana@X.com  ",
        password: "senha segura",
      }),
    ).toEqual({
      name: "Ana Souza",
      email: "ana@x.com",
      password: "senha segura",
    });
  });

  it("accepts accents and emoji in the name", () => {
    expect(signupSchema.parse({ ...validSignup, name: "José 🏋️" }).name).toBe(
      "José 🏋️",
    );
  });

  it("rejects an empty name and a name over 80 characters", () => {
    expect(
      signupSchema.safeParse({ ...validSignup, name: "   " }).error?.issues[0]
        ?.message,
    ).toBe(copy.nameRequired);
    expect(
      signupSchema.safeParse({ ...validSignup, name: "a".repeat(81) }).error
        ?.issues[0]?.message,
    ).toBe(copy.nameMax);
  });

  it("rejects an empty email and a malformed email", () => {
    expect(
      signupSchema.safeParse({ ...validSignup, email: "  " }).error?.issues[0]
        ?.message,
    ).toBe(copy.emailRequired);
    expect(
      signupSchema.safeParse({ ...validSignup, email: "ana@" }).error?.issues[0]
        ?.message,
    ).toBe(copy.emailInvalid);
  });

  it("rejects passwords outside 8 to 64 characters without composition rules", () => {
    expect(
      signupSchema.safeParse({ ...validSignup, password: "curta" }).error
        ?.issues[0]?.message,
    ).toBe(copy.passwordMin);
    expect(
      signupSchema.safeParse({
        ...validSignup,
        password: "a".repeat(65),
      }).error?.issues[0]?.message,
    ).toBe(copy.passwordMax);
    expect(
      signupSchema.safeParse({ ...validSignup, password: "senha sem número" })
        .success,
    ).toBe(true);
  });

  it("counts unicode code points for the password length", () => {
    expect(
      signupSchema.safeParse({
        ...validSignup,
        password: "🏋️".repeat(8),
      }).success,
    ).toBe(true);
  });

  it("strips extra fields such as role and password_hash", () => {
    const parsed = signupSchema.parse({
      ...validSignup,
      id: "user-1",
      role: "admin",
      password_hash: "plaintext",
    });

    expect(parsed).toEqual(validSignup);
    expect(parsed).not.toHaveProperty("role");
    expect(parsed).not.toHaveProperty("password_hash");
  });

  it("rejects a non-string name instead of throwing", () => {
    expect(signupSchema.safeParse({ ...validSignup, name: 12 }).success).toBe(
      false,
    );
  });
});

describe("loginSchema", () => {
  it("requires a password and does not demand eight characters", () => {
    expect(
      loginSchema.safeParse({ email: "ana@example.com", password: "" }).error
        ?.issues[0]?.message,
    ).toBe(copy.passwordRequired);
    expect(
      loginSchema.safeParse({ email: "ana@example.com", password: "curta" })
        .success,
    ).toBe(true);
  });
});

describe("auth copy", () => {
  it("builds the rate limit and field summary messages", () => {
    expect(rateLimitMessage(45)).toBe(
      "Muitas tentativas. Aguarde 1 minuto(s) e tente de novo.",
    );
    expect(rateLimitMessage(undefined)).toBe(copy.rateLimitUnknown);
    expect(fieldSummary(1)).toBeNull();
    expect(fieldSummary(2)).toBe("Corrija 2 campos para continuar.");
  });
});
