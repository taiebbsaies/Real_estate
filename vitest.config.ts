import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "server-only": `${root}lib/test-stubs/server-only.ts`,
      "@": root,
    },
  },
  test: {
    include: ["lib/**/*.test.ts", "app/**/*.test.ts"],
  },
});
