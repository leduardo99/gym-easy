import { copy } from "../copy";
import type { EmailSender } from "./types";

export const RESEND_EMAILS_URL = "https://api.resend.com/emails";

function resendFailure(httpStatus: number, body: string): [number, string] {
  let statusCode = httpStatus;
  let name = "unknown";
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed && typeof parsed === "object") {
      const record = parsed as { statusCode?: unknown; name?: unknown };
      if (
        typeof record.statusCode === "number" &&
        Number.isInteger(record.statusCode) &&
        record.statusCode >= 100 &&
        record.statusCode <= 599
      ) {
        statusCode = record.statusCode;
      }
      if (
        typeof record.name === "string" &&
        /^[a-z0-9_]{1,64}$/i.test(record.name)
      ) {
        name = record.name;
      }
    }
  } catch {
    // Keep the HTTP status when the body is not JSON.
  }
  return [statusCode, name];
}

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
      const [statusCode, name] = resendFailure(
        response.status,
        await response.text(),
      );
      console.error("email.resend_response", statusCode, name);
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
  };
}
