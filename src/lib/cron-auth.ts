import { createHash, timingSafeEqual } from "node:crypto";

export const CRON_SECRET_MIN = 32;

export function verifyCronSecret(token: string, secret: string): boolean {
  const actual = createHash("sha256").update(token).digest();
  const expected = createHash("sha256").update(secret).digest();
  return timingSafeEqual(actual, expected);
}

export function cronQueryCarriesSecret(url: URL, secret: string): boolean {
  if (url.search.length === 0) return false;
  const names = ["secret", "token", "authorization", "cron_secret"];
  if (names.some((name) => url.searchParams.has(name))) return true;
  return url.search.includes(secret);
}

/** 401 quando o bearer falha. `null` quando o pedido pode continuar. */
export function unauthorizedCron(request: Request): Response | null {
  const secret = process.env.CRON_SECRET;
  const url = new URL(request.url);
  if (
    !secret ||
    secret.length < CRON_SECRET_MIN ||
    cronQueryCarriesSecret(url, secret)
  ) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  if (!token || !verifyCronSecret(token, secret)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
