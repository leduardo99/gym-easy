import { createHash, timingSafeEqual } from "node:crypto";

import { connection } from "next/server";

import { getDb } from "@/db";
import { purgeExpiredConsentProofs } from "@/features/consent/retention";

export const instant = false;

const CRON_SECRET_MIN = 32;

function secretsMatch(token: string, secret: string): boolean {
  const actual = createHash("sha256").update(token).digest();
  const expected = createHash("sha256").update(secret).digest();
  return timingSafeEqual(actual, expected);
}

function queryCarriesSecret(url: URL, secret: string): boolean {
  if (url.search.length === 0) return false;
  const names = ["secret", "token", "authorization", "cron_secret"];
  if (names.some((name) => url.searchParams.has(name))) return true;
  return url.search.includes(secret);
}

export async function POST(request: Request) {
  await connection();

  const secret = process.env.CRON_SECRET;
  const url = new URL(request.url);
  if (
    !secret ||
    secret.length < CRON_SECRET_MIN ||
    queryCarriesSecret(url, secret)
  ) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  if (!token || !secretsMatch(token, secret)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const removed = await purgeExpiredConsentProofs(getDb());
  return Response.json({ removed });
}

export async function GET() {
  return Response.json({ error: "method_not_allowed" }, { status: 405 });
}
