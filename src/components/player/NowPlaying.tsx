import React, { useMemo, useState } from "react";
import type { AlbumData } from "../AlbumCard";
import {
  Disc3,
  Link as LinkIcon,
  Copy as CopyIcon,
  Check as CheckIcon,
} from "lucide-react";

interface NowPlayingProps {
  album: AlbumData;
  item: {
    kind: "audio" | "video";
    title: string;
    file?: string;
    albumSlug?: string;
  };
  coverUrl: string | null;
}

export function NowPlaying({ album, item, coverUrl }: NowPlayingProps) {
  const [coverFallback, setCoverFallback] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const coverSrc =
    coverFallback ||
    coverUrl ||
    (album.slug === "all" ? "/all-songs.jpg" : "/fm-og.jpg");

  const shareUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("album", item?.albumSlug || album.slug);
    if (item?.file) params.set("file", item.file);
    return `?${params.toString()}`;
  }, [album.slug, item?.albumSlug, item?.file]);

  const copyLink = async () => {
    try {
      const absolute = typeof window !== "undefined" ? new URL(shareUrl, window.location.href).toString() : shareUrl;
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {}
  };

  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide opacity-70">
        <Disc3 size={16} strokeWidth={2.5} /> Now Playing
      </div>
      <div className="flex items-center gap-4">
        <div className="size-20 border border-white bg-black flex-shrink-0">
          <img
            src={coverSrc}
            alt={album.title}
            className="h-full w-full object-cover"
            onError={() =>
              setCoverFallback(
                album.slug === "all" ? "/all-songs.jpg" : "/fm-og.jpg",
              )
            }
          />
        </div>
        <div className="min-w-0">
          <div className="truncate text-lg font-semibold">{album.title}</div>
          <div className="truncate text-sm opacity-80">
            {item.title} · {album.artist}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <a
            href={shareUrl}
            className="btn text-xs inline-flex items-center gap-1"
            title="Open shareable link"
          >
            <LinkIcon size={14} /> Link
          </a>
          <button
            className="btn text-xs inline-flex items-center gap-1"
            onClick={copyLink}
            title="Copy link to clipboard"
          >
            {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}{" "}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default NowPlaying;
