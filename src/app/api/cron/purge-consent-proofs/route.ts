import { connection } from "next/server";

import { getDb } from "@/db";
import { purgeExpiredConsentProofs } from "@/features/consent/retention";
import { unauthorizedCron } from "@/lib/cron-auth";

export const instant = false;

export async function POST(request: Request) {
  await connection();
  const denied = unauthorizedCron(request);
  if (denied) return denied;

  const removed = await purgeExpiredConsentProofs(getDb());
  return Response.json({ removed });
}

export async function GET() {
  return Response.json({ error: "method_not_allowed" }, { status: 405 });
}
