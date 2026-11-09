import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "server-only": `${root}lib/test-stubs/server-only.ts`,
      "@": root,
      "@/src": `${root}src`,
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts", "lib/**/*.test.ts", "app/**/*.test.ts"],
  },
});
