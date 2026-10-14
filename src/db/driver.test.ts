import { describe, expect, it } from "vitest";

import { shouldUsePgDriver } from "./driver";

describe("shouldUsePgDriver", () => {
  it("uses the neon http driver for a neon host", () => {
    expect(
      shouldUsePgDriver(
        "postgresql://user:pass@ep-example.neon.tech/gym?sslmode=require",
        "",
      ),
    ).toBe(false);
  });

  it("uses pg for localhost so CI can run without Neon", () => {
    expect(
      shouldUsePgDriver("postgresql://gym:gym@127.0.0.1:5432/gym_easy", ""),
    ).toBe(true);
  });

  it("lets DATABASE_DRIVER force either driver", () => {
    expect(
      shouldUsePgDriver("postgresql://gym:gym@127.0.0.1/gym", "neon"),
    ).toBe(false);
    expect(
      shouldUsePgDriver("postgresql://user:pass@ep.neon.tech/gym", "pg"),
    ).toBe(true);
  });
});
