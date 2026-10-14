import { ipAddress } from "@vercel/functions";

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

function normalizeClientIp(value: string | null | undefined): string | null {
  const ip = value?.split(",")[0]?.trim() ?? "";
  if (!ip || ip.toLowerCase() === "unknown") return null;
  return ip;
}

export function clientIp(headerStore: Headers): string | null {
  const realIp = headerStore.get("x-real-ip");
  // Next's header store has a `headers` field, which makes ipAddress() treat
  // it as a Request and call `.get` on a plain object. Copy the platform
  // header into a real Headers instance first.
  const platformHeaders = new Headers();
  if (realIp) platformHeaders.set("x-real-ip", realIp);
  return (
    normalizeClientIp(ipAddress(platformHeaders)) ?? normalizeClientIp(realIp)
  );
}
