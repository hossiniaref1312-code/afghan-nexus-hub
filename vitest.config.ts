import { defineConfig, loadEnv } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Expose .env values (Supabase URL + publishable key) to node-side tests.
Object.assign(process.env, loadEnv("test", process.cwd(), ""));

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
