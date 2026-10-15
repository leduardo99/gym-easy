import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": path.join(root, "src/test/server-only-stub.ts"),
    },
  },
  test: {
    environment: "happy-dom",
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["tests/e2e/**", "node_modules/**", ".next/**"],
    coverage: {
      provider: "v8",
      include: ["src/features/**/*.{ts,tsx}", "src/lib/**/*.{ts,tsx}"],
      exclude: ["**/*.{test,integration.test}.{ts,tsx}", "src/**/*.d.ts"],
      reporter: ["text", "text-summary"],
      thresholds: {
        lines: 56,
        statements: 54,
        branches: 52,
        functions: 58,
      },
    },
  },
});
