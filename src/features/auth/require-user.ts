import { redirect } from "next/navigation";

import { loginRedirectPath } from "./destination";
import { lookupSession } from "./lookup-session";
import type { PublicUser } from "./user-store";

export async function requireUser(nextPath: string): Promise<PublicUser> {
  const session = await lookupSession();
  if (session.status === "ok") return session.user;
  redirect(loginRedirectPath(session.status, nextPath));
}
