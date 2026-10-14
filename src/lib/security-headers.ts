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
    "connect-src 'self'",
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

export function staticSecurityHeaders(
  isProduction: boolean,
): Array<{ key: string; value: string }> {
  const headers = [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=()",
    },
  ];
  if (isProduction) {
    headers.push({ key: "Strict-Transport-Security", value: HSTS_VALUE });
  }
  return headers;
}

export function buildSecurityHeaders(
  options: SecurityHeaderOptions,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Security-Policy": buildContentSecurityPolicy(options),
  };
  for (const header of staticSecurityHeaders(options.isProduction)) {
    headers[header.key] = header.value;
  }
  return headers;
}
