import React from "react";
import {
  Music2,
  Play,
  Video as VideoIcon,
  Download,
  Plus,
  X,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

export type QueueListItem = {
  kind: "audio" | "video";
  file: string;
  title: string;
  durationSec?: number;
  albumSlug?: string;
};

interface QueueListProps {
  items: QueueListItem[];
  activeIndex: number;
  isPlaying: boolean;
  onSelect: (index: number) => void;
  onAddToPlaylist?: (item: QueueListItem) => void;
  onRemoveFromPlaylist?: (index: number) => void;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  highlightIndex?: number | null;
}

export function QueueList({
  items,
  activeIndex,
  isPlaying,
  onSelect,
  onAddToPlaylist,
  onRemoveFromPlaylist,
  onMoveUp,
  onMoveDown,
  highlightIndex,
}: QueueListProps) {
  const [highlight, setHighlight] = React.useState<number | null>(null);

  React.useEffect(() => {
    const onMoved = (e: Event) => {
      const idx = (e as CustomEvent<number>).detail;
      if (typeof idx === "number") {
        setHighlight(idx);
        window.setTimeout(() => setHighlight(null), 600);
      }
    };
    window.addEventListener("lfm-row-moved", onMoved as EventListener);
    return () =>
      window.removeEventListener("lfm-row-moved", onMoved as EventListener);
  }, []);

  return (
    <ol
      className="divide-y divide-white/40 border border-white/40 rounded-sm overflow-hidden select-none"
      role="listbox"
      aria-label="Track queue"
    >
      {items.map((q, i) => {
        const downloadHref = q.albumSlug
          ? `/media/${q.albumSlug}/${encodeURIComponent(q.file)}`
          : undefined;
        const shareUrl = `?${(() => {
          const params = new URLSearchParams();
          if (q.albumSlug) params.set("album", q.albumSlug);
          params.set("file", q.file);
          return params.toString();
        })()}`;
        const isFirst = i === 0;
        const isLast = i === items.length - 1;
        const isHighlighted =
          (typeof highlightIndex === "number" && highlightIndex === i) ||
          highlight === i;
        return (
          <li
            key={`${q.kind}:${q.file}`}
            className={`${i === activeIndex ? "bg-white text-black" : ""}`}
            role="option"
            aria-selected={i === activeIndex}
          >
            <div
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white hover:text-black transition-colors ${isHighlighted ? "ring-2 ring-white" : ""}`}
            >
              <button
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
                onClick={() => onSelect(i)}
                title={q.kind === "video" ? "Video" : "Audio"}
                aria-label={`${i + 1}. ${q.title} ${q.kind === "video" ? "video" : "audio"}`}
              >
                <span className="w-6 text-right tabular-nums text-xs opacity-70">
                  {i + 1}
                </span>
                {q.kind === "video" ? (
                  <VideoIcon size={18} strokeWidth={2.5} className="shrink-0" />
                ) : (
                  <Music2 size={18} strokeWidth={2.5} className="shrink-0" />
                )}
                <span className="flex-1 min-w-0 truncate text-left">
                  {q.title}
                </span>
                {i === activeIndex ? (
                  isPlaying ? (
                    <span
                      className="inline-flex items-end gap-0.5 shrink-0"
                      aria-label="Now playing"
                    >
                      <span
                        className="eq-bar"
                        style={{ animationDelay: "0ms" }}
                      />
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
                    <Play
                      size={16}
                      strokeWidth={2.5}
                      aria-label="Selected"
                      className="shrink-0"
                    />
                  )
                ) : q.durationSec ? (
                  <span className="hidden sm:inline text-xs tabular-nums opacity-80 shrink-0">
                    {formatTime(q.durationSec)}
                  </span>
                ) : (
                  <span className="text-xs opacity-50"> </span>
                )}
              </button>
              <a
                href={shareUrl}
                onClick={(e) => e.stopPropagation()}
                className="ml-2 inline-flex items-center text-current/80 hover:text-current shrink-0 text-xs underline"
                aria-label={`Share link to ${q.title}`}
                title="Share link"
              >
                Share
              </a>
              {q.kind === "audio" && downloadHref ? (
                <a
                  href={downloadHref}
                  download={q.file}
                  onClick={(e) => e.stopPropagation()}
                  className="ml-2 inline-flex items-center text-current/80 hover:text-current shrink-0"
                  aria-label={`Download ${q.title}`}
                  title="Download"
                >
                  <Download size={16} />
                </a>
              ) : null}
              {onAddToPlaylist ? (
                <button
                  className="ml-2 inline-flex items-center text-current/80 hover:text-current shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToPlaylist(q);
                  }}
                  aria-label={`Add ${q.title} to My Playlist`}
                  title="Add to My Playlist"
                >
                  <Plus size={16} />
                </button>
              ) : null}
              {onMoveUp ? (
                <button
                  className={`ml-2 inline-flex items-center shrink-0 ${isFirst ? "opacity-40 cursor-not-allowed" : "text-current/80 hover:text-current"}`}
                  disabled={isFirst}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveUp(i);
                  }}
                  aria-label={`Move ${q.title} up. New position ${i}`}
                  title={`Move up (to ${i})`}
                >
                  <ArrowUp size={16} />
                </button>
              ) : null}
              {onMoveDown ? (
                <button
                  className={`ml-1 inline-flex items-center shrink-0 ${isLast ? "opacity-40 cursor-not-allowed" : "text-current/80 hover:text-current"}`}
                  disabled={isLast}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveDown(i);
                  }}
                  aria-label={`Move ${q.title} down. New position ${i + 2}`}
                  title={`Move down (to ${i + 2})`}
                >
                  <ArrowDown size={16} />
                </button>
              ) : null}
              {onRemoveFromPlaylist ? (
                <button
                  className="ml-2 inline-flex items-center text-current/80 hover:text-current shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFromPlaylist(i);
                  }}
                  aria-label={`Remove ${q.title} from My Playlist`}
                  title="Remove from My Playlist"
                >
                  <X size={16} />
                </button>
              ) : null}
            </div>
          </li>
        );
      })}
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
