"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { confirmEmailAction } from "@/features/auth/actions";
import { copy } from "@/features/auth/copy";

import { FormAlert } from "./form-alert";
import { followInternalPath, withAuthTimeout } from "./submit-state";

export function ConfirmToken({ token }: { token: string }) {
  const started = useRef(false);
  const [message, setMessage] = useState<string | null>(
    token ? null : copy.linkExpired,
  );
  const [pending, setPending] = useState(Boolean(token));

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    void confirm();
    async function confirm() {
      try {
        const result = await withAuthTimeout(confirmEmailAction({ token }));
        if (result.ok) {
          followInternalPath(result.redirectTo);
          return;
        }
        setMessage(result.formError?.message ?? copy.linkExpired);
      } catch {
        setMessage(copy.network);
      } finally {
        setPending(false);
      }
    }
  }, [token]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center gap-4 px-4 py-16 text-center md:max-w-2xl">
      <h1 className="text-title-1 font-semibold">Confirme seu email</h1>
      {pending ? (
        <p
          className="inline-flex items-center gap-2 text-sm"
          aria-live="polite"
        >
          <Spinner aria-hidden="true" />
          Confirmando…
        </p>
      ) : null}
      {message ? <FormAlert message={message} /> : null}
      {message === copy.linkExpired ? (
        <Button asChild size="lg" className="w-full">
          <Link href="/cadastro/confirme?status=expired">Reenviar link</Link>
        </Button>
      ) : null}
    </main>
  );
}
