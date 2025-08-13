#!/usr/bin/env node
import { execSync } from "node:child_process";
import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

const root = process.cwd();
const mediaRoot = join(root, "music");
const env = process.argv[2] === "prod" ? "prod" : "dev";
const forceUpload = process.argv.includes("--force") || process.argv.includes("-f");
// Always target remote R2; allow opting out with --local
const useRemote = !process.argv.includes("--local");
const cachePath = join(
  root,
  env === "prod" ? ".r2-sync-cache.prod.json" : ".r2-sync-cache.dev.json",
);
let cache = {};
try {
  cache = JSON.parse(readFileSync(cachePath, "utf8"));
} catch {
  cache = {};
}
// If the media root does not exist (e.g., CI without the optional music folder), skip sync gracefully
if (!existsSync(mediaRoot)) {
  console.log('No "music" folder found; skipping R2 sync.');
  process.exit(0);
}

const albumsOnDisk = readdirSync(mediaRoot, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .filter((name) => !name.startsWith("."));

const bucket = env === "prod" ? "loftwahfm" : "loftwahfm-dev";
if (!cache.objects) cache.objects = {};

const allowedExtensions = new Set([
  ".mp3",
  ".wav",
  ".flac",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".txt",
  ".json",
  ".webmanifest",
  ".ico",
]);

function listFilesRecursive(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) continue; // flat upload; keys include only basename
    const ext = extname(full).toLowerCase();
    if (!allowedExtensions.has(ext)) continue;
    out.push(full);
  }
  return out;
}

const nodeBin = process.execPath;
const wranglerBin = join(root, "node_modules", "wrangler", "bin", "wrangler.js");
function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function shWithRetry(cmd, attempts = 3) {
  for (let i = 1; i <= attempts; i++) {
    try {
      execSync(cmd, { stdio: "inherit" });
      return;
    } catch (e) {
      if (i === attempts) throw e;
      const delay = 500 * i;
      console.warn(`Command failed. Retrying in ${delay}ms (${i}/${attempts})...`);
      sleep(delay);
    }
  }
}

// Note: wrangler 4.21.x does not support `r2 object head` or listing.
// We rely on a local change cache for skipping, and `--force` to override.

if (albumsOnDisk.length === 0) {
  console.log("No album folders found to sync.");
  process.exit(0);
}

console.log(`Syncing albums to R2 bucket: ${bucket}`);

for (const slug of albumsOnDisk) {
  const albumDir = join(mediaRoot, slug);
  try {
    const files = listFilesRecursive(albumDir);
    for (const file of files) {
      const base = file.substring(file.lastIndexOf("/") + 1);
      // Upload to bucket root under <slug>/<filename>
      const key = `${slug}/${base}`;
      const st = statSync(file);
      const prev = cache.objects[key];
      if (
        !forceUpload &&
        prev &&
        prev.size === st.size &&
        prev.mtimeMs === st.mtimeMs
      ) {
        console.log(`Skip unchanged: ${key}`);
        continue;
      }
      // Upload
      // Upload
      const remoteFlag = useRemote ? " --remote" : "";
      const putCmd = `${JSON.stringify(nodeBin)} ${JSON.stringify(wranglerBin)} r2 object put${remoteFlag} "${bucket}/${key}" --file "${file}"`;
      shWithRetry(putCmd);
      cache.objects[key] = { size: st.size, mtimeMs: st.mtimeMs };
    }
  } catch (e) {
    // Skip non-folders
  }
}

console.log("R2 sync complete.");

try {
  writeFileSync(cachePath, JSON.stringify(cache, null, 2));
} catch {}
