# Lyrics Generation (LRC) with uv + Whisper

This guide shows how to generate time-synced lyric files (`.lrc`) for tracks in `music/` using `uv` + `openai-whisper`.

> Scope: Create `.lrc` files only (no local playback or verification steps).

---

## Prerequisites

- Linux with `bash` and `zsh`
- `ffmpeg` (for audio decoding)
- `uv` (Python/venv manager)

---

## 1) Install uv and ensure it is on PATH

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
# Add to PATH for current and future shells
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
export PATH="$HOME/.local/bin:$PATH"
uv --version
```

## 2) Set up Python via uv and create a venv

```bash
cd /home/loftwah/gits/loftwahfm
uv python install
uv venv
source .venv/bin/activate
python --version
```

## 3) Install system dependency for Whisper

```bash
sudo apt-get update && sudo apt-get install -y ffmpeg
ffmpeg -version | head -n1
```

## 4) Install Whisper CLI into the project venv

```bash
uv pip install --upgrade pip
uv pip install openai-whisper
.venv/bin/whisper --help | head -n 5
```

---

## 5) Generate an `.lrc` file for a single track (via SRT → LRC)

Whisper does not output LRC directly. Generate SRT, then convert to LRC using `scripts/srt2lrc.py`.

```bash
TEST_SONG="/home/loftwah/gits/loftwahfm/music/phantom-love/Phantom Love.mp3"
OUT_DIR="$(dirname "$TEST_SONG")"
BASENAME="$(basename "$TEST_SONG" .mp3)"

# 1) Generate SRT next to the MP3
.venv/bin/whisper "$TEST_SONG" \
  --model medium \
  --output_format srt \
  --output_dir "$OUT_DIR"

# Whisper may include a language code, handle both
SRT_FILE=""
if [ -f "$OUT_DIR/$BASENAME.srt" ]; then SRT_FILE="$OUT_DIR/$BASENAME.srt"; fi
if [ -z "$SRT_FILE" ] && [ -f "$OUT_DIR/$BASENAME.en.srt" ]; then SRT_FILE="$OUT_DIR/$BASENAME.en.srt"; fi
if [ -z "$SRT_FILE" ]; then echo "No .srt found for $TEST_SONG" && exit 1; fi

# 2) Convert SRT -> LRC next to the MP3
python3 scripts/srt2lrc.py "$SRT_FILE" -o "$OUT_DIR/$BASENAME.lrc"
```

After running, the `.lrc` will sit next to the `.mp3` in the same album folder.

---

## 6) (Optional) Generate `.lrc` for all tracks under `music/`

This will create `.lrc` files beside each `.mp3` without overwriting any existing `.lrc`.

```bash
ROOT="/home/loftwah/gits/loftwahfm/music"
find "$ROOT" -type f -name '*.mp3' | while read -r mp3; do
  dir="$(dirname "$mp3")"
  base_noext="$(basename "$mp3" .mp3)"

  # Skip if LRC already exists
  if [ -f "$dir/$base_noext.lrc" ]; then
    echo "Skip existing: $mp3"; continue
  fi

  echo "Generating SRT: $mp3"
  .venv/bin/whisper "$mp3" --model medium --output_format srt --output_dir "$dir"

  srt=""
  if [ -f "$dir/$base_noext.srt" ]; then srt="$dir/$base_noext.srt"; fi
  if [ -z "$srt" ] && [ -f "$dir/$base_noext.en.srt" ]; then srt="$dir/$base_noext.en.srt"; fi
  if [ -z "$srt" ]; then echo "No SRT produced for $mp3"; continue; fi

  echo "Converting to LRC: $mp3"
  python3 scripts/srt2lrc.py "$srt" -o "$dir/$base_noext.lrc"
done
```

---

## Expected file placement

- For each song, the `.lrc` file should live next to the `.mp3` with the same basename, e.g.:
  - `music/phantom-love/Phantom Love.mp3`
  - `music/phantom-love/Phantom Love.lrc`

That’s it—once generated, your `.lrc` files are ready for use in LoftwahFM.
