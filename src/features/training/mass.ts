export function parseMassToTenths(value: unknown): number | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) return null;
    if (Number.isInteger(value)) return value * 10;
    return parseMassToTenths(String(value));
  }
  if (typeof value !== "string") return null;

  const trimmed = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d+)?$/.test(trimmed)) return null;

  const [whole, fraction = ""] = trimmed.split(".");
  if (whole === undefined) return null;
  const wholeTenths = Number(whole) * 10;
  if (!Number.isSafeInteger(wholeTenths)) return null;
  if (fraction.length === 0) return wholeTenths;
  if (fraction.length === 1) return wholeTenths + Number(fraction);

  const firstDigit = fraction[0];
  const roundingDigit = fraction[1];
  if (firstDigit === undefined || roundingDigit === undefined) return null;
  let tenths = wholeTenths + Number(firstDigit);
  if (Number(roundingDigit) >= 5) tenths += 1;
  return tenths;
}

export function formatTenths(tenths: number): string {
  const whole = Math.trunc(tenths / 10);
  const fraction = Math.abs(tenths % 10);
  return `${whole}.${fraction}`;
}

/** 2.20462 lb = 1 kg, computed in tenths so 660 lb becomes 299.4 kg. */
export function poundsToKilogramTenths(poundsTenths: number): number {
  return Math.round((poundsTenths * 100_000) / 220_462);
}
