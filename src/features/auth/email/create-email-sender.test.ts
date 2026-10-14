import { describe, expect, it } from "vitest";

import { emailTransport } from "./create-email-sender";

describe("emailTransport", () => {
  it("prefers the capture sink, then Resend, then the log", () => {
    expect(
      emailTransport({
        EMAIL_CAPTURE_PATH: ".data/emails.jsonl",
        RESEND_API_KEY: "test-resend-key",
      }),
    ).toBe("capture");
    expect(
      emailTransport({
        EMAIL_CAPTURE_PATH: null,
        RESEND_API_KEY: "test-resend-key",
      }),
    ).toBe("resend");
    expect(
      emailTransport({ EMAIL_CAPTURE_PATH: null, RESEND_API_KEY: null }),
    ).toBe("log");
  });
});
