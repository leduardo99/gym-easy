import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_EMAIL_FROM, type ServerEnv } from "@/lib/env";

import { createEmailSender, emailTransport } from "./create-email-sender";

const createSmtpEmailSender = vi.hoisted(() => vi.fn());
const createResendEmailSender = vi.hoisted(() => vi.fn());

vi.mock("./smtp-email-sender", () => ({
  createSmtpEmailSender,
}));

vi.mock("./resend-email-sender", () => ({
  createResendEmailSender,
}));

const confirmSecret = "confirm-email-secret-for-unit-tests-00";

function serverEnv(overrides: Partial<ServerEnv> = {}): ServerEnv {
  return {
    DATABASE_URL: "postgresql://user:password@localhost:5432/gym_easy",
    NODE_ENV: "test",
    RESEND_API_KEY: null,
    EMAIL_FROM: DEFAULT_EMAIL_FROM,
    EMAIL_CAPTURE_PATH: null,
    CONFIRM_EMAIL_SECRET: confirmSecret,
    CONSENT_PSEUDONYM_KEY: "consent-pseudonym-test-key-32b!!",
    APP_URL: "http://127.0.0.1:3000",
    EMAIL_TRANSPORT: "log",
    SMTP_HOST: null,
    SMTP_PORT: null,
    SMTP_USER: null,
    SMTP_PASS: null,
    SMTP_SECURE: false,
    CRON_SECRET: null,
    ...overrides,
  };
}

describe("emailTransport", () => {
  it("prefers the capture sink over smtp and resend", () => {
    expect(
      emailTransport(
        serverEnv({
          EMAIL_CAPTURE_PATH: ".data/emails.jsonl",
          EMAIL_TRANSPORT: "smtp",
          RESEND_API_KEY: "test-resend-key",
        }),
      ),
    ).toBe("capture");
  });

  it("follows EMAIL_TRANSPORT and does not infer resend from the api key", () => {
    expect(
      emailTransport(
        serverEnv({
          EMAIL_TRANSPORT: "smtp",
          RESEND_API_KEY: "test-resend-key",
        }),
      ),
    ).toBe("smtp");
    expect(
      emailTransport(
        serverEnv({
          EMAIL_TRANSPORT: "resend",
          RESEND_API_KEY: null,
        }),
      ),
    ).toBe("resend");
    expect(
      emailTransport(
        serverEnv({
          EMAIL_TRANSPORT: "log",
          RESEND_API_KEY: "test-resend-key",
        }),
      ),
    ).toBe("log");
  });
});

describe("createEmailSender", () => {
  beforeEach(() => {
    createSmtpEmailSender.mockReset();
    createResendEmailSender.mockReset();
    createSmtpEmailSender.mockReturnValue({
      sendAccountConfirmation: vi.fn(),
      sendAccountExistsNotice: vi.fn(),
    });
    createResendEmailSender.mockReturnValue({
      sendAccountConfirmation: vi.fn(),
      sendAccountExistsNotice: vi.fn(),
    });
  });

  it("builds the smtp sender from the server env", () => {
    createEmailSender(
      serverEnv({
        EMAIL_TRANSPORT: "smtp",
        SMTP_HOST: "mailpit",
        SMTP_PORT: 1025,
        SMTP_USER: "mailer",
        SMTP_PASS: "smtp-pass",
        SMTP_SECURE: false,
      }),
    );

    expect(createSmtpEmailSender).toHaveBeenCalledWith({
      host: "mailpit",
      port: 1025,
      user: "mailer",
      pass: "smtp-pass",
      secure: false,
      from: DEFAULT_EMAIL_FROM,
    });
    expect(createResendEmailSender).not.toHaveBeenCalled();
  });

  it("builds the resend sender when that transport is selected", () => {
    createEmailSender(
      serverEnv({
        EMAIL_TRANSPORT: "resend",
        RESEND_API_KEY: "test-resend-key",
      }),
    );

    expect(createResendEmailSender).toHaveBeenCalledWith({
      apiKey: "test-resend-key",
      from: DEFAULT_EMAIL_FROM,
    });
    expect(createSmtpEmailSender).not.toHaveBeenCalled();
  });

  it("falls back to the redacted log sender", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const sender = createEmailSender(
      serverEnv({
        EMAIL_TRANSPORT: "log",
        RESEND_API_KEY: "test-resend-key",
        SMTP_HOST: "mailpit",
        SMTP_PORT: 1025,
      }),
    );

    await sender.sendAccountExistsNotice({ to: "ana@example.com" });

    expect(info).toHaveBeenCalledWith(
      "email.account_exists_notice",
      "a***@[redacted]",
      expect.any(String),
    );
    const logged = info.mock.calls.flat().join(" ");
    expect(logged).not.toContain("ana@example.com");
    expect(logged).not.toContain("example.com");
    expect(createResendEmailSender).not.toHaveBeenCalled();
    expect(createSmtpEmailSender).not.toHaveBeenCalled();
    info.mockRestore();
  });

  it("falls back to the log when the selected transport has no credentials", () => {
    createEmailSender(
      serverEnv({
        EMAIL_TRANSPORT: "smtp",
        SMTP_HOST: null,
        SMTP_PORT: null,
      }),
    );
    createEmailSender(
      serverEnv({
        EMAIL_TRANSPORT: "resend",
        RESEND_API_KEY: null,
      }),
    );

    expect(createSmtpEmailSender).not.toHaveBeenCalled();
    expect(createResendEmailSender).not.toHaveBeenCalled();
  });
});
