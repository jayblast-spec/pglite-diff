import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // PGlite (real Postgres compiled to WASM) takes longer to initialize
    // than vitest's default 5s test timeout, especially the first instance
    // spun up in a process.
    testTimeout: 30_000,
  },
});
