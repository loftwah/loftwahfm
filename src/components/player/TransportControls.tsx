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
    <div className="grid grid-cols-3 items-center gap-4">
      {/* Left: shuffle */}
      <div className="flex items-center gap-2">
        <button
          className="control-btn"
          data-active={shuffle}
          onClick={onToggleShuffle}
          aria-pressed={shuffle}
          title="Shuffle"
        >
          <Shuffle size={18} />
        </button>
      </div>

      {/* Center: prev / play / next */}
      <div className="flex items-center justify-center gap-5">
        <button
          className="control-btn"
          onClick={onPrev}
          title="Previous"
          aria-label="Previous"
        >
          <SkipBack size={18} />
        </button>
        {isPlaying ? (
          <button
            className="control-btn primary"
            onClick={onPause}
            title="Pause"
            aria-label="Pause"
          >
            <Pause size={20} />
          </button>
        ) : (
          <button
            className="control-btn primary"
            onClick={onPlay}
            title="Play"
            aria-label="Play"
          >
            <Play size={20} />
          </button>
        )}
        <button
          className="control-btn"
          onClick={onNext}
          title="Next"
          aria-label="Next"
        >
          <SkipForward size={18} />
        </button>
      </div>

      {/* Right: repeat + custom slot (e.g., volume) */}
      <div className="flex items-center justify-end gap-2">
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
          aria-label="Repeat"
        >
          {repeat === "one" ? <Repeat1 size={18} /> : <Repeat size={18} />}
        </button>
        {rightSlot}
      </div>
    </div>
  );
}

export default TransportControls;
