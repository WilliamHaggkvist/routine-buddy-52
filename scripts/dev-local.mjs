// Starts the dev server locally with the values from .env and .env.local loaded
// into process.env, so server-side code (login, notifications) works the same
// way it does when the app runs on Lovable.
//
// Usage: bun run dev:local   (or: node scripts/dev-local.mjs)
// Pass --check to only verify that the env files parse, without starting Vite.

import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(file) {
  const path = resolve(root, file);
  if (!existsSync(path)) return false;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, raw] = match;
    let value = raw;
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    // Values already set by the environment (e.g. by the host platform) win.
    if (process.env[key] === undefined) process.env[key] = value;
  }
  return true;
}

const loaded = [".env", ".env.local"].filter(loadEnvFile);

if (process.argv.includes("--check")) {
  console.log(`Loaded env files: ${loaded.join(", ") || "(none)"}`);
  console.log(`SUPABASE_URL present: ${Boolean(process.env.SUPABASE_URL)}`);
  process.exit(0);
}

const viteEntry = ["node_modules/vite/bin/vite.js", "node_modules/.bin/vite"]
  .map((p) => resolve(root, p))
  .find((p) => existsSync(p));

if (!viteEntry) {
  console.error("Vite was not found. Install dependencies first: bun install (or npm install)");
  process.exit(1);
}

const child = spawn(process.execPath, [viteEntry, "dev"], {
  stdio: "inherit",
  cwd: root,
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));
