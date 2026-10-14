import { beforeEach, describe, expect, it, vi } from "vitest";

import { copy } from "../copy";
import { DEFAULT_EMAIL_FROM } from "@/lib/env";

import { createSmtpEmailSender } from "./smtp-email-sender";

const createTransport = vi.hoisted(() => vi.fn());

vi.mock("nodemailer", () => ({
  default: { createTransport },
}));

const confirmUrl =
  "https://gym.example/cadastro/confirmar?token=super-secret-token";

describe("createSmtpEmailSender", () => {
  beforeEach(() => {
    createTransport.mockReset();
    createTransport.mockReturnValue({
      sendMail: vi.fn().mockResolvedValue({ messageId: "queued" }),
    });
  });

  it("sends the same auth messages through the injected transport", async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: "queued" });
    const sender = createSmtpEmailSender({
      host: "mailpit",
      port: 1025,
      secure: false,
      from: DEFAULT_EMAIL_FROM,
      transport: { sendMail },
    });

    await sender.sendAccountConfirmation({
      to: "ana@example.com",
      confirmUrl,
    });
    await sender.sendAccountExistsNotice({ to: "ana@example.com" });

    expect(createTransport).not.toHaveBeenCalled();
    expect(sendMail).toHaveBeenNthCalledWith(1, {
      from: DEFAULT_EMAIL_FROM,
      to: "ana@example.com",
      subject: copy.confirmSubject,
      text: `Use este link para continuar no Gym Easy:\n${confirmUrl}\n\nO link expira em 24 horas. Se você não criou a conta, ignore este email.`,
    });
    expect(sendMail).toHaveBeenNthCalledWith(2, {
      from: DEFAULT_EMAIL_FROM,
      to: "ana@example.com",
      subject: copy.accountExistsSubject,
      text: copy.accountExistsNotice,
    });
  });

  it("logs a redacted smtp failure and throws email_send_failed", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = new Error(
      `535 ana@example.com mailer smtp-pass ${confirmUrl}`,
    );
    Object.assign(failure, { code: "EAUTH" });
    const sendMail = vi.fn().mockRejectedValue(failure);
    const sender = createSmtpEmailSender({
      host: "mailpit",
      port: 1025,
      user: "mailer",
      pass: "smtp-pass",
      secure: false,
      from: DEFAULT_EMAIL_FROM,
      transport: { sendMail },
    });

    await expect(
      sender.sendAccountConfirmation({
        to: "ana@example.com",
        confirmUrl,
      }),
    ).rejects.toThrow(/^email_send_failed$/);

    const logged = error.mock.calls.flat().join(" ");
    expect(error).toHaveBeenCalledWith(
      "email.smtp_response",
      "EAUTH",
      expect.stringContaining("[redacted]"),
    );
    expect(logged).not.toContain("ana@example.com");
    expect(logged).not.toContain("mailer");
    expect(logged).not.toContain("smtp-pass");
    expect(logged).not.toContain("super-secret-token");
    expect(logged).not.toContain(confirmUrl);
    error.mockRestore();
  });

  it("opens nodemailer without auth, debug, or a logger", async () => {
    const sender = createSmtpEmailSender({
      host: "mailpit",
      port: 1025,
      secure: false,
      from: DEFAULT_EMAIL_FROM,
    });

    await sender.sendAccountExistsNotice({ to: "ana@example.com" });

    expect(createTransport).toHaveBeenCalledOnce();
    const options = createTransport.mock.calls[0]?.[0] as {
      host: string;
      port: number;
      secure: boolean;
      auth?: { user: string; pass: string };
      logger: boolean;
      debug: boolean;
    };
    expect(options).toMatchObject({
      host: "mailpit",
      port: 1025,
      secure: false,
      logger: false,
      debug: false,
    });
    expect(options.auth).toBeUndefined();
  });

  it("passes smtp auth only when a user is configured", () => {
    createSmtpEmailSender({
      host: "mailpit",
      port: 1025,
      user: "mailer",
      pass: "smtp-pass",
      secure: true,
      from: DEFAULT_EMAIL_FROM,
    });

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "mailpit",
        port: 1025,
        secure: true,
        auth: { user: "mailer", pass: "smtp-pass" },
        logger: false,
        debug: false,
      }),
    );
  });
});
