import { NextResponse, type NextRequest } from "next/server";

import { shouldBlockDesignCatalog } from "@/lib/design-catalog";
import { buildSecurityHeaders } from "@/lib/security-headers";

function applySecurityHeaders(
  response: NextResponse,
  headers: Record<string, string>,
): NextResponse {
  for (const [name, value] of Object.entries(headers)) {
    response.headers.set(name, value);
  }

  return response;
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isProduction = process.env.NODE_ENV === "production";
  const headers = buildSecurityHeaders({
    nonce,
    isProduction,
    isDevelopment: process.env.NODE_ENV === "development",
  });

  // The root layout reads the CSP nonce and starts the response before the
  // design page can call notFound(), which leaves a 200 with a soft 404.
  // Block the catalog here so production gets a real 404 status.
  if (shouldBlockDesignCatalog(request.nextUrl.pathname)) {
    return applySecurityHeaders(
      new NextResponse("Not Found", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8" },
      }),
      headers,
    );
  }

  const contentSecurityPolicy = headers["Content-Security-Policy"] ?? "";

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  return applySecurityHeaders(response, headers);
}
