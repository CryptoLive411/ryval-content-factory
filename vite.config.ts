// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv, type Plugin } from "vite";

const SERVER_ENV_KEYS = [
  "TIKTOK_CLIENT_KEY",
  "TIKTOK_CLIENT_SECRET",
  "TIKTOK_REDIRECT_URI",
  "CRON_SECRET",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "LOVABLE_API_KEY",
  "OPENAI_API_KEY",
  "PUBLER_API_KEY",
  "PUBLER_WORKSPACE_ID",
  "PUBLER_TIKTOK_NAMES",
] as const;

function applyDotenvToProcess(mode = "development") {
  const loaded = loadEnv(mode, process.cwd(), "");
  for (const [key, value] of Object.entries(loaded)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

applyDotenvToProcess();

function defineServerProcessEnv() {
  const define: Record<string, string> = {};
  for (const key of SERVER_ENV_KEYS) {
    const value = process.env[key];
    if (value) define[`process.env.${key}`] = JSON.stringify(value);
  }
  return define;
}

/** Lovable only injects VITE_* into import.meta.env. Server fns read process.env. */
function injectServerEnvFromDotenv(): Plugin {
  return {
    name: "inject-server-env-from-dotenv",
    config(_, { mode }) {
      applyDotenvToProcess(mode);
    },
  };
}

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  // Production on the droplet is Node, not Cloudflare Workers.
  cloudflare: process.env.FORGE_NODE === "1" ? false : undefined,
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [injectServerEnvFromDotenv()],
    define: defineServerProcessEnv(),
    ssr: process.env.FORGE_NODE === "1" ? { noExternal: true } : undefined,
    server: {
      allowedHosts: [
        "ryvalcontent.space",
        "www.ryvalcontent.space",
        "forge.68.183.112.176.sslip.io",
        ".sslip.io",
      ],
    },
  },
});
