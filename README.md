## LoftwahFM

Minimal, black & white, web‑first music player built with Astro + React, served on Cloudflare Workers, and streaming media from Cloudflare R2.

### Overview

- **Albums** are defined in `src/content/albums/*.yaml` and rendered on the homepage.
- **Media files** (audio/video/cover images) live under `music/<album-slug>/...` locally (ignored by git). They are uploaded to R2 and streamed through `src/pages/media/[...key].ts`.
- **Dev bucket**: `loftwahfm-dev` (used by preview). **Prod bucket**: `loftwahfm`.
- **Node version**: `22` (see `.nvmrc`).

## Prerequisites

- Node 22: `nvm use 22`
- Install dependencies: `npm ci`
- Cloudflare account and Wrangler logged in: `npx wrangler login`

## Commands

- **Preview (dev bucket, auto‑sync albums, remote dev):**
  - `npm run preview`
- **Deploy to production (auto‑sync albums, then deploy):**
  - `npm run deploy`
- **Manual R2 sync only:**
  - `npm run sync:dev` or `npm run sync:prod`

The preview uses `wrangler dev --remote` with `MEDIA` bound to `loftwahfm-dev`. Production uses `MEDIA` bound to `loftwahfm` (see `wrangler.json`).

## Add a new album

1. Create a folder at `music/` with the album slug. Example: `music/future-classics/`.

Put files directly in this folder (no subdirectories):

- `cover.jpg` (or `.png`, used for the album card and metadata)
- `.mp3` audio files
- Optional video files: `.mp4` or `.webm`

2. Add a YAML file at `src/content/albums/<slug>.yaml`:

```yaml
slug: future-classics
title: Future Classics
artist: Loftwah
year: 2025
cover: cover.jpg
tracks:
  - title: Track One
    file: Track One.mp3
  - title: Track Two
    file: Track Two.mp3
# Optional videos
# videos:
#   - title: Video One
#     file: Video One.mp4
#     poster: cover.jpg
```

3. Preview:

- `npm run preview`

The sync step uploads every file in each `music/<slug>/` folder to `loftwahfm-dev` under keys `<slug>/<filename>`. The UI will list the new album and stream media via `/media/<slug>/<file>`.

4. Deploy when ready:

- `npm run deploy`

## How it works

- `src/content.config.ts` defines the `albums` collection and schema. `src/pages/index.astro` loads all albums with `getCollection('albums')` and renders cards and the player.
- `src/components/AlbumCard.tsx` and `src/components/Player.tsx` both fetch media via the `/media/` route so that R2 headers/range requests are handled properly.
- `src/pages/media/[...key].ts` is an edge route that proxies R2, supports range requests, sets content type, and respects ETag/Last‑Modified.
- `scripts/sync-r2.mjs` uploads the contents of each `music/<slug>/` folder to the appropriate R2 bucket. `npm run preview` calls `sync:dev` automatically; `npm run deploy` calls `sync:prod` first.

## All Songs mode

- The homepage shows a virtual card titled "All Songs". Clicking it plays a single queue that includes every track and video from all albums.
- The selection is reflected in the URL as the query param `?album=all` so it can be linked directly.
- Provide an image at `public/all-songs.jpg` to use as the card artwork (recommended square). If the file is missing, the card will render without a cover until you add it.
- While in All Songs, the Now Playing section and media session artwork display the current track's actual album cover.

### R2 keys

R2 object keys follow this pattern:

```
<bucket>/<slug>/<filename>
```

Examples:

- `loftwahfm-dev/phantom-love/cover.jpg`
- `loftwahfm-dev/phantom-love/Phantom Love.mp3`
- `loftwahfm-dev/shadow-moves/Shadow Moves (Pop Remix).mp3`

## Conventions and tips

- Filenames in YAML must match files exactly (case and spaces). The app URL‑encodes filenames when requesting via `/media/...`.
- Keep album folders flat. Avoid nested folders.
- Covers are read from `/media/<slug>/<cover>`; use a square or near‑square image to best fill the card.
- Videos are supported. Add a `videos:` array in YAML; the player will show a video element for those queue items.
- Shuffle picks a random next/prev item each time. Repeat modes: off, one, all.

## Troubleshooting

- Missing cover or 404 from `/media/...`:
  - Confirm the file exists in R2 under `<slug>/<filename>`.
  - Check the filename and YAML entry match exactly.
  - In preview, confirm you are using the dev bucket (`loftwahfm-dev`).
- Audio won’t play or can’t seek:
  - Ensure requests are going through `/media/...` so range requests are supported.
- Album not listed:
  - Verify the YAML is in `src/content/albums/` and validates against the schema (see `src/content.config.ts`).
  - Restart preview if you added files while it was running.
- Wrong bucket in preview:
  - Check `wrangler.json` → `preview_bucket_name: "loftwahfm-dev"`.

## Project layout

- `src/pages/index.astro`: homepage and wiring for album list/player.
- `src/pages/media/[...key].ts`: R2 proxy route.
- `src/components/AlbumCard.tsx`, `src/components/Player.tsx`: UI components.
- `src/components/player/*`: player UI pieces.
- `src/content/albums/*.yaml`: album definitions.
- `scripts/sync-r2.mjs`: album file uploader (dev/prod) from `music/`.
- `scripts/pull-r2.mjs`: restore/download media from R2 into `music/`.
- `wrangler.json`: bucket bindings; dev uses `loftwahfm-dev`, prod uses `loftwahfm`.
- `.nvmrc`: Node 22.

## Roadmap

- Optional album scaffolding command to generate YAML from a folder.
- Album‑agnostic site icons and OG defaults.
