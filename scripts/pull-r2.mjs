#!/usr/bin/env node
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";

const root = process.cwd();
const mediaRoot = join(root, "music");
const env = process.argv[2] === "prod" ? "prod" : "dev";

const nodeBin = process.execPath;
const wranglerBin = join(root, "node_modules", "wrangler", "bin", "wrangler.js");
function sh(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

const bucket = env === "prod" ? "loftwahfm" : "loftwahfm-dev";

// Wrangler 4.21.x cannot list objects. Use local sync cache instead.
const cachePath = join(root, env === "prod" ? ".r2-sync-cache.prod.json" : ".r2-sync-cache.dev.json");
let cache = {};
try {
  cache = JSON.parse(execSync(`cat ${JSON.stringify(cachePath)}`, { encoding: "utf8" }));
} catch {}
const keys = Object.keys((cache && cache.objects) || {});

for (const rawKey of keys) {
  // Normalize to <slug>/<filename>
  const normalized = rawKey.replace(/^loftwahfm(-dev)?\//, "");
  if (!/^[^/]+\/.+/.test(normalized)) continue;

  const outPath = join(mediaRoot, normalized);
  mkdirSync(dirname(outPath), { recursive: true });
  const getCmd = `${JSON.stringify(nodeBin)} ${JSON.stringify(wranglerBin)} r2 object get --remote "${bucket}/${normalized}" --file "${outPath}"`;
  try {
    sh(getCmd);
  } catch (e) {
    console.warn(`Failed to download ${normalized}`);
  }
}

// Drop a README in music/ to warn about gitignore
mkdirSync(mediaRoot, { recursive: true });
const note = `This directory stores local media (audio/images) per album slug.\nIt is ignored by git (.gitignore).\nUploaded to R2 via scripts/sync-r2.mjs.\n`;
try { writeFileSync(join(mediaRoot, "README.txt"), note); } catch {}

console.log("R2 pull complete.");


