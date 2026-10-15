import { connection } from "next/server";

import { lookupSession } from "@/features/auth/lookup-session";
import { isSameOrigin } from "@/features/auth/session-cookie";
import { createCoachHttpResponse } from "@/lib/ai/http";

export const instant = false;

function coachRequestHost(request: Request): string | null {
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host || host.includes(",")) return null;
  return host;
}

export async function POST(request: Request) {
  await connection();
  if (!isSameOrigin(request.headers.get("origin"), coachRequestHost(request))) {
    return Response.json({ error: "Origem não permitida." }, { status: 403 });
  }
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return Response.json(
      { error: "O corpo tem de ser JSON." },
      { status: 415 },
    );
  }

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
    signal: request.signal,
  });
}
