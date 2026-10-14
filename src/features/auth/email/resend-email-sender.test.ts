import { describe, expect, it, vi } from "vitest";

import { copy } from "../copy";
import { DEFAULT_EMAIL_FROM } from "@/lib/env";

import {
  RESEND_EMAILS_URL,
  createResendEmailSender,
} from "./resend-email-sender";

describe("createResendEmailSender", () => {
  it("posts only to the emails endpoint with the server from address", async () => {
    const fetchImpl = vi.fn<typeof fetch>(
      async () => new Response("{}", { status: 200 }),
    );
    const sender = createResendEmailSender({
      apiKey: "test-resend-key",
      from: DEFAULT_EMAIL_FROM,
      fetchImpl,
    });

    await sender.sendAccountExistsNotice({ to: "ana@example.com" });

    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe(RESEND_EMAILS_URL);
    expect(String(url)).not.toContain("/domains");
    expect(init?.method).toBe("POST");
    const headers = new Headers(init?.headers);
    expect(headers.get("Authorization")).toBe("Bearer test-resend-key");
    const body = JSON.parse(String(init?.body)) as {
      from: string;
      to: string[];
      text: string;
    };
    expect(body.from).toBe("Gym Easy <onboarding@resend.dev>");
    expect(body.to).toEqual(["ana@example.com"]);
    expect(body.text).toBe(copy.accountExistsNotice);
  });

  it("does not create a Resend account or domain", async () => {
    const fetchImpl = vi.fn<typeof fetch>(
      async () => new Response("{}", { status: 200 }),
    );
    const sender = createResendEmailSender({
      apiKey: "test-resend-key",
      from: DEFAULT_EMAIL_FROM,
      fetchImpl,
    });

    await sender.sendAccountConfirmation({
      to: "ana@example.com",
      confirmUrl: "https://gym.example/cadastro/confirmar?token=abc",
    });

    expect(fetchImpl.mock.calls).toHaveLength(1);
    expect(String(fetchImpl.mock.calls[0]?.[0])).toBe(RESEND_EMAILS_URL);
  });
});
