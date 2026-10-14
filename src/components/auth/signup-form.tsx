"use client";

import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { signupAction, type AuthFormError } from "@/features/auth/actions";
import { copy, fieldSummary } from "@/features/auth/copy";
import { signupSchema, type SignupInput } from "@/features/auth/schemas";

import { FieldMessage } from "./field-message";
import { FormAlert } from "./form-alert";
import { PasswordField } from "./password-field";
import {
  followInternalPath,
  isOffline,
  networkError,
  withAuthTimeout,
} from "./submit-state";

const fields = ["name", "email", "password"] as const;

export function SignupForm() {
  const [pending, setPending] = useState(false);
  const [lockedFor, setLockedFor] = useState(0);
  const [formError, setFormError] = useState<AuthFormError | null>(null);
  const submitting = useRef(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: { name: "", email: "", password: "" },
  });
  const nameField = form.register("name");
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

  function focusField(field: (typeof fields)[number] | undefined) {
    if (!field) return;
    document.getElementById(`signup-${field}`)?.focus();
  }

  async function onSubmit(values: SignupInput) {
    setPending(true);
    setFormError(null);
    if (isOffline()) {
      setFormError(networkError());
      setPending(false);
      return;
    }
    try {
      const result = await withAuthTimeout(signupAction(values));
      if (result.ok) {
        followInternalPath(result.redirectTo);
        return;
      }
      if (result.fieldErrors) {
        for (const field of fields) {
          const message = result.fieldErrors[field];
          if (message) form.setError(field, { message });
        }
        focusField(fields.find((field) => result.fieldErrors?.[field]));
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
            focusField(fields.find((field) => invalid[field]));
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
        <Field data-invalid={errors.name ? true : undefined}>
          <FieldLabel htmlFor="signup-name">Nome</FieldLabel>
          <Input
            id="signup-name"
            autoComplete="name"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "signup-name-error" : undefined}
            disabled={pending}
            name={nameField.name}
            onBlur={nameField.onBlur}
            onChange={nameField.onChange}
            ref={(element) => {
              nameField.ref(element);
              nameRef.current = element;
            }}
          />
          <FieldMessage id="signup-name-error" message={errors.name?.message} />
        </Field>
        <Field data-invalid={errors.email ? true : undefined}>
          <FieldLabel htmlFor="signup-email">Email</FieldLabel>
          <Input
            id="signup-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "signup-email-error" : undefined}
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
            id="signup-email-error"
            message={errors.email?.message}
          />
        </Field>
        <Field data-invalid={errors.password ? true : undefined}>
          <FieldLabel htmlFor="signup-password">Senha</FieldLabel>
          <PasswordField
            id="signup-password"
            name="password"
            autoComplete="new-password"
            invalid={Boolean(errors.password)}
            describedBy="signup-password-hint signup-password-error"
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
          <FieldDescription id="signup-password-hint">
            {copy.passwordHint}
          </FieldDescription>
          <FieldMessage
            id="signup-password-error"
            message={errors.password?.message}
          />
        </Field>
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
          {pending ? "Criando conta…" : "Criar conta"}
        </Button>
        <p className="sr-only" aria-live="polite">
          {pending ? "Criando conta…" : ""}
        </p>
        <p className="text-center text-sm">
          Já tem conta?{" "}
          <Link
            href="/login"
            className="text-primary underline-offset-4 hover:underline"
          >
            Entrar
          </Link>
        </p>
      </div>
    </form>
  );
}
