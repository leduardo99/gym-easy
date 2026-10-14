export const SESSION_COOKIE_NAME = "ge_session";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
export const CONFIRM_EMAIL_COOKIE_NAME = "ge_confirm_email";
export const CONFIRM_EMAIL_MAX_AGE_SECONDS = 30 * 60;

export function sessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true as const,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export function confirmEmailCookieOptions(secure: boolean) {
  return {
    httpOnly: true as const,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: CONFIRM_EMAIL_MAX_AGE_SECONDS,
  };
}

export function shouldUseSecureCookie(forwardedProto: string | null): boolean {
  const proto = forwardedProto?.split(",")[0]?.trim();
  return proto === "https";
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

function normalizeClientIp(value: string | null | undefined): string | null {
  const ip = value?.split(",")[0]?.trim() ?? "";
  if (!ip || ip.toLowerCase() === "unknown") return null;
  return ip;
}

export function clientIp(headerStore: {
  get(name: string): string | null;
}): string | null {
  return (
    normalizeClientIp(headerStore.get("x-real-ip")) ??
    normalizeClientIp(headerStore.get("x-forwarded-for"))
  );
}
