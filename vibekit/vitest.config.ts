import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./test/setup.ts"],
    env: {
      // Ensure environment variables are loaded
      dotenv: '.env'
    }
  },
});