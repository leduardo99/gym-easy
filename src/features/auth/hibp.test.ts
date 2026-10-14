import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import { createHibpBreachChecker } from "./hibp";

describe("createHibpBreachChecker", () => {
  it("detects a breached password from the k-anonymity range", async () => {
    const password = "senha-vazada";
    const digest = createHash("sha1")
      .update(password)
      .digest("hex")
      .toUpperCase();
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      expect(String(input)).toBe(
        `https://api.pwnedpasswords.com/range/${digest.slice(0, 5)}`,
      );
      return new Response(`${digest.slice(5)}:12\nFFFFF:1\n`, { status: 200 });
    });

    await expect(
      createHibpBreachChecker(fetchImpl).isBreached(password),
    ).resolves.toBe(true);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("fails open when the range API is unavailable", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      throw new Error("offline");
    });

    await expect(
      createHibpBreachChecker(fetchImpl).isBreached("qualquer-senha-longa"),
    ).resolves.toBe(false);
  });
});
