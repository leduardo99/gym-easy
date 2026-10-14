import { NextResponse, type NextRequest } from "next/server";

import { buildSecurityHeaders } from "@/lib/security-headers";

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const headers = buildSecurityHeaders({
    nonce,
    isProduction: process.env.VERCEL_ENV === "production",
    isDevelopment: process.env.NODE_ENV === "development",
  });
  const contentSecurityPolicy = headers["Content-Security-Policy"] ?? "";

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  for (const [name, value] of Object.entries(headers)) {
    response.headers.set(name, value);
  }

  return response;
}
