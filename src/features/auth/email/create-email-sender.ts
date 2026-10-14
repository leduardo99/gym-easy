import "server-only";

import type { ServerEnv } from "@/lib/env";

import { createCaptureEmailSender } from "./capture-email-sender";
import { createLogEmailSender } from "./log-email-sender";
import { createResendEmailSender } from "./resend-email-sender";
import { createSmtpEmailSender } from "./smtp-email-sender";
import type { EmailSender } from "./types";

export type EmailTransport = "capture" | "resend" | "smtp" | "log";

export function emailTransport(
  env: Pick<ServerEnv, "EMAIL_CAPTURE_PATH" | "EMAIL_TRANSPORT">,
): EmailTransport {
  if (env.EMAIL_CAPTURE_PATH) return "capture";
  return env.EMAIL_TRANSPORT;
}

export function createEmailSender(env: ServerEnv): EmailSender {
  const transport = emailTransport(env);
  if (transport === "capture" && env.EMAIL_CAPTURE_PATH) {
    return createCaptureEmailSender(
      env.EMAIL_CAPTURE_PATH,
      createLogEmailSender(),
    );
  }
  if (transport === "resend") {
    if (!env.RESEND_API_KEY) throw new Error("email_transport_unavailable");
    return createResendEmailSender({
      apiKey: env.RESEND_API_KEY,
      from: env.EMAIL_FROM,
    });
  }
  if (transport === "smtp") {
    if (!env.SMTP_HOST || !env.SMTP_PORT) {
      throw new Error("email_transport_unavailable");
    }
    return createSmtpEmailSender({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
      secure: env.SMTP_SECURE,
      from: env.EMAIL_FROM,
    });
  }
  if (transport === "log") return createLogEmailSender();
  throw new Error("email_transport_unavailable");
}
