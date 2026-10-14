import { connection } from "next/server";

import { lookupSession } from "@/features/auth/lookup-session";
import { createCoachHttpResponse } from "@/lib/ai/http";

export const instant = false;

export async function POST(request: Request) {
  await connection();
  const session = await lookupSession();
  if (session.status !== "ok") {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  return createCoachHttpResponse({
    userId: session.user.id,
    body,
    now: new Date(),
  });
}
