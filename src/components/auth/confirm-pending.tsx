"use client";

import { useEffect, useState } from "react";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { resendConfirmationAction } from "@/features/auth/actions";
import { copy, formatCooldown } from "@/features/auth/copy";

import { FormAlert } from "./form-alert";
import { isOffline, networkError, withAuthTimeout } from "./submit-state";

export function ConfirmPending({
  email,
  fresh,
  expired,
}: {
  email: string | null;
  fresh: boolean;
  expired: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(fresh ? 60 : 0);
  const [message, setMessage] = useState<string | null>(
    expired ? copy.linkExpired : null,
  );

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(
      () => setSecondsLeft((current) => current - 1),
      1000,
    );
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  async function resend() {
    if (!email || pending || secondsLeft > 0) return;
    if (isOffline()) {
      setMessage(networkError().message);
      return;
    }
    setPending(true);
    setMessage(null);
    try {
      const result = await withAuthTimeout(resendConfirmationAction());
      if (result.ok) {
        toast(copy.resendToast);
        setSecondsLeft(60);
        return;
      }
      if (result.formError.code === "cooldown") {
        setSecondsLeft(result.formError.retryAfterSeconds ?? 60);
        return;
      }
      setMessage(result.formError.message);
      if (result.formError.retryAfterSeconds) {
        setSecondsLeft(result.formError.retryAfterSeconds);
      }
    } catch {
      setMessage(copy.network);
    } finally {
      setPending(false);
    }
  }

  const coolingDown = secondsLeft > 0;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center px-4 py-16 text-center md:max-w-2xl md:justify-center">
      <MailCheck aria-hidden="true" className="mb-4 size-10 text-primary" />
      <h1 className="text-title-1 font-semibold">Confirme seu email</h1>
      <p className="mt-4 max-w-sm text-sm text-muted-foreground">
        {copy.signupPending}
      </p>
      {email ? (
        <p className="mt-2 text-sm">
          Enviado para <span className="font-medium">{email}</span>
        </p>
      ) : null}
      <p className="mt-4 text-sm text-muted-foreground">
        Não chegou? Veja o spam.
      </p>
      <div className="mt-8 flex w-full flex-col gap-3">
        {message ? <FormAlert message={message} /> : null}
        {email ? (
          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={pending || coolingDown}
            aria-busy={pending}
            onClick={() => void resend()}
          >
            {pending ? (
              <Spinner data-icon="inline-start" aria-hidden="true" />
            ) : null}
            {pending
              ? "Enviando…"
              : coolingDown
                ? formatCooldown(secondsLeft)
                : "Reenviar link"}
          </Button>
        ) : null}
        <a
          href="/login"
          className="inline-flex h-11 items-center justify-center text-sm text-primary underline-offset-4 hover:underline"
        >
          Voltar para o login
        </a>
      </div>
    </main>
  );
}
