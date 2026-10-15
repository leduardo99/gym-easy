import type { ZodSafeParseError } from "zod";

import { SESSION_MINUTE_VALUES } from "@/db/domain";
import type { ProfileInput } from "@/features/training/schemas";

function readString(formData: FormData, name: string): string {
  const raw = formData.get(name);
  return typeof raw === "string" ? raw.trim() : "";
}

function parseOptionalInt(text: string): number | null | undefined {
  if (text === "") return null;
  if (!/^\d+$/.test(text)) return Number.NaN;
  return Number(text);
}

function parseOptionalEnum<T extends string>(text: string): T | null {
  if (text === "") return null;
  return text as T;
}

/** Converte `FormData` do perfil em entrada para `createProfileInputSchema`. */
export function parseProfileFormData(formData: FormData): ProfileInput {
  const birthYearText = readString(formData, "birthYear");
  const heightText = readString(formData, "heightCm");
  const daysText = readString(formData, "daysPerWeek");
  const sessionText = readString(formData, "sessionMinutes");

  const birthYear = parseOptionalInt(birthYearText);
  const heightCm = parseOptionalInt(heightText);
  const daysPerWeek = parseOptionalInt(daysText);
  const sessionMinutes = parseOptionalInt(sessionText);

  const sex = parseOptionalEnum(readString(formData, "sex"));
  const goal = parseOptionalEnum(readString(formData, "goal"));
  const level = parseOptionalEnum(readString(formData, "level"));
  const trainingPlace = parseOptionalEnum(
    readString(formData, "trainingPlace"),
  );

  let sessionMinutesValue: number | null | undefined = sessionMinutes;
  if (
    typeof sessionMinutes === "number" &&
    !Number.isNaN(sessionMinutes) &&
    !(SESSION_MINUTE_VALUES as readonly number[]).includes(sessionMinutes)
  ) {
    sessionMinutesValue = Number.NaN;
  }

  return {
    birthYear,
    sex,
    heightCm,
    goal,
    level,
    daysPerWeek,
    sessionMinutes: sessionMinutesValue,
    trainingPlace,
  } as ProfileInput;
}

export type ProfileFormValidationError = "nascimento" | "altura" | "perfil";

export function profileFormErrorFlag(
  parsed: ZodSafeParseError<ProfileInput>,
): ProfileFormValidationError {
  const paths = parsed.error.issues.map((issue) => issue.path[0]);
  if (paths.includes("birthYear")) return "nascimento";
  if (paths.includes("heightCm")) return "altura";
  return "perfil";
}
