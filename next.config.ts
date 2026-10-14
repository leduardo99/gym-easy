import type { NextConfig } from "next";

import { staticSecurityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/drizzle-orm/migrator.js",
      "./node_modules/drizzle-orm/node-postgres/migrator.js",
      "./node_modules/@node-rs/argon2/**/*",
      "./node_modules/@node-rs/argon2-linux-x64-gnu/**/*",
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
        headers: staticSecurityHeaders(process.env.NODE_ENV === "production"),
      },
    ];
  },
};

export default nextConfig;
