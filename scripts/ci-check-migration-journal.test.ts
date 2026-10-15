import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("ci-check-migration-journal", () => {
  it("passes for the current migrations folder", () => {
    const output = execFileSync(
      "node",
      ["scripts/ci-check-migration-journal.mjs"],
      { encoding: "utf8" },
    );
    expect(output).toMatch(/Migration journal OK/);
  });
});
