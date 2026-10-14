export const MINIMUM_AGE_YEARS = 16;

export const AGE_BANDS = [
  "16-17",
  "18-29",
  "30-39",
  "40-49",
  "50-59",
  "60-69",
  "70+",
] as const;

export type AgeBand = (typeof AGE_BANDS)[number];

export function calendarYear(now: Date): number {
  return now.getUTCFullYear();
}

export function birthYearBounds(now: Date): { min: number; max: number } {
  const year = calendarYear(now);
  return { min: year - 100, max: year };
}

/**
 * Idade mostrada no perfil: ano atual − ano de nascimento.
 * A diferença de até um ano é aceita na V1.
 */
export function approximateAge(birthYear: number, now: Date): number {
  return calendarYear(now) - birthYear;
}

/**
 * LED-46, regra literal: bloqueia se ano atual − birth_year ≤ 16.
 * Equivale a idade mínima possível (ano atual − birth_year − 1) < 16.
 * Quem completa 16 durante o ano só entra em 1º de janeiro do ano seguinte (UTC).
 */
export function isUnderMinimumAge(birthYear: number, now: Date): boolean {
  return calendarYear(now) - birthYear <= MINIMUM_AGE_YEARS;
}

/** Faixa enviada à IA. Não inclui o ano. Menor de 16 não tem faixa. */
export function ageBand(birthYear: number, now: Date): AgeBand | null {
  if (isUnderMinimumAge(birthYear, now)) return null;
  const age = approximateAge(birthYear, now);
  if (age <= 17) return "16-17";
  if (age <= 29) return "18-29";
  if (age <= 39) return "30-39";
  if (age <= 49) return "40-49";
  if (age <= 59) return "50-59";
  if (age <= 69) return "60-69";
  return "70+";
}
