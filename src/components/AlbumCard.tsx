import React, { useEffect, useState } from "react";
import {
  Link as LinkIcon,
  Copy as CopyIcon,
  Check as CheckIcon,
} from "lucide-react";
import { Music2, Video as VideoIcon } from "lucide-react";

export interface TrackItem {
  title: string;
  file: string;
  durationSec?: number;
}

export interface VideoItem {
  title: string;
  file: string;
  poster?: string;
}

export interface AlbumData {
  slug: string;
  title: string;
  artist: string;
  year: number;
  cover: string;
  backCover?: string;
  tracks: TrackItem[];
  videos?: VideoItem[];
  gallery?: string[];
}

export function AlbumCard({
  album,
  onSelect,
}: {
  album: AlbumData;
  onSelect?: (slug: string) => void;
}) {
  const initialSrc = album.cover?.startsWith("/")
    ? album.cover
    : album.slug === "all" || album.slug === "playlist"
      ? album.slug === "all"
        ? "/all-songs.jpg"
        : "/playlist.jpg"
      : `/media/${album.slug}/${encodeURIComponent(album.cover)}`;
  const [imgSrc, setImgSrc] = useState(initialSrc);
  const [playlistCounts, setPlaylistCounts] = useState<{
    tracks: number;
    videos: number;
  }>({ tracks: 0, videos: 0 });
  const [copied, setCopied] = useState(false);

  const albumHref = `?${new URLSearchParams({ album: album.slug }).toString()}`;

  const copyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const absolute =
        typeof window !== "undefined"
          ? new URL(albumHref, window.location.href).toString()
          : albumHref;
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {}
  };

  useEffect(() => {
    if (album.slug !== "playlist") return;
    const read = () => {
      try {
        const raw = localStorage.getItem("lfm.playlist");
        const items = raw ? (JSON.parse(raw).items as any[]) : [];
        const tracks = items.filter((i) => i && i.kind === "audio").length;
        const videos = items.filter((i) => i && i.kind === "video").length;
        setPlaylistCounts({ tracks, videos });
      } catch {
        setPlaylistCounts({ tracks: 0, videos: 0 });
      }
    };
    read();
    const onUpdate = () => read();
    window.addEventListener("lfm-playlist-updated", onUpdate as any);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("lfm-playlist-updated", onUpdate as any);
      window.removeEventListener("storage", onUpdate);
    };
  }, [album.slug]);
  return (
    <button
      className="panel w-full text-left overflow-hidden !p-0 hover:bg-white/10"
      onClick={() => {
        // Allow parent islands to hook directly
        onSelect?.(album.slug);
        try {
          // Notify the Player island to switch albums
          window.dispatchEvent(
            new CustomEvent<string>("album-select", { detail: album.slug }),
          );
          // Keep URL shareable and jump to the player
          const url = new URL(window.location.href);
          url.searchParams.set("album", album.slug);
          window.history.pushState({}, "", url.toString());
          const playerEl = document.getElementById("player");
          if (playerEl)
            playerEl.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch {}
      }}
    >
      <div className="aspect-square w-full bg-black">
        <img
          src={imgSrc}
          onError={() =>
            setImgSrc(
              album.slug === "all"
                ? "/all-songs.jpg"
                : album.slug === "playlist"
                  ? "/playlist.jpg"
                  : "/fm-og.jpg",
            )
          }
          alt={`${album.title} cover`}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">{album.title}</h3>
          <span className="text-xs text-white/60">{album.year}</span>
        </div>
        <p className="text-sm text-white/80">{album.artist || "Loftwah"}</p>
        <p className="text-xs text-white/60 flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <Music2 size={12} />
            {album.slug === "playlist"
              ? playlistCounts.tracks
              : (album.tracks?.length ?? 0)}
          </span>
          {(
            album.slug === "playlist"
              ? playlistCounts.videos
              : album.videos?.length || 0
          ) ? (
            <span className="inline-flex items-center gap-1">
              <VideoIcon size={12} />
              {album.slug === "playlist"
                ? playlistCounts.videos
                : (album.videos?.length ?? 0)}
            </span>
          ) : null}
        </p>
        {album.slug !== "playlist" ? (
          <div className="mt-2 flex items-center gap-2">
            <a
              href={albumHref}
              onClick={(e) => e.stopPropagation()}
              className="btn text-xs inline-flex items-center gap-1"
              title="Open shareable link"
            >
              <LinkIcon size={14} /> Link
            </a>
            <button
              className="btn text-xs inline-flex items-center gap-1"
              onClick={copyLink}
              title="Copy album link"
            >
              {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}{" "}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        ) : null}
      </div>
    </button>
  );
}

export default AlbumCard;
