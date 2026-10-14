import { cookies } from "next/headers";
import { connection } from "next/server";

import { getDb } from "@/db";

import { createDrizzleUserStore } from "./drizzle-user-store";
import { resolveSession, type SessionLookup } from "./resolve-session";
import { SESSION_COOKIE_NAME } from "./session-cookie";

export async function lookupSession(): Promise<SessionLookup> {
  await connection();
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return { status: "anonymous" };
  return resolveSession(token, {
    users: createDrizzleUserStore(getDb()),
    now: new Date(),
  });
}
