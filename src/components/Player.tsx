import { useEffect, useMemo, useRef, useState } from "react";
import type { AlbumData, TrackItem, VideoItem } from "./AlbumCard";
import { TransportControls } from "./player/TransportControls";
import { SeekBar } from "./player/SeekBar";
import { VolumeControl } from "./player/VolumeControl";
import { QueueList } from "./player/QueueList";
import { NowPlaying } from "./player/NowPlaying";

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
          <NowPlaying
            album={album}
            item={{ kind: current.kind, title: current.title }}
            coverUrl={coverFallback || coverUrl || null}
          />
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
          {/* reuse Pill styles but via component for clarity */}
          {/* Avoid importing the entire AlbumCard; keep this lightweight */}
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
        <QueueList
          items={queue as any}
          activeIndex={index}
          isPlaying={isPlaying}
          onSelect={(i) => {
            setIndex(i);
            if (!isPlaying) doPlay();
          }}
        />
      </div>

      {/* Bottom transport bar */}
      <div className="player-bar sticky bottom-0 left-0 right-0 bg-black/90 backdrop-blur supports-[backdrop-filter]:bg-black/70">
        <div className="panel p-3 mx-auto max-w-4xl mt-6">
          <TransportControls
            isPlaying={isPlaying}
            onPlay={doPlay}
            onPause={doPause}
            onPrev={prev}
            onNext={next}
            shuffle={shuffle}
            onToggleShuffle={() => setShuffle((s) => !s)}
            repeat={repeat}
            onCycleRepeat={() =>
              setRepeat((r) =>
                r === "none" ? "one" : r === "one" ? "all" : "none",
              )
            }
            rightSlot={
              <VolumeControl volume={volume} onChange={(v) => setVolume(v)} />
            }
          />

          <SeekBar
            currentTime={currentTime}
            duration={duration}
            onSeek={seekTo}
          />
        </div>
      </div>
    </div>
  );
}
