import React from "react";
import {
  Shuffle,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Repeat,
  Repeat1,
} from "lucide-react";

export type RepeatMode = "none" | "one" | "all";

interface TransportControlsProps {
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  shuffle: boolean;
  onToggleShuffle: () => void;
  repeat: RepeatMode;
  onCycleRepeat: () => void;
  rightSlot?: React.ReactNode;
}

export function TransportControls(props: TransportControlsProps) {
  const {
    isPlaying,
    onPlay,
    onPause,
    onPrev,
    onNext,
    shuffle,
    onToggleShuffle,
    repeat,
    onCycleRepeat,
    rightSlot,
  } = props;

  return (
    <div
      className="grid grid-cols-[auto_1fr_auto] items-center gap-3 w-full select-none"
      role="toolbar"
      aria-label="Playback controls"
    >
      {/* Left: shuffle - tighter */}
      <div className="flex items-center gap-2 justify-start">
        <button
          className="control-btn"
          data-active={shuffle}
          onClick={onToggleShuffle}
          aria-pressed={shuffle}
          title="Shuffle"
          aria-label={shuffle ? "Shuffle on" : "Shuffle off"}
        >
          <Shuffle size={20} strokeWidth={2.75} />
        </button>
        <span className="text-xs opacity-80 hidden sm:inline" aria-hidden>
          {shuffle ? "Shuffle on" : "Shuffle off"}
        </span>
      </div>

      {/* Center: prev / play / next */}
      <div className="flex items-center justify-center gap-4">
        <button
          className="control-btn"
          onClick={onPrev}
          title="Previous"
          aria-label="Previous (P)"
        >
          <SkipBack size={20} strokeWidth={2.75} />
        </button>
        {isPlaying ? (
          <button
            className="control-btn primary"
            onClick={onPause}
            title="Pause"
            aria-label="Pause (Space)"
          >
            <Pause size={24} strokeWidth={2.75} />
          </button>
        ) : (
          <button
            className="control-btn primary"
            onClick={onPlay}
            title="Play"
            aria-label="Play (Space)"
          >
            <Play size={24} strokeWidth={2.75} />
          </button>
        )}
        <button
          className="control-btn"
          onClick={onNext}
          title="Next"
          aria-label="Next (N)"
        >
          <SkipForward size={20} strokeWidth={2.75} />
        </button>
      </div>

      {/* Right: repeat + custom slot (e.g., volume) */}
      <div className="flex items-center justify-end gap-3">
        <button
          className="control-btn"
          data-active={repeat !== "none"}
          onClick={onCycleRepeat}
          title={
            repeat === "one"
              ? "Repeat one"
              : repeat === "all"
                ? "Repeat all"
                : "Repeat off"
          }
          aria-label={
            repeat === "one"
              ? "Repeat one"
              : repeat === "all"
                ? "Repeat all"
                : "Repeat off"
          }
        >
          {repeat === "one" ? (
            <Repeat1 size={20} strokeWidth={2.75} />
          ) : (
            <Repeat size={20} strokeWidth={2.75} />
          )}
        </button>
        <span className="text-xs opacity-80 hidden sm:inline" aria-hidden>
          {repeat === "one"
            ? "Repeat one"
            : repeat === "all"
              ? "Repeat all"
              : "Repeat off"}
        </span>
        {rightSlot}
      </div>
    </div>
  );
}

export default TransportControls;
