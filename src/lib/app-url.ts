/** Origin allowed to read this app. Never `*`, and never the request's Origin. */
export function accessControlAllowOrigin(
  value: string | undefined,
): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** Validates `APP_URL` for server env: origin only, no path/query/hash. */
export function strictAppUrlOrigin(value: string): string | { error: string } {
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { error: "APP_URL: APP_URL must be an http(s) URL" };
    }
    if (url.username || url.password) {
      return { error: "APP_URL: APP_URL must be an http(s) URL" };
    }
    if (url.search || url.hash) {
      return { error: "APP_URL: APP_URL must not include query or hash" };
    }
    if (url.pathname !== "/" && url.pathname !== "") {
      return { error: "APP_URL: APP_URL must not include a path" };
    }
    if (trimmed !== url.origin && trimmed !== `${url.origin}/`) {
      return { error: "APP_URL: APP_URL must not include a path" };
    }
    return url.origin;
  } catch {
    return { error: "APP_URL: APP_URL must be an http(s) URL" };
  }
}
