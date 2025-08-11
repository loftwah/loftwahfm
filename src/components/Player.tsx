import React, { useEffect, useMemo, useRef, useState } from "react";
import type { AlbumData, TrackItem, VideoItem } from "./AlbumCard";

type QueueItem = (TrackItem & { kind: "audio" }) | (VideoItem & { kind: "video" });

function buildQueue(album: AlbumData): QueueItem[] {
  const tracks: QueueItem[] = (album.tracks || []).map((t) => ({ ...t, kind: "audio" }));
  const videos: QueueItem[] = (album.videos || []).map((v) => ({ ...v, kind: "video" }));
  return [...tracks, ...videos];
}

function mediaUrl(base: string, file: string) {
  return `${base}/${encodeURIComponent(file)}`;
}

function useMediaSession(album: AlbumData | null, item: QueueItem | null, onPrev: () => void, onNext: () => void, onPlay: () => void, onPause: () => void, seekTo: (time: number) => void, coverUrl: string | null) {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    if (!album || !item) return;
    navigator.mediaSession.metadata = new (window as any).MediaMetadata({
      title: item.title,
      artist: album.artist,
      album: album.title,
      artwork: coverUrl ? [{ src: coverUrl, sizes: "512x512", type: "image/png" }] : [],
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
  const [selectedSlug, setSelectedSlug] = useState<string>(albums[0]?.slug ?? "");
  const album = useMemo(() => albums.find((a) => a.slug === selectedSlug) ?? albums[0] ?? null, [albums, selectedSlug]);
  const base = album ? `/media/${album.slug}` : "";
  const coverUrl = album ? `/media/${album.slug}/${encodeURIComponent(album.cover)}` : null;
  const queue = useMemo(() => (album ? buildQueue(album) : []), [album]);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<"none" | "one" | "all">("all");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const mediaRef = useRef<HTMLAudioElement & HTMLVideoElement & { pause: () => void; play: () => Promise<void> }>(null as any);

  useEffect(() => { setIndex(0); setIsPlaying(false); setCurrentTime(0); setDuration(0); }, [album?.slug]);

  const current = queue[index] ?? null;

  const doPlay = async () => { try { await mediaRef.current?.play(); setIsPlaying(true); } catch {} };
  const doPause = () => { mediaRef.current?.pause(); setIsPlaying(false); };
  const prev = () => {
    if (mediaRef.current) mediaRef.current.currentTime = 0;
    if (index > 0) setIndex(index - 1); else if (repeat === "all") setIndex(queue.length - 1);
  };
  const next = () => {
    if (index < queue.length - 1) setIndex(index + 1);
    else if (repeat === "all") setIndex(0);
  };
  const seekTo = (t: number) => { if (mediaRef.current) mediaRef.current.currentTime = Math.max(0, Math.min(duration || 0, t)); };

  useEffect(() => {
    if (!mediaRef.current) return;
    mediaRef.current.volume = volume;
  }, [volume, current?.file]);

  useMediaSession(album, current, prev, next, doPlay, doPause, seekTo, coverUrl);

  useEffect(() => {
    if (!current) return;
    if (shuffle) setIndex(Math.floor(Math.random() * queue.length));
  }, [shuffle]);

  useEffect(() => { if (isPlaying) doPlay(); }, [current?.file]);

  const onEnded = () => {
    if (repeat === "one") {
      if (mediaRef.current) mediaRef.current.currentTime = 0;
      doPlay();
      return;
    }
    next();
  };

  const src = current ? mediaUrl(base, current.file) : undefined;

  return (
    <div className="panel p-3 sticky bottom-0">
      {/* Album selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {albums.map((a) => (
          <button key={a.slug} className={`btn ${a.slug === album?.slug ? "bg-white/10" : ""}`} onClick={() => setSelectedSlug(a.slug)}>
            {a.title}
          </button>
        ))}
      </div>

      {/* Media element */}
      <div className="mb-2">
        {current?.kind === "video" ? (
          <video
            ref={mediaRef as any}
            src={src}
            className="w-full max-h-[40vh] bg-black"
            controls={false}
            onTimeUpdate={() => setCurrentTime(mediaRef.current?.currentTime || 0)}
            onLoadedMetadata={() => setDuration(mediaRef.current?.duration || 0)}
            onEnded={onEnded}
            playsInline
          />
        ) : (
          <audio
            ref={mediaRef as any}
            src={src}
            onTimeUpdate={() => setCurrentTime(mediaRef.current?.currentTime || 0)}
            onLoadedMetadata={() => setDuration(mediaRef.current?.duration || 0)}
            onEnded={onEnded}
          />
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button className="btn" onClick={() => setShuffle((s) => !s)} aria-pressed={shuffle}>Shuffle</button>
        <button className="btn" onClick={prev}>Prev</button>
        {isPlaying ? (
          <button className="btn" onClick={doPause}>Pause</button>
        ) : (
          <button className="btn" onClick={doPlay}>Play</button>
        )}
        <button className="btn" onClick={next}>Next</button>
        <button className="btn" onClick={() => setRepeat((r) => (r === "none" ? "one" : r === "one" ? "all" : "none"))}>Repeat: {repeat}</button>
        <input className="input w-24" type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
      </div>

      {/* Seek */}
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-white/60 tabular-nums">{formatTime(currentTime)}</span>
        <input
          className="flex-1"
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={(e) => seekTo(Number(e.target.value))}
        />
        <span className="text-xs text-white/60 tabular-nums">{formatTime(duration)}</span>
      </div>

      {/* Queue */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {queue.map((q, i) => (
          <button key={`${q.kind}:${q.file}`} className={`btn w-full ${i === index ? "bg-white/10" : ""}`} onClick={() => setIndex(i)}>
            {q.kind === "video" ? "🎬" : "♪"} {q.title}
          </button>
        ))}
      </div>
    </div>
  );
}

function formatTime(sec: number) {
  if (!sec || !Number.isFinite(sec)) return "0:00";
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  const m = Math.floor(sec / 60);
  return `${m}:${s}`;
}


