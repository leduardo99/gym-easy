import { describe, expect, it } from "vitest";

import { isCronAuthorized } from "./cron-auth";

const secret = "cron-secret-value";

describe("isCronAuthorized", () => {
  it("accepts only the bearer secret", () => {
    expect(isCronAuthorized(`Bearer ${secret}`, secret)).toBe(true);
    expect(isCronAuthorized(`Bearer ${secret} `, secret)).toBe(false);
    expect(isCronAuthorized("Bearer wrong-secret-value", secret)).toBe(false);
    expect(isCronAuthorized(secret, secret)).toBe(false);
    expect(isCronAuthorized(null, secret)).toBe(false);
    expect(isCronAuthorized(`Bearer ${secret}`, null)).toBe(false);
  });
});
