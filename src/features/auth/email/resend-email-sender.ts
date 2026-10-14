import { copy } from "../copy";
import { redactLogMessage } from "./redact-log";
import type { EmailSender } from "./types";

export const RESEND_EMAILS_URL = "https://api.resend.com/emails";

function resendFailure(
  httpStatus: number,
  body: string,
  apiKey: string,
): { statusCode: number; name: string; message: string } {
  let statusCode = httpStatus;
  let name = "unknown";
  let message = "unknown";
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed && typeof parsed === "object") {
      const record = parsed as {
        statusCode?: unknown;
        name?: unknown;
        message?: unknown;
      };
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
      message = redactLogMessage(record.message, [apiKey]);
    }
  } catch {
    // Keep the HTTP status when the body is not JSON.
  }
  return { statusCode, name, message };
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
      const failure = resendFailure(
        response.status,
        await response.text(),
        options.apiKey,
      );
      console.error(
        "email.resend_response",
        failure.statusCode,
        failure.name,
        failure.message,
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
      let response: Response;
      try {
        response = await fetchImpl(RESEND_EMAILS_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${options.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ from: options.from, to: [] }),
        });
      } catch {
        throw new Error("email_send_failed");
      }
      if (response.ok) throw new Error("email_send_failed");
      const failure = resendFailure(
        response.status,
        await response.text(),
        options.apiKey,
      );
      const unavailable =
        failure.statusCode === 401 ||
        failure.statusCode === 403 ||
        failure.statusCode === 408 ||
        failure.statusCode === 429 ||
        failure.statusCode >= 500 ||
        /quota|rate_limit|api_key/i.test(failure.name);
      if (!unavailable) return;
      console.error(
        "email.resend_response",
        failure.statusCode,
        failure.name,
        failure.message,
      );
      throw new Error("email_send_failed");
    },
  };
}
