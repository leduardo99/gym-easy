import { connection } from "next/server";

import { getDb } from "@/db";
import {
  purgeExpiredAiGenerationLogs,
  purgeExpiredCoachMessages,
} from "@/lib/ai/messages";
import { unauthorizedCron } from "@/lib/cron-auth";

export const instant = false;

export async function POST(request: Request) {
  await connection();
  const denied = unauthorizedCron(request);
  if (denied) return denied;

  const db = getDb();
  const removed = await purgeExpiredCoachMessages(db);
  const logs = await purgeExpiredAiGenerationLogs(db);
  return Response.json({ removed, logs });
}

export async function GET() {
  return Response.json({ error: "method_not_allowed" }, { status: 405 });
}
