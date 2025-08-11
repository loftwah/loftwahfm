import React from "react";
import { Music2, Play, Video as VideoIcon } from "lucide-react";

export type QueueListItem = {
  kind: "audio" | "video";
  file: string;
  title: string;
  durationSec?: number;
};

interface QueueListProps {
  items: QueueListItem[];
  activeIndex: number;
  isPlaying: boolean;
  onSelect: (index: number) => void;
}

export function QueueList({
  items,
  activeIndex,
  isPlaying,
  onSelect,
}: QueueListProps) {
  return (
    <ol className="divide-y divide-white/40 border border-white/40 rounded-sm overflow-hidden">
      {items.map((q, i) => (
        <li
          key={`${q.kind}:${q.file}`}
          className={`${i === activeIndex ? "bg-white text-black" : ""}`}
        >
          <button
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white hover:text-black transition-colors"
            onClick={() => onSelect(i)}
            title={q.kind === "video" ? "Video" : "Audio"}
          >
            <span className="w-6 text-right tabular-nums text-xs opacity-70">
              {i + 1}
            </span>
            {q.kind === "video" ? (
              <VideoIcon size={16} />
            ) : (
              <Music2 size={16} />
            )}
            <span className="flex-1 truncate text-left">{q.title}</span>
            {i === activeIndex ? (
              isPlaying ? (
                <span
                  className="inline-flex items-end gap-0.5"
                  aria-label="Now playing"
                >
                  <span className="eq-bar" style={{ animationDelay: "0ms" }} />
                  <span
                    className="eq-bar"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="eq-bar"
                    style={{ animationDelay: "300ms" }}
                  />
                </span>
              ) : (
                <Play size={14} aria-label="Selected" />
              )
            ) : q.durationSec ? (
              <span className="text-xs tabular-nums opacity-80">
                {formatTime(q.durationSec)}
              </span>
            ) : (
              <span className="text-xs opacity-50"> </span>
            )}
          </button>
        </li>
      ))}
    </ol>
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

export default QueueList;
