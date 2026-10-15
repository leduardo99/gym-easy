import type { NextConfig } from "next";

import { accessControlAllowOrigin } from "./src/lib/app-url";
import { staticSecurityHeaders } from "./src/lib/security-headers";

function configuredHeaders(isProduction: boolean) {
  const headers = staticSecurityHeaders(isProduction);
  const allowOrigin = accessControlAllowOrigin(process.env.APP_URL);
  if (allowOrigin) {
    headers.push({
      key: "Access-Control-Allow-Origin",
      value: allowOrigin,
    });
  }
  return headers;
}

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/postgres/**/*",
      "./node_modules/@node-rs/argon2/**/*",
      "./node_modules/.pnpm/@node-rs+argon2-linux-x64-gnu@*/node_modules/@node-rs/argon2-linux-x64-gnu/**/*",
      "./node_modules/.pnpm/@node-rs+argon2-linux-arm64-gnu@*/node_modules/@node-rs/argon2-linux-arm64-gnu/**/*",
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: configuredHeaders(process.env.NODE_ENV === "production"),
      },
    ];
  },
};

export default nextConfig;
