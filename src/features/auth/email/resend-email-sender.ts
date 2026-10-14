import { copy } from "../copy";
import type { EmailSender } from "./types";

export const RESEND_EMAILS_URL = "https://api.resend.com/emails";

export function createResendEmailSender(options: {
  apiKey: string;
  from: string;
  fetchImpl?: typeof fetch;
}): EmailSender {
  const fetchImpl = options.fetchImpl ?? fetch;

  async function send(payload: {
    to: string;
    subject: string;
    text: string;
  }): Promise<void> {
    const response = await fetchImpl(RESEND_EMAILS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: options.from,
        to: [payload.to],
        subject: payload.subject,
        text: payload.text,
      }),
    });
    if (!response.ok) {
      console.error("email.resend_response", response.status);
      throw new Error("email_send_failed");
    }
    console.info("email.resend_response", response.status);
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
  };
}
