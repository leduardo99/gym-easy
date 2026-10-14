import { connection } from "next/server";

import { getDb } from "@/db";
import { runScheduledMaintenance } from "@/features/auth/scheduled-maintenance";
import { isCronAuthorized } from "@/lib/cron-auth";
import { getServerEnv } from "@/lib/env";

export const instant = false;

async function handle(request: Request): Promise<Response> {
  await connection();
  const authorized = isCronAuthorized(
    request.headers.get("authorization"),
    getServerEnv().CRON_SECRET,
  );
  if (!getServerEnv().CRON_SECRET) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  if (!authorized) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    await runScheduledMaintenance(getDb(), new Date());
  } catch (error) {
    console.error(
      "cron.maintenance_failed",
      error instanceof Error ? error.name : "error",
    );
    return Response.json({ error: "unavailable" }, { status: 503 });
  }

  return Response.json({ ok: true });
}

export function GET(request: Request): Promise<Response> {
  return handle(request);
}

export function POST(request: Request): Promise<Response> {
  return handle(request);
}
