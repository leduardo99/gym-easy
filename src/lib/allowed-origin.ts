import "server-only";

import { getServerEnv } from "@/lib/env";

export function declaredRequestOrigin(headers: Headers): string | null {
  const origin = headers.get("origin");
  if (origin) {
    if (origin === "null") return null;
    return origin;
  }
  const referer = headers.get("referer");
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

function trustedAppOrigin(): string | null {
  try {
    return getServerEnv().APP_URL;
  } catch {
    return null;
  }
}

/** Compares Origin or Referer to `getServerEnv().APP_URL` only. Never uses Host. */
export function isAllowedOriginFromHeaders(headers: Headers): boolean {
  const allowed = trustedAppOrigin();
  if (!allowed) return false;
  const declared = declaredRequestOrigin(headers);
  return declared !== null && declared === allowed;
}

export function isAllowedOrigin(request: Request): boolean {
  return isAllowedOriginFromHeaders(request.headers);
}
