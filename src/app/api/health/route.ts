import { sql } from "drizzle-orm";
import { connection } from "next/server";

import { getDb } from "@/db";

export const instant = false;

export async function GET() {
  await connection();

  try {
    await getDb().execute(sql`select 1`);
    return Response.json({ status: "ok", db: "ok" });
  } catch {
    return Response.json(
      { status: "error", db: "unavailable" },
      { status: 503 },
    );
  }
}
