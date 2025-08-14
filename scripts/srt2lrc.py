#!/usr/bin/env python3
"""
Convert an SRT subtitle file (from Whisper) to a simple LRC lyrics file.

Usage:
  python3 scripts/srt2lrc.py input.srt > output.lrc
  python3 scripts/srt2lrc.py input.srt -o output.lrc

Notes:
  - Produces [mm:ss.xx] timestamped lines using each cue's start time
  - Joins multi-line cues with a single space
  - Strips leading/trailing whitespace
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


SRT_TIME_RE = re.compile(
    r"^(?P<start_h>\d{2}):(?P<start_m>\d{2}):(?P<start_s>\d{2})[,.](?P<start_ms>\d{1,3})\s+-->\s+"
    r"(?P<end_h>\d{2}):(?P<end_m>\d{2}):(?P<end_s>\d{2})[,.](?P<end_ms>\d{1,3})\s*$"
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Convert SRT to LRC")
    parser.add_argument("srt_path", type=Path, help="Path to input .srt file")
    parser.add_argument("-o", "--output", type=Path, help="Path to write .lrc; defaults to stdout")
    return parser.parse_args()


def format_timestamp_lrc(hours: int, minutes: int, seconds: int, milliseconds: int) -> str:
    total_seconds = hours * 3600 + minutes * 60 + seconds + (milliseconds / 1000.0)
    mm = int(total_seconds // 60)
    ss = int(total_seconds % 60)
    hundredths = int(round((total_seconds - int(total_seconds)) * 100))
    if hundredths == 100:
        # Handle rounding edge case, e.g., 59.995 -> 60.00
        hundredths = 0
        ss += 1
        if ss == 60:
            ss = 0
            mm += 1
    return f"[{mm:02d}:{ss:02d}.{hundredths:02d}]"


def srt_to_lrc_lines(srt_text: str) -> list[str]:
    lines = srt_text.splitlines()
    i = 0
    lrc_lines: list[str] = []

    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue

        # Optional numeric index line
        if line.isdigit():
            i += 1
            if i >= len(lines):
                break
            line = lines[i].strip()

        # Timecode line
        m = SRT_TIME_RE.match(line)
        if not m:
            # Skip malformed blocks
            i += 1
            continue

        start_h = int(m.group("start_h"))
        start_m = int(m.group("start_m"))
        start_s = int(m.group("start_s"))
        start_ms = int(m.group("start_ms").ljust(3, "0")[:3])

        timestamp_tag = format_timestamp_lrc(start_h, start_m, start_s, start_ms)

        # Collect subsequent text lines until blank
        i += 1
        cue_text_parts: list[str] = []
        while i < len(lines):
            t = lines[i]
            if not t.strip():
                break
            cue_text_parts.append(t.strip())
            i += 1

        # Join multi-line cue and normalize spaces
        text = re.sub(r"\s+", " ", " ".join(cue_text_parts)).strip()
        if text:
            lrc_lines.append(f"{timestamp_tag}{text}")

        # Advance to next block (skip the blank line)
        while i < len(lines) and lines[i].strip():
            i += 1
        i += 1

    return lrc_lines


def main() -> int:
    args = parse_args()
    srt_path: Path = args.srt_path
    if not srt_path.exists():
        print(f"Input not found: {srt_path}", file=sys.stderr)
        return 2

    try:
        srt_text = srt_path.read_text(encoding="utf-8")
    except Exception as exc:  # noqa: BLE001
        print(f"Failed to read SRT: {exc}", file=sys.stderr)
        return 2

    lrc_lines = srt_to_lrc_lines(srt_text)

    if args.output:
        try:
            args.output.write_text("\n".join(lrc_lines) + "\n", encoding="utf-8")
        except Exception as exc:  # noqa: BLE001
            print(f"Failed to write LRC: {exc}", file=sys.stderr)
            return 2
    else:
        sys.stdout.write("\n".join(lrc_lines) + "\n")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())


