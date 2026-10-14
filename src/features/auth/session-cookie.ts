export const SESSION_COOKIE_NAME = "ge_session";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export function sessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true as const,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export function shouldUseSecureCookie(input: {
  forwardedProto: string | null;
  vercelEnv: string | undefined;
}): boolean {
  const proto = input.forwardedProto?.split(",")[0]?.trim();
  if (proto === "https") return true;
  if (proto === "http") return false;
  return input.vercelEnv === "preview" || input.vercelEnv === "production";
}

export function isSameOrigin(
  origin: string | null,
  host: string | null,
): boolean {
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function requestOrigin(headerStore: Headers): string | null {
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  if (!host || host.includes(",")) return null;
  const proto = headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (proto === "https" || proto === "http") return `${proto}://${host}`;
  return `http://${host}`;
}

export function clientIp(headerStore: Headers): string {
  const forwarded = headerStore.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;
  return headerStore.get("x-real-ip") ?? "unknown";
}
