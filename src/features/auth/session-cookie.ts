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

export function shouldUseSecureCookie(
  nodeEnv: "development" | "test" | "production",
  forwardedProto: string | null,
): boolean {
  if (nodeEnv === "production") return true;
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

function isClientIp(value: string): boolean {
  if (value.length === 0 || value.length > 64) return false;
  if (value.toLowerCase() === "unknown") return false;
  const v4 =
    /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
  if (v4.test(value)) return true;
  return value.includes(":") && /^[0-9a-f:.]+$/i.test(value);
}

/**
 * Client address for IP rate limits.
 * X-Forwarded-For is read only when the proxy is trusted, and only the hop
 * Traefik appended (counted from the right). X-Real-IP is never trusted.
 * Without a valid address the caller must skip the IP bucket.
 */
export function getClientIp(input: {
  forwardedFor: string | null;
  socketAddress?: string | null;
  trustProxy: boolean;
  trustedProxyHops?: number;
}): string | null {
  const socket = input.socketAddress?.trim() ?? "";
  const socketIp = isClientIp(socket) ? socket : null;
  if (!input.trustProxy) return socketIp;

  const hops = (input.forwardedFor ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const trustedHops = input.trustedProxyHops ?? 1;
  const index = hops.length - trustedHops;
  const candidate = index >= 0 ? hops[index] : undefined;
  if (candidate && isClientIp(candidate)) return candidate;
  return socketIp;
}
