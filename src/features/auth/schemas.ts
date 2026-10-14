import { z } from "zod";

import { copy } from "./copy";

const emailFormat = z.email();

export function codePointLength(value: string): number {
  return [...value].length;
}

export const emailSchema = z
  .string()
  .trim()
  .superRefine((value, context) => {
    if (value.length === 0) {
      context.addIssue({ code: "custom", message: copy.emailRequired });
      return;
    }
    if (!emailFormat.safeParse(value).success) {
      context.addIssue({ code: "custom", message: copy.emailInvalid });
    }
  })
  .transform((value) => value.toLowerCase());

export const nameSchema = z
  .string()
  .trim()
  .min(1, copy.nameRequired)
  .max(80, copy.nameMax);

export const signupPasswordSchema = z.string().superRefine((value, context) => {
  const length = codePointLength(value);
  if (length < 8) {
    context.addIssue({ code: "custom", message: copy.passwordMin });
    return;
  }
  if (length > 64) {
    context.addIssue({ code: "custom", message: copy.passwordMax });
  }
});

export const loginPasswordSchema = z.string().superRefine((value, context) => {
  if (value.length === 0) {
    context.addIssue({ code: "custom", message: copy.passwordRequired });
    return;
  }
  if (codePointLength(value) > 64) {
    context.addIssue({ code: "custom", message: copy.passwordMax });
  }
});

export const signupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: signupPasswordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export type FieldKey = "name" | "email" | "password";
export type FieldErrors = Partial<Record<FieldKey, string>>;

export function fieldErrorsFromZod(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (
      (key === "name" || key === "email" || key === "password") &&
      !fieldErrors[key]
    ) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}
