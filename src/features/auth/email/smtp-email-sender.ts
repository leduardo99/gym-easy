import "server-only";

import nodemailer from "nodemailer";

import { copy } from "../copy";
import { redactLogMessage } from "./redact-log";
import type { EmailSender } from "./types";

export type SmtpMailTransport = {
  sendMail(message: {
    from: string;
    to: string;
    subject: string;
    text: string;
  }): Promise<unknown>;
  verify?(): Promise<unknown>;
};

function smtpErrorCode(error: unknown): string {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return "unknown";
  }
  const code = error.code;
  if (typeof code === "string" && /^[A-Z0-9_]{1,32}$/.test(code)) return code;
  return "unknown";
}

export function createSmtpEmailSender(options: {
  host: string;
  port: number;
  user?: string | null;
  pass?: string | null;
  secure: boolean;
  from: string;
  transport?: SmtpMailTransport;
}): EmailSender {
  const user = options.user ?? null;
  const pass = options.pass ?? null;
  const transport =
    options.transport ??
    nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure,
      auth: user ? { user, pass: pass ?? "" } : undefined,
      logger: false,
      debug: false,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });

  async function send(payload: {
    to: string;
    subject: string;
    text: string;
  }): Promise<void> {
    try {
      await transport.sendMail({
        from: options.from,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
      });
    } catch (error) {
      const urls = payload.text.match(/https?:\/\/[^\s]+/g) ?? [];
      console.error(
        "email.smtp_response",
        smtpErrorCode(error),
        redactLogMessage(error instanceof Error ? error.message : "unknown", [
          pass ?? "",
          user ?? "",
          payload.to,
          payload.text,
          ...urls,
        ]),
      );
      throw new Error("email_send_failed");
    }
  }

  return {
    async sendAccountConfirmation({ to, confirmUrl }) {
      await send({
        to,
        subject: copy.confirmSubject,
        text: `Use este link para continuar no Gym Easy:\n${confirmUrl}\n\nO link expira em 24 horas. Se você não criou a conta, ignore este email.`,
      });
    },
    async sendAccountExistsNotice({ to }) {
      await send({
        to,
        subject: copy.accountExistsSubject,
        text: copy.accountExistsNotice,
      });
    },
    async sendPasswordReset({ to }) {
      await send({
        to,
        subject: copy.passwordResetSubject,
        text: copy.passwordResetNotice,
      });
    },
    async probe() {
      if (!transport.verify) return;
      try {
        await transport.verify();
      } catch (error) {
        console.error(
          "email.smtp_response",
          smtpErrorCode(error),
          redactLogMessage(error instanceof Error ? error.message : "unknown", [
            pass ?? "",
            user ?? "",
          ]),
        );
        throw new Error("email_send_failed");
      }
    },
  };
}
