import { useEffect, useMemo, useRef, useState } from "react";
import type { AlbumData, TrackItem, VideoItem } from "./AlbumCard";
import { TransportControls } from "./player/TransportControls";
import { SeekBar } from "./player/SeekBar";
import { VolumeControl } from "./player/VolumeControl";
import { QueueList } from "./player/QueueList";
import { NowPlaying } from "./player/NowPlaying";

type QueueItem =
  | (TrackItem & { kind: "audio"; albumSlug: string })
  | (VideoItem & { kind: "video"; albumSlug: string });

function buildQueue(album: AlbumData): QueueItem[] {
  const tracks: QueueItem[] = (album.tracks || []).map((t) => ({
    ...t,
    kind: "audio",
    albumSlug: album.slug,
  }));
  const videos: QueueItem[] = (album.videos || []).map((v) => ({
    ...v,
    kind: "video",
    albumSlug: album.slug,
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
  // Initialize from query param if present
  const initialSlug = (() => {
    try {
      const p = new URLSearchParams(window.location.search);
      return p.get("album") || albums[0]?.slug || "";
    } catch {
      return albums[0]?.slug || "";
    }
  })();
  const [selectedSlug, setSelectedSlug] = useState<string>(initialSlug);
  const [playlistVersion, setPlaylistVersion] = useState(0);
  const [playlistItems, setPlaylistItems] = useState<QueueItem[]>([]);
  // Bump this whenever a saved order for an album or All Songs changes
  const [orderVersion, setOrderVersion] = useState(0);
  const album = useMemo(() => {
    if (selectedSlug === "all") {
      return {
        slug: "all",
        title: "All Songs",
        artist: "Loftwah",
        year: new Date().getFullYear(),
        cover: "",
        tracks: [],
        videos: [],
      } as AlbumData;
    }
    if (selectedSlug === "playlist") {
      const tracks = playlistItems
        .filter((i) => i.kind === "audio")
        .map((t) => ({
          title: t.title,
          file: t.file,
          durationSec: t.durationSec,
        }));
      const videos = playlistItems
        .filter((i) => i.kind === "video")
        .map((v) => ({
          title: v.title,
          file: v.file,
          poster: (v as any).poster,
        }));
      return {
        slug: "playlist",
        title: "My Playlist",
        artist: "Loftwah",
        year: new Date().getFullYear(),
        cover: "/playlist.jpg",
        tracks,
        videos,
      } as AlbumData;
    }
    const found =
      albums.find((a) => a.slug === selectedSlug) ?? albums[0] ?? null;
    if (!found) return null;
    // Default artist fallback
    return { ...found, artist: found.artist || "Loftwah" } as AlbumData;
  }, [albums, selectedSlug, playlistVersion, playlistItems]);
  // Always fetch media via the Worker route that proxies R2
  const base = album ? `/media/${album.slug}` : "";
  // Lookup for per-album cover by slug
  const slugToAlbum = useMemo(() => {
    const map: Record<string, AlbumData> = {};
    for (const a of albums) map[a.slug] = a;
    return map;
  }, [albums]);
  const queue = useMemo(() => {
    if (!album) return [] as QueueItem[];
    // Helper to generate a unique/stable key for items
    const keyForItem = (it: QueueItem) =>
      `${it.albumSlug}:${it.kind}:${it.file}`;
    // Read saved order from localStorage for a given slug
    const readOrder = (slug: string): string[] => {
      try {
        const raw = localStorage.getItem(`lfm.order.${slug}`);
        if (!raw) return [];
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? (arr as string[]) : [];
      } catch {
        return [];
      }
    };
    // Apply saved order to a queue without losing unknown items (append them)
    const applySavedOrder = (slug: string, items: QueueItem[]): QueueItem[] => {
      const saved = readOrder(slug);
      if (!saved.length) return items;
      const map = new Map<string, QueueItem>();
      for (const it of items) map.set(keyForItem(it), it);
      const ordered: QueueItem[] = [];
      for (const k of saved) {
        const it = map.get(k);
        if (it) {
          ordered.push(it);
          map.delete(k);
        }
      }
      // Append any items that weren't in the saved list, keeping original relative order
      for (const it of items) {
        const k = keyForItem(it);
        if (map.has(k)) ordered.push(it);
      }
      return ordered;
    };

    if (album.slug === "all") {
      const q: QueueItem[] = [];
      for (const a of albums) q.push(...buildQueue(a));
      return applySavedOrder("all", q);
    }
    if (album.slug === "playlist") {
      return playlistItems;
    }
    return applySavedOrder(album.slug, buildQueue(album));
  }, [album, albums, playlistVersion, playlistItems, orderVersion]);
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
  const liveRef = useRef<HTMLDivElement | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!statusMsg) return;
    const t = window.setTimeout(() => setStatusMsg(null), 1200);
    return () => window.clearTimeout(t);
  }, [statusMsg]);

  useEffect(() => {
    setIndex(0);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [album?.slug]);

  // Reflect selected album in the URL for shareability
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (selectedSlug) url.searchParams.set("album", selectedSlug);
      else url.searchParams.delete("album");
      window.history.replaceState({}, "", url.toString());
    } catch {}
  }, [selectedSlug]);

  // Listen for album selection events dispatched by album cards
  useEffect(() => {
    const onAlbumSelect = (e: Event) => {
      const custom = e as CustomEvent<string>;
      if (custom.detail && custom.detail !== selectedSlug) {
        setSelectedSlug(custom.detail);
      }
    };
    window.addEventListener("album-select", onAlbumSelect as EventListener);
    return () =>
      window.removeEventListener(
        "album-select",
        onAlbumSelect as EventListener,
      );
  }, [selectedSlug]);

  const current = queue[index] ?? null;
  // Select initial track from ?file= param after queue is built
  useEffect(() => {
    try {
      if (!album) return;
      const params = new URLSearchParams(window.location.search);
      const fileParam = params.get("file");
      if (!fileParam) return;
      const idx = queue.findIndex((q) => q.file === fileParam);
      if (idx >= 0) setIndex(idx);
    } catch {}
  }, [album?.slug, queue.length]);
  // Playlist helpers
  const persistPlaylist = (items: QueueItem[]) => {
    try {
      localStorage.setItem("lfm.playlist", JSON.stringify({ items }));
      setPlaylistVersion((v) => v + 1);
      setPlaylistItems(items);
      try {
        window.dispatchEvent(new Event("lfm-playlist-updated"));
      } catch {}
    } catch {}
  };
  const addToPlaylist = (item: QueueItem) => {
    try {
      const raw = localStorage.getItem("lfm.playlist");
      const items = raw ? (JSON.parse(raw).items as QueueItem[]) || [] : [];
      // Avoid duplicate exact same file within same album positionally adjacent? Allow duplicates but this avoids immediate dup
      const last = items[items.length - 1];
      const next =
        last && last.file === item.file && last.albumSlug === item.albumSlug
          ? items
          : [...items, item];
      persistPlaylist(next);
    } catch {}
  };
  const removeFromPlaylist = (i: number) => {
    try {
      const raw = localStorage.getItem("lfm.playlist");
      const items = raw ? (JSON.parse(raw).items as QueueItem[]) || [] : [];
      const next = items.slice(0, i).concat(items.slice(i + 1));
      persistPlaylist(next);
    } catch {}
  };
  const moveUp = (i: number) => {
    if (i <= 0) return;
    try {
      const raw = localStorage.getItem("lfm.playlist");
      const items = raw ? (JSON.parse(raw).items as QueueItem[]) || [] : [];
      const copy = items.slice();
      const tmp = copy[i - 1];
      copy[i - 1] = copy[i];
      copy[i] = tmp;
      persistPlaylist(copy);
    } catch {}
  };
  const moveDown = (i: number) => {
    try {
      const raw = localStorage.getItem("lfm.playlist");
      const items = raw ? (JSON.parse(raw).items as QueueItem[]) || [] : [];
      if (i >= items.length - 1) return;
      const copy = items.slice();
      const tmp = copy[i + 1];
      copy[i + 1] = copy[i];
      copy[i] = tmp;
      persistPlaylist(copy);
    } catch {}
  };

  // Generic queue reordering for Album and All Songs views (persisted per view)
  const reorderWithinCurrentView = (fromIndex: number, toIndex: number) => {
    if (!album) return;
    if (fromIndex === toIndex) return;
    // Playlist uses its own persistence; skip here
    if (album.slug === "playlist") return;
    const slug = album.slug; // album slug or "all"
    const keyForItem = (it: QueueItem) =>
      `${it.albumSlug}:${it.kind}:${it.file}`;
    const currentKey = queue[index]
      ? keyForItem(queue[index] as QueueItem)
      : null;
    const keys = queue.map((it) => keyForItem(it as QueueItem));
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= keys.length ||
      toIndex >= keys.length
    )
      return;
    const copy = keys.slice();
    const [moved] = copy.splice(fromIndex, 1);
    copy.splice(toIndex, 0, moved);
    try {
      localStorage.setItem(`lfm.order.${slug}`, JSON.stringify(copy));
      setOrderVersion((v) => v + 1);
      if (currentKey) {
        const ni = copy.indexOf(currentKey);
        if (ni >= 0) setIndex(ni);
      }
      try {
        window.dispatchEvent(new Event("lfm-order-updated"));
        const movedTo = toIndex;
        const announceMsg = `Moved to position ${movedTo + 1}`;
        if (liveRef.current) {
          liveRef.current.textContent = announceMsg;
        }
      } catch {}
    } catch {}
  };

  const moveUpGeneric = (i: number) => {
    if (i <= 0) return;
    const movedItem = queue[i] as any;
    if (selectedSlug === "playlist") {
      moveUp(i);
      try {
        window.dispatchEvent(
          new CustomEvent("lfm-row-moved", { detail: i - 1 }),
        );
      } catch {}
      setStatusMsg(`Moved "${movedItem?.title || "Item"}" to #${i}`);
      if (liveRef.current)
        liveRef.current.textContent = `Moved to position ${i}`;
      return;
    }
    reorderWithinCurrentView(i, i - 1);
    try {
      window.dispatchEvent(new CustomEvent("lfm-row-moved", { detail: i - 1 }));
    } catch {}
    setStatusMsg(`Moved "${movedItem?.title || "Item"}" to #${i}`);
  };
  const moveDownGeneric = (i: number) => {
    if (i >= queue.length - 1) return;
    const movedItem = queue[i] as any;
    if (selectedSlug === "playlist") {
      moveDown(i);
      try {
        window.dispatchEvent(
          new CustomEvent("lfm-row-moved", { detail: i + 1 }),
        );
      } catch {}
      setStatusMsg(`Moved "${movedItem?.title || "Item"}" to #${i + 2}`);
      if (liveRef.current)
        liveRef.current.textContent = `Moved to position ${i + 2}`;
      return;
    }
    reorderWithinCurrentView(i, i + 1);
    try {
      window.dispatchEvent(new CustomEvent("lfm-row-moved", { detail: i + 1 }));
    } catch {}
    setStatusMsg(`Moved "${movedItem?.title || "Item"}" to #${i + 2}`);
  };

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
  const pickRandomIndex = (maxExclusive: number, exclude: number) => {
    if (maxExclusive <= 1) return 0;
    let r = exclude;
    while (r === exclude) {
      r = Math.floor(Math.random() * maxExclusive);
    }
    return r;
  };

  const prev = () => {
    if (mediaRef.current) mediaRef.current.currentTime = 0;
    if (shuffle) {
      setIndex(pickRandomIndex(queue.length, index));
      return;
    }
    if (index > 0) setIndex(index - 1);
    else if (repeat === "all") setIndex(queue.length - 1);
  };
  const next = () => {
    if (shuffle) {
      setIndex(pickRandomIndex(queue.length, index));
      return;
    }
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

  // Prefer the specific item's album cover when available (e.g., in All Songs)
  const resolvedCoverUrl = (() => {
    if (current?.albumSlug && slugToAlbum[current.albumSlug]?.cover) {
      const a = slugToAlbum[current.albumSlug];
      return `/media/${a.slug}/${encodeURIComponent(a.cover)}`;
    }
    if (album && album.cover) {
      return `/media/${album.slug}/${encodeURIComponent(album.cover)}`;
    }
    return null;
  })();

  useMediaSession(
    album,
    current,
    prev,
    next,
    doPlay,
    doPause,
    seekTo,
    resolvedCoverUrl,
  );

  // When toggling shuffle, do not jump tracks immediately; apply on next/prev instead

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

  const src = current
    ? mediaUrl(`/media/${current.albumSlug || album?.slug || ""}`, current.file)
    : undefined;
  const [coverFallback, setCoverFallback] = useState<string | null>(null);
  // Lyrics support: only attempt when playing an audio item from a real album (exclude virtual views like "all" and "playlist")
  const [lyrics, setLyrics] = useState<string | null>(null);
  useEffect(() => {
    setLyrics(null);
    const slug = current?.albumSlug || album?.slug;
    const isAudio = current?.kind === "audio";
    if (!slug || slug === "all" || slug === "playlist" || !isAudio) return;
    fetch(`/media/${slug}/${encodeURIComponent("lyrics.txt")}`)
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((text) => setLyrics(text))
      .catch(() => setLyrics(null));
  }, [current?.albumSlug, album?.slug, current?.kind]);
  // Refresh playlist-based views when the playlist changes elsewhere
  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem("lfm.playlist");
        const items = raw ? (JSON.parse(raw).items as QueueItem[]) : [];
        setPlaylistItems(items);
      } catch {}
    };
    read();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "lfm.playlist") {
        setPlaylistVersion((v) => v + 1);
        read();
      }
    };
    window.addEventListener("storage", onStorage);
    const onPlaylistUpdated = () => {
      setPlaylistVersion((v) => v + 1);
      read();
    };
    window.addEventListener("lfm-playlist-updated", onPlaylistUpdated as any);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(
        "lfm-playlist-updated",
        onPlaylistUpdated as any,
      );
    };
  }, []);

  // Keyboard shortcuts: Space=play/pause, arrows seek, P/N previous/next, up/down volume
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      // Avoid hijacking when user types in inputs
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.getAttribute("contenteditable") === "true")
      ) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        isPlaying ? doPause() : doPlay();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        seekTo((mediaRef.current?.currentTime || 0) + 5);
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        seekTo((mediaRef.current?.currentTime || 0) - 5);
      } else if (e.code === "KeyP") {
        e.preventDefault();
        prev();
      } else if (e.code === "KeyN") {
        e.preventDefault();
        next();
      } else if (e.code === "ArrowUp") {
        e.preventDefault();
        setVolume((v) => Math.min(1, Number((v + 0.05).toFixed(2))));
      } else if (e.code === "ArrowDown") {
        e.preventDefault();
        setVolume((v) => Math.max(0, Number((v - 0.05).toFixed(2))));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPlaying, prev, next, seekTo]);

  // Live region announcements
  const announce = (msg: string) => {
    if (liveRef.current) {
      liveRef.current.textContent = msg;
    }
  };

  useEffect(() => {
    if (album && current) {
      announce(`${current.title} by ${album.artist}`);
    }
  }, [album?.slug, current?.file]);

  useEffect(() => {
    announce(`Shuffle ${shuffle ? "on" : "off"}`);
  }, [shuffle]);

  useEffect(() => {
    announce(
      repeat === "one"
        ? "Repeat one"
        : repeat === "all"
          ? "Repeat all"
          : "Repeat off",
    );
  }, [repeat]);

  // Keep current track reflected in URL (?file=...) for easy sharing
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (current?.file) url.searchParams.set("file", current.file);
      else url.searchParams.delete("file");
      window.history.replaceState({}, "", url.toString());
    } catch {}
  }, [current?.file, album?.slug]);

  return (
    <div className="">
      {/* Main content: queue left, now playing right */}
      <div className="mx-auto max-w-4xl px-4">
        {/* Live region for screen readers */}
        <div
          ref={liveRef}
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        ></div>
        {/* Now Playing header row (compact) */}
        {album && current && (
          <NowPlaying
            album={album}
            item={{
              kind: current.kind,
              title: current.title,
              file: current.file,
              albumSlug: current.albumSlug,
            }}
            coverUrl={coverFallback || resolvedCoverUrl || null}
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
              aria-label="Video player"
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
            aria-label="Audio player"
          />
        )}

        {/* Removed pill album selector; album selection happens via clickable covers */}

        {/* Queue list (one column) */}
        {statusMsg ? (
          <div className="mb-2 text-xs text-white/80" aria-live="polite">
            {statusMsg}
          </div>
        ) : null}
        <QueueList
          items={queue as any}
          activeIndex={index}
          isPlaying={isPlaying}
          onSelect={(i) => {
            setIndex(i);
            if (!isPlaying) doPlay();
          }}
          onAddToPlaylist={
            selectedSlug !== "playlist" ? addToPlaylist : undefined
          }
          onRemoveFromPlaylist={
            selectedSlug === "playlist" ? removeFromPlaylist : undefined
          }
          onMoveUp={moveUpGeneric}
          onMoveDown={moveDownGeneric}
        />

        {/* Lyrics */}
        {lyrics ? (
          <div className="mt-6 mb-28 p-4 md:p-5 panel whitespace-pre-wrap break-words text-sm leading-relaxed">
            {lyrics}
          </div>
        ) : null}
      </div>

      {/* Bottom transport bar */}
      <div className="player-bar sticky bottom-0 left-0 right-0 bg-black/90 backdrop-blur supports-[backdrop-filter]:bg-black/70 safe-area-bottom">
        <div className="panel p-4 mx-auto max-w-6xl mt-6">
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
