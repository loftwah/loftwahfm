#!/usr/bin/env node
import { execSync } from "node:child_process";
import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const cachePath = join(root, ".r2-sync-cache.json");
let cache = {};
try {
  cache = JSON.parse(readFileSync(cachePath, "utf8"));
} catch {
  cache = {};
}
const albumsOnDisk = readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .filter(
    (name) =>
      !name.startsWith(".") &&
      ![
        "node_modules",
        "public",
        "src",
        "dist",
        ".git",
        ".turbo",
        "build",
        ".next",
        ".parcel-cache",
      ].includes(name),
  );

const env = process.argv[2] === "prod" ? "prod" : "dev";
const bucket = env === "prod" ? "loftwahfm" : "loftwahfm-dev";
if (!cache[env]) cache[env] = {};

function listFilesRecursive(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) continue; // flat upload; keys include only basename
    out.push(full);
  }
  return out;
}

function sh(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

if (albumsOnDisk.length === 0) {
  console.log("No album folders found to sync.");
  process.exit(0);
}

console.log(`Syncing albums to R2 bucket: ${bucket}`);

for (const slug of albumsOnDisk) {
  const albumDir = join(root, slug);
  try {
    const files = listFilesRecursive(albumDir);
    for (const file of files) {
      const base = file.substring(file.lastIndexOf("/") + 1);
      const key = `${bucket}/${slug}/${base}`;
      const st = statSync(file);
      const prev = cache[env][key];
      if (prev && prev.size === st.size && prev.mtimeMs === st.mtimeMs) {
        // unchanged; skip upload
        console.log(`Skip unchanged: ${key}`);
      } else {
        // Use --remote so preview (which runs remotely) sees the same objects
        sh(
          `npx --yes wrangler r2 object put "${key}" --file "${file}" --remote`,
        );
        cache[env][key] = { size: st.size, mtimeMs: st.mtimeMs };
      }
    }
  } catch (e) {
    // Skip non-folders
  }
}

console.log("R2 sync complete.");

try {
  writeFileSync(cachePath, JSON.stringify(cache, null, 2));
} catch {}
