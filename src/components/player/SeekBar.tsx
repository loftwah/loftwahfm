import React from "react";

interface SeekBarProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

export function SeekBar({ currentTime, duration, onSeek }: SeekBarProps) {
  return (
    <div className="mt-3 flex items-center gap-3 select-none">
      <span className="text-xs text-white tabular-nums">
        {formatTime(currentTime)}
      </span>
      <input
        className="flex-1"
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={Number.isFinite(currentTime) ? currentTime : 0}
        onChange={(e) => onSeek(Number(e.target.value))}
        aria-label="Seek"
      />
      <span className="text-xs text-white tabular-nums">
        {formatTime(duration)}
      </span>
    </div>
  );
}

function formatTime(sec: number) {
  if (!sec || !Number.isFinite(sec)) return "0:00";
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  const m = Math.floor(sec / 60);
  return `${m}:${s}`;
}

export default SeekBar;
