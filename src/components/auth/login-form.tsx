"use client";

import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { loginAction, type AuthFormError } from "@/features/auth/actions";
import { fieldSummary } from "@/features/auth/copy";
import { loginSchema, type LoginInput } from "@/features/auth/schemas";

import { FieldMessage } from "./field-message";
import { FormAlert } from "./form-alert";
import { PasswordField } from "./password-field";
import {
  followInternalPath,
  isOffline,
  networkError,
  withAuthTimeout,
} from "./submit-state";

const fields = ["email", "password"] as const;

export function LoginForm({
  nextPath,
  initialMessage,
}: {
  nextPath: string | null;
  initialMessage: string | null;
}) {
  const [pending, setPending] = useState(false);
  const [lockedFor, setLockedFor] = useState(0);
  const [formError, setFormError] = useState<AuthFormError | null>(
    initialMessage ? { code: "credentials", message: initialMessage } : null,
  );
  const submitting = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: { email: "", password: "" },
  });
  const emailField = form.register("email");

  useEffect(() => {
    const media = window.matchMedia?.("(min-width: 768px)");
    if (media?.matches) emailRef.current?.focus();
  }, []);

  useEffect(() => {
    if (lockedFor <= 0) return;
    const timer = setTimeout(
      () => setLockedFor((current) => current - 1),
      1000,
    );
    return () => clearTimeout(timer);
  }, [lockedFor]);

  const password = useWatch({ control: form.control, name: "password" });

  const errors = form.formState.errors;
  const summary = fieldSummary(fields.filter((field) => errors[field]).length);

  async function onSubmit(values: LoginInput) {
    setPending(true);
    setFormError(null);
    if (isOffline()) {
      setFormError(networkError());
      setPending(false);
      return;
    }
    try {
      const result = await withAuthTimeout(
        loginAction({ ...values, next: nextPath }),
      );
      if (result.ok) {
        followInternalPath(result.redirectTo);
        return;
      }
      if (result.fieldErrors?.email) {
        form.setError("email", { message: result.fieldErrors.email });
        document.getElementById("login-email")?.focus();
      }
      if (result.fieldErrors?.password) {
        form.setError("password", { message: result.fieldErrors.password });
      }
      if (result.formError?.code === "credentials") {
        form.setValue("password", "");
        document.getElementById("login-password")?.focus();
      }
      if (result.formError?.retryAfterSeconds) {
        setLockedFor(result.formError.retryAfterSeconds);
      }
      setFormError(result.formError ?? null);
    } catch {
      setFormError(networkError());
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="flex flex-1 flex-col"
      noValidate
      onSubmit={(event) => {
        if (submitting.current) {
          event.preventDefault();
          return;
        }
        submitting.current = true;
        void form
          .handleSubmit(onSubmit, (invalid) => {
            const id = invalid.email ? "login-email" : "login-password";
            document.getElementById(id)?.focus();
          })(event)
          .finally(() => {
            submitting.current = false;
          });
      }}
    >
      {summary ? (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {summary}
        </p>
      ) : null}
      <FieldGroup>
        <Field data-invalid={errors.email ? true : undefined}>
          <FieldLabel htmlFor="login-email">Email</FieldLabel>
          <Input
            id="login-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "login-email-error" : undefined}
            disabled={pending}
            name={emailField.name}
            onBlur={emailField.onBlur}
            onChange={emailField.onChange}
            ref={(element) => {
              emailField.ref(element);
              emailRef.current = element;
            }}
          />
          <FieldMessage
            id="login-email-error"
            message={errors.email?.message}
          />
        </Field>
        <Field data-invalid={errors.password ? true : undefined}>
          <FieldLabel htmlFor="login-password">Senha</FieldLabel>
          <PasswordField
            id="login-password"
            name="password"
            autoComplete="current-password"
            invalid={Boolean(errors.password)}
            describedBy={errors.password ? "login-password-error" : undefined}
            disabled={pending}
            inputRef={passwordRef}
            value={password}
            onBlur={() => {
              void form.trigger("password");
            }}
            onChange={(value) => {
              form.setValue("password", value, {
                shouldValidate: Boolean(form.formState.touchedFields.password),
              });
            }}
          />
          <FieldMessage
            id="login-password-error"
            message={errors.password?.message}
          />
        </Field>
        <div className="flex justify-end">
          <Link
            href="/esqueci-senha"
            className="inline-flex h-11 items-center text-sm text-primary underline-offset-4 hover:underline"
          >
            Esqueci a senha
          </Link>
        </div>
      </FieldGroup>
      <div className="sticky bottom-0 mt-auto flex flex-col gap-3 bg-background py-4">
        {formError ? <FormAlert message={formError.message} /> : null}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={pending || lockedFor > 0}
          aria-busy={pending}
        >
          {pending ? (
            <Spinner data-icon="inline-start" aria-hidden="true" />
          ) : null}
          {pending ? "Entrando…" : "Entrar"}
        </Button>
        <p className="sr-only" aria-live="polite">
          {pending ? "Entrando…" : ""}
        </p>
        <p className="text-center text-sm">
          Não tem conta?{" "}
          <Link
            href="/cadastro"
            className="text-primary underline-offset-4 hover:underline"
          >
            Criar conta
          </Link>
        </p>
      </div>
    </form>
  );
}
