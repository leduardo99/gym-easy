import { describe, expect, it } from "vitest";

import { redactLogMessage, redactRecipient } from "./redact-log";

describe("redactLogMessage", () => {
  it("redacts email addresses and secrets and keeps the message short", () => {
    const message = redactLogMessage(
      "Invalid `to` field. ana@example.com was rejected by smtp-pass and test-resend-key",
      ["smtp-pass", "test-resend-key"],
    );

    expect(message).toBe(
      "Invalid `to` field. [redacted] was rejected by [redacted] and [redacted]",
    );
    expect(message).not.toContain("ana@example.com");
    expect(message).not.toContain("smtp-pass");
    expect(message).not.toContain("test-resend-key");
  });
});

describe("redactRecipient", () => {
  it("keeps one character and drops the domain", () => {
    expect(redactRecipient("ana@example.com")).toBe("a***@[redacted]");
    expect(redactRecipient("ana@example.com")).not.toContain("example.com");
    expect(redactRecipient("sem-arroba")).toBe("[redacted]");
  });
});
