"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { requestPasswordResetAction } from "@/features/auth/actions";
import { copy } from "@/features/auth/copy";

import { FieldMessage } from "./field-message";
import { FormAlert } from "./form-alert";
import { isOffline, networkError, withAuthTimeout } from "./submit-state";

export function ResetRequestForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [alert, setAlert] = useState<string | null>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(
      () => setSecondsLeft((current) => current - 1),
      1000,
    );
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || secondsLeft > 0) return;
    setFieldError(null);
    setMessage(null);
    setAlert(null);
    if (isOffline()) {
      setAlert(networkError().message);
      return;
    }
    setPending(true);
    try {
      const result = await withAuthTimeout(
        requestPasswordResetAction({ email }),
      );
      if (result.ok) {
        setMessage(result.message);
        setSecondsLeft(60);
        return;
      }
      if (result.fieldErrors?.email) {
        setFieldError(result.fieldErrors.email);
      }
      if (result.formError) {
        setAlert(result.formError.message);
        if (result.formError.retryAfterSeconds) {
          setSecondsLeft(result.formError.retryAfterSeconds);
        }
      }
    } catch {
      setAlert(copy.network);
    } finally {
      setPending(false);
    }
  }

  const coolingDown = secondsLeft > 0;

  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={onSubmit}>
      <FieldGroup>
        <Field data-invalid={fieldError ? true : undefined}>
          <FieldLabel htmlFor="reset-email">Email</FieldLabel>
          <Input
            id="reset-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            disabled={pending}
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={fieldError ? "reset-email-error" : undefined}
            onChange={(event) => setEmail(event.target.value)}
          />
          <FieldMessage
            id="reset-email-error"
            message={fieldError ?? undefined}
          />
        </Field>
      </FieldGroup>
      {message ? (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}
      {alert ? <FormAlert message={alert} /> : null}
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={pending || coolingDown}
        aria-busy={pending}
      >
        {pending ? (
          <Spinner data-icon="inline-start" aria-hidden="true" />
        ) : null}
        {pending ? "Enviando…" : "Enviar aviso"}
      </Button>
    </form>
  );
}
