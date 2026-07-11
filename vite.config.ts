import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mcpPlugin(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  // NOTE: manualChunks was intentionally removed after a production incident
  // where hand-rolled vendor buckets produced circular chunk-to-chunk imports
  // (e.g. vendor-react <-> vendor-charts), triggering a TDZ
  // "Cannot access '_' before initialization" at app startup. Let Rollup
  // default chunking group modules with their importing entries — it avoids
  // cycles and keeps hashed asset URLs stable per lazy route.
}));
