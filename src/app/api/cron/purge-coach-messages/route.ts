import { connection } from "next/server";

import { getDb } from "@/db";
import { purgeExpiredCoachMessages } from "@/lib/ai/messages";

export const instant = false;

export async function GET(request: Request) {
  await connection();

  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const removed = await purgeExpiredCoachMessages(getDb());
  return Response.json({ removed });
}
