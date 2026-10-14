export type SecurityHeaderOptions = {
  nonce: string;
  isProduction: boolean;
  isDevelopment: boolean;
};

const HSTS_VALUE = "max-age=63072000; includeSubDomains; preload";

export function buildContentSecurityPolicy({
  nonce,
  isProduction,
  isDevelopment,
}: SecurityHeaderOptions): string {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    isDevelopment ? "'unsafe-eval'" : null,
  ].filter((part): part is string => part !== null);

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    // Next, next-themes, and Tailwind set style attributes. A nonce or hash in
    // style-src makes browsers ignore 'unsafe-inline' for those attributes, so
    // styles stay attribute-compatible and scripts stay nonce-only.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    isProduction ? "upgrade-insecure-requests" : null,
  ].filter((part): part is string => part !== null);

  return directives.join("; ");
}

export function buildSecurityHeaders(
  options: SecurityHeaderOptions,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Security-Policy": buildContentSecurityPolicy(options),
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };

  if (options.isProduction) {
    headers["Strict-Transport-Security"] = HSTS_VALUE;
  }

  return headers;
}
