"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { CoachAssistantReply } from "./coach-assistant-reply";

type CoachErrorBody = {
  error?: string;
  code?: string;
  cta?: { href: string; label: string };
};

export function CoachChatPanel() {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [reply, setReply] = useState<{
    text: string;
    cta?: { href: string; label: string };
  } | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || pending) return;
    setPending(true);
    setReply(null);
    try {
      const response = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      if (!response.ok) {
        const body = (await response.json()) as CoachErrorBody;
        setReply({
          text: body.error ?? "Não foi possível enviar a mensagem.",
          cta: body.cta,
        });
        return;
      }
      const text = await response.text();
      const delta = text
        .split("\n")
        .filter((line) => line.startsWith("data: "))
        .map((line) => {
          try {
            return JSON.parse(line.slice(6)) as { text?: string };
          } catch {
            return null;
          }
        })
        .find((chunk) => chunk?.text)?.text;
      setReply({ text: delta ?? "Resposta recebida." });
    } catch {
      setReply({ text: "Não foi possível contactar o coach." });
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-10 flex flex-col gap-4">
      <h2 className="text-title-2 font-semibold">Coach</h2>
      <form className="flex flex-col gap-3" onSubmit={onSubmit}>
        <Textarea
          name="message"
          rows={3}
          placeholder="Pergunte sobre o treino…"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          disabled={pending}
        />
        <Button type="submit" size="lg" disabled={pending || !message.trim()}>
          {pending ? "A enviar…" : "Enviar"}
        </Button>
      </form>
      {reply ? <CoachAssistantReply text={reply.text} cta={reply.cta} /> : null}
    </section>
  );
}
