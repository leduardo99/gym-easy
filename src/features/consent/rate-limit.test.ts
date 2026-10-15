import { describe, expect, it } from "vitest";

import { sha256 } from "@/features/auth/tokens";

import { bodyDataPrivacyBucket } from "./rate-limit";

describe("bodyDataPrivacyBucket", () => {
  it("hashes the user id with sha256", () => {
    const userId = "user-abc";
    expect(bodyDataPrivacyBucket(userId)).toBe(
      `body-data-privacy:${sha256(userId)}`,
    );
  });
});
