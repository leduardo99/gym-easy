import type { ServerEnv } from "@/lib/env";

import { createCaptureEmailSender } from "./capture-email-sender";
import { createLogEmailSender } from "./log-email-sender";
import { createResendEmailSender } from "./resend-email-sender";
import type { EmailSender } from "./types";

export type EmailTransport = "capture" | "resend" | "log";

export function emailTransport(
  env: Pick<ServerEnv, "RESEND_API_KEY" | "EMAIL_CAPTURE_PATH">,
): EmailTransport {
  if (env.EMAIL_CAPTURE_PATH) return "capture";
  if (env.RESEND_API_KEY) return "resend";
  return "log";
}

export function createEmailSender(env: ServerEnv): EmailSender {
  if (env.EMAIL_CAPTURE_PATH) {
    return createCaptureEmailSender(
      env.EMAIL_CAPTURE_PATH,
      createLogEmailSender(),
    );
  }
  if (env.RESEND_API_KEY) {
    return createResendEmailSender({
      apiKey: env.RESEND_API_KEY,
      from: env.EMAIL_FROM,
    });
  }
  return createLogEmailSender();
}
