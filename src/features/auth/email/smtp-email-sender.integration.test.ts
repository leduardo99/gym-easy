// @vitest-environment node
import { describe, expect, it } from "vitest";

import { copy } from "../copy";
import { DEFAULT_EMAIL_FROM } from "@/lib/env";

import { createSmtpEmailSender } from "./smtp-email-sender";

const smtpHost = process.env.MAILPIT_SMTP_HOST;
const apiUrl = process.env.MAILPIT_API_URL;
const smtpPort = Number(process.env.MAILPIT_SMTP_PORT ?? "1025");

type MailpitAddress = { Address?: string };
type MailpitSummary = {
  messages?: Array<{ ID?: string; Subject?: string }>;
};
type MailpitMessage = {
  Subject?: string;
  Text?: string;
  To?: MailpitAddress[];
};

async function searchMessage(token: string): Promise<string | null> {
  const response = await fetch(
    `${apiUrl}/api/v1/search?query=${encodeURIComponent(token)}`,
  );
  if (!response.ok) return null;
  const body = (await response.json()) as MailpitSummary;
  const id = body.messages?.[0]?.ID;
  return id ?? null;
}

describe.skipIf(!smtpHost || !apiUrl)("mailpit smtp integration", () => {
  it("delivers a confirmation message to mailpit", async () => {
    const token = `token-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
    const confirmUrl = `https://gym.example/cadastro/confirmar?token=${token}`;
    const sender = createSmtpEmailSender({
      host: smtpHost ?? "127.0.0.1",
      port: smtpPort,
      secure: false,
      from: DEFAULT_EMAIL_FROM,
    });

    await sender.sendAccountConfirmation({
      to: "ana@example.com",
      confirmUrl,
    });

    let messageId: string | null = null;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      messageId = await searchMessage(token);
      if (messageId) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    expect(messageId).toEqual(expect.any(String));

    const response = await fetch(`${apiUrl}/api/v1/message/${messageId ?? ""}`);
    expect(response.ok).toBe(true);
    const message = (await response.json()) as MailpitMessage;
    expect(message.Subject).toBe(copy.confirmSubject);
    expect(message.Text).toContain(confirmUrl);
    expect(message.To?.map((address) => address.Address)).toContain(
      "ana@example.com",
    );

    await fetch(`${apiUrl}/api/v1/search?query=${encodeURIComponent(token)}`, {
      method: "DELETE",
    });
  });
});
