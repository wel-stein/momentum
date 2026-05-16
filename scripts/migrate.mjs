#!/usr/bin/env node
// Run every .sql file under supabase/migrations/ against the Postgres URL
// from POSTGRES_URL_NON_POOLING (preferred) or POSTGRES_URL.
//
// Usage (recommended):
//   node --env-file=.env.local scripts/migrate.mjs
//
// Or just:
//   npm run migrate
//
// The .sql files in supabase/migrations/ are idempotent — re-running is safe.

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(here, "..");

// Fallback loader so the script also works without --env-file.
async function loadEnvLocalIfNeeded() {
  if (process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL) return;
  try {
    const text = await readFile(path.join(repoRoot, ".env.local"), "utf-8");
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (key && !(key in process.env)) process.env[key] = value;
    }
  } catch {
    // .env.local is optional — surface the real error below if needed.
  }
}

await loadEnvLocalIfNeeded();

const url =
  process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || "";

if (!url) {
  console.error(
    "✗ No Postgres URL found. Set POSTGRES_URL_NON_POOLING in .env.local",
  );
  console.error(
    "  (or pass it via the environment). You can copy the value from the",
  );
  console.error("  Supabase dashboard → Project Settings → Database.");
  process.exit(1);
}

const migrationsDir = path.join(repoRoot, "supabase", "migrations");
const files = (await readdir(migrationsDir))
  .filter((f) => f.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.log("No .sql files in supabase/migrations/ — nothing to do.");
  process.exit(0);
}

const safeUrl = url.replace(/:[^:@/]+@/, ":***@");
console.log(`→ connecting to ${safeUrl}`);

// pg ≥ 8.20 reinterprets sslmode=require as verify-full, which fails against
// Supabase's pooler (self-signed chain). Opt back into libpq semantics so
// "require" means "use TLS, don't verify the cert".
function withLibpqSsl(connStr) {
  const u = new URL(connStr);
  if (!u.searchParams.has("uselibpqcompat")) {
    u.searchParams.set("uselibpqcompat", "true");
  }
  if (!u.searchParams.has("sslmode")) {
    u.searchParams.set("sslmode", "require");
  }
  return u.toString();
}

const client = new pg.Client({
  connectionString: withLibpqSsl(url),
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
} catch (err) {
  console.error("✗ Failed to connect:", err.message);
  process.exit(1);
}

let applied = 0;
for (const file of files) {
  const sql = await readFile(path.join(migrationsDir, file), "utf-8");
  process.stdout.write(`→ ${file} ... `);
  try {
    await client.query(sql);
    applied += 1;
    console.log("ok");
  } catch (err) {
    console.log("FAILED");
    console.error(`   ${err.message}`);
    await client.end();
    process.exit(1);
  }
}

await client.end();
console.log(`\n✓ Applied ${applied} migration${applied === 1 ? "" : "s"}.`);
