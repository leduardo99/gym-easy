import { describe, expect, it } from "vitest";

import { routingForAttempt } from "./provider";

describe("routingForAttempt", () => {
  it("uses pinned ZDR routing in paid_zdr mode", () => {
    expect(
      routingForAttempt({
        zdr: true,
        privacyMode: "paid_zdr",
        pinnedProviders: ["deepinfra"],
      }),
    ).toEqual({
      zdr: true,
      data_collection: "deny",
      only: ["deepinfra"],
      allow_fallbacks: false,
    });
  });

  it("keeps standard routing in zdr_only mode", () => {
    expect(
      routingForAttempt({
        zdr: true,
        privacyMode: "zdr_only",
        pinnedProviders: [],
      }),
    ).toEqual({
      zdr: true,
      data_collection: "deny",
      allow_fallbacks: true,
    });
  });
});
