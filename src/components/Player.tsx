import React, { useEffect, useMemo, useRef, useState } from "react";
import type { AlbumData, TrackItem, VideoItem } from "./AlbumCard";
import {
  Shuffle,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Repeat,
  Repeat1,
  Volume2,
  Music2,
  Video as VideoIcon,
  Disc3,
} from "lucide-react";

type QueueItem =
  | (TrackItem & { kind: "audio" })
  | (VideoItem & { kind: "video" });

function buildQueue(album: AlbumData): QueueItem[] {
  const tracks: QueueItem[] = (album.tracks || []).map((t) => ({
    ...t,
    kind: "audio",
  }));
  const videos: QueueItem[] = (album.videos || []).map((v) => ({
    ...v,
    kind: "video",
  }));
  return [...tracks, ...videos];
}

function mediaUrl(base: string, file: string) {
  return `${base}/${encodeURIComponent(file)}`;
}

function useMediaSession(
  album: AlbumData | null,
  item: QueueItem | null,
  onPrev: () => void,
  onNext: () => void,
  onPlay: () => void,
  onPause: () => void,
  seekTo: (time: number) => void,
  coverUrl: string | null,
) {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator))
      return;
    if (!album || !item) return;
    navigator.mediaSession.metadata = new (window as any).MediaMetadata({
      title: item.title,
      artist: album.artist,
      album: album.title,
      artwork: coverUrl
        ? [{ src: coverUrl, sizes: "512x512", type: "image/png" }]
        : [],
    });
    navigator.mediaSession.setActionHandler("previoustrack", onPrev);
    navigator.mediaSession.setActionHandler("nexttrack", onNext);
    navigator.mediaSession.setActionHandler("play", onPlay);
    navigator.mediaSession.setActionHandler("pause", onPause);
    navigator.mediaSession.setActionHandler("seekto", (details: any) => {
      if (typeof details.seekTime === "number") seekTo(details.seekTime);
    });
  }, [album, item, onPrev, onNext, onPlay, onPause, seekTo, coverUrl]);
}

export default function Player({ albums }: { albums: AlbumData[] }) {
  const [selectedSlug, setSelectedSlug] = useState<string>(
    albums[0]?.slug ?? "",
  );
  const album = useMemo(() => {
    const found =
      albums.find((a) => a.slug === selectedSlug) ?? albums[0] ?? null;
    if (!found) return null;
    // Default artist fallback
    return { ...found, artist: found.artist || "Loftwah" } as AlbumData;
  }, [albums, selectedSlug]);
  // Always fetch media via the Worker route that proxies R2
  const base = album ? `/media/${album.slug}` : "";
  const coverUrl = album
    ? `/media/${album.slug}/${encodeURIComponent(album.cover)}`
    : null;
  const queue = useMemo(() => (album ? buildQueue(album) : []), [album]);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<"none" | "one" | "all">("all");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const mediaRef = useRef<
    HTMLAudioElement &
      HTMLVideoElement & { pause: () => void; play: () => Promise<void> }
  >(null as any);

  useEffect(() => {
    setIndex(0);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [album?.slug]);

  const current = queue[index] ?? null;

  const doPlay = async () => {
    try {
      await mediaRef.current?.play();
      setIsPlaying(true);
    } catch {}
  };
  const doPause = () => {
    mediaRef.current?.pause();
    setIsPlaying(false);
  };
  const prev = () => {
    if (mediaRef.current) mediaRef.current.currentTime = 0;
    if (index > 0) setIndex(index - 1);
    else if (repeat === "all") setIndex(queue.length - 1);
  };
  const next = () => {
    if (index < queue.length - 1) setIndex(index + 1);
    else if (repeat === "all") setIndex(0);
  };
  const seekTo = (t: number) => {
    if (mediaRef.current)
      mediaRef.current.currentTime = Math.max(0, Math.min(duration || 0, t));
  };

  useEffect(() => {
    if (!mediaRef.current) return;
    mediaRef.current.volume = volume;
  }, [volume, current?.file]);

  useMediaSession(
    album,
    current,
    prev,
    next,
    doPlay,
    doPause,
    seekTo,
    coverUrl,
  );

  useEffect(() => {
    if (!current) return;
    if (shuffle) setIndex(Math.floor(Math.random() * queue.length));
  }, [shuffle]);

  useEffect(() => {
    if (isPlaying) doPlay();
  }, [current?.file]);

  const onEnded = () => {
    if (repeat === "one") {
      if (mediaRef.current) mediaRef.current.currentTime = 0;
      doPlay();
      return;
    }
    next();
  };

  const src = current ? mediaUrl(base, current.file) : undefined;
  const [coverFallback, setCoverFallback] = useState<string | null>(null);

  return (
    <div className="">
      {/* Main content: queue left, now playing right */}
      <div className="mx-auto max-w-4xl px-4">
        {/* Now Playing header row (compact) */}
        {album && current && (
          <div className="mb-5">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide opacity-70">
              <Disc3 size={14} /> Now Playing
            </div>
            <div className="flex items-center gap-4">
              <div className="size-20 border border-white bg-black flex-shrink-0">
              {current.kind === "video" ? (
                <img
                  src={coverFallback || coverUrl || ""}
                  alt={album.title}
                  className="h-full w-full object-cover"
                  onError={() => setCoverFallback("/blog-placeholder-1.jpg")}
                />
              ) : (
                <img
                  src={coverFallback || coverUrl || ""}
                  alt={album.title}
                  className="h-full w-full object-cover"
                  onError={() => setCoverFallback("/blog-placeholder-1.jpg")}
                />
              )}
              </div>
              <div className="min-w-0">
                <div className="truncate text-lg font-semibold">
                  {album.title}
                </div>
                <div className="truncate text-sm opacity-80">
                  {current.title} · {album.artist}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* If video, show the player above the list */}
        {current?.kind === "video" && (
          <div className="mb-3">
            <video
              ref={mediaRef as any}
              src={src}
              className="w-full max-h-[40vh] bg-black"
              controls={false}
              onTimeUpdate={() =>
                setCurrentTime(mediaRef.current?.currentTime || 0)
              }
              onLoadedMetadata={() =>
                setDuration(mediaRef.current?.duration || 0)
              }
              onEnded={onEnded}
              playsInline
            />
          </div>
        )}

        {/* For audio keep a hidden audio element */}
        {current?.kind !== "video" && (
          <audio
            ref={mediaRef as any}
            src={src}
            onTimeUpdate={() =>
              setCurrentTime(mediaRef.current?.currentTime || 0)
            }
            onLoadedMetadata={() =>
              setDuration(mediaRef.current?.duration || 0)
            }
            onEnded={onEnded}
          />
        )}

        {/* Album selector (compact pills) */}
        <div className="flex flex-wrap gap-2 pb-4">
          {albums.map((a) => (
            <button
              key={a.slug}
              className={`pill ${a.slug === album?.slug ? "pill-active" : ""}`}
              onClick={() => setSelectedSlug(a.slug)}
            >
              {a.title}
            </button>
          ))}
        </div>

        {/* Queue list (one column) */}
        <ol className="divide-y divide-white/40 border border-white/40 rounded-sm overflow-hidden">
          {queue.map((q, i) => (
            <li
              key={`${q.kind}:${q.file}`}
              className={`${i === index ? "bg-white text-black" : ""}`}
            >
              <button
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white hover:text-black transition-colors`}
                onClick={() => {
                  setIndex(i);
                  if (!isPlaying) doPlay();
                }}
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
                {i === index ? (
                  isPlaying ? (
                    <span className="inline-flex items-end gap-0.5" aria-label="Now playing">
                      <span className="eq-bar" style={{ animationDelay: "0ms" }} />
                      <span className="eq-bar" style={{ animationDelay: "150ms" }} />
                      <span className="eq-bar" style={{ animationDelay: "300ms" }} />
                    </span>
                  ) : (
                    <Play size={14} aria-label="Selected" />
                  )
                ) : "durationSec" in q && q.durationSec ? (
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
      </div>

      {/* Bottom transport bar */}
      <div className="player-bar sticky bottom-0 left-0 right-0 bg-black/90 backdrop-blur supports-[backdrop-filter]:bg-black/70">
        <div className="panel p-3 mx-auto max-w-4xl mt-6">
          {/* Transport controls in 3-column grid for perfect centering */}
          <div className="grid grid-cols-3 items-center gap-4">
            {/* Left: shuffle */}
            <div className="flex items-center gap-2">
              <button
                className="control-btn"
                data-active={shuffle}
                onClick={() => setShuffle((s) => !s)}
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
                onClick={prev}
                title="Previous"
                aria-label="Previous"
              >
                <SkipBack size={18} />
              </button>
              {isPlaying ? (
                <button
                  className="control-btn primary"
                  onClick={doPause}
                  title="Pause"
                  aria-label="Pause"
                >
                  <Pause size={20} />
                </button>
              ) : (
                <button
                  className="control-btn primary"
                  onClick={doPlay}
                  title="Play"
                  aria-label="Play"
                >
                  <Play size={20} />
                </button>
              )}
              <button
                className="control-btn"
                onClick={next}
                title="Next"
                aria-label="Next"
              >
                <SkipForward size={18} />
              </button>
            </div>

            {/* Right: repeat + volume */}
            <div className="flex items-center justify-end gap-2">
              <button
                className="control-btn"
                data-active={repeat !== "none"}
                onClick={() =>
                  setRepeat((r) =>
                    r === "none" ? "one" : r === "one" ? "all" : "none",
                  )
                }
                title={
                  repeat === "one"
                    ? "Repeat one"
                    : repeat === "all"
                      ? "Repeat all"
                      : "Repeat off"
                }
                aria-label="Repeat"
              >
                {repeat === "one" ? (
                  <Repeat1 size={18} />
                ) : (
                  <Repeat size={18} />
                )}
              </button>
              <div className="ml-2 hidden sm:flex items-center gap-2">
                <span className="text-xs text-white flex items-center gap-1">
                  <Volume2 size={16} /> VOL
                </span>
                <input
                  className="w-32"
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* Seek */}
          <div className="mt-3 flex items-center gap-3">
            <span className="text-xs text-white tabular-nums">
              {formatTime(currentTime)}
            </span>
            <input
              className="flex-1"
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={(e) => seekTo(Number(e.target.value))}
            />
            <span className="text-xs text-white tabular-nums">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>
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
