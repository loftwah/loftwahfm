import React, { useState } from "react";
import type { AlbumData } from "../AlbumCard";
import { Disc3 } from "lucide-react";

interface NowPlayingProps {
  album: AlbumData;
  item: { kind: "audio" | "video"; title: string };
  coverUrl: string | null;
}

export function NowPlaying({ album, item, coverUrl }: NowPlayingProps) {
  const [coverFallback, setCoverFallback] = useState<string | null>(null);
  const coverSrc =
    coverFallback ||
    coverUrl ||
    (album.slug === "all" ? "/all-songs.jpg" : "/fm-og.jpg");

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
      </div>
    </div>
  );
}

export default NowPlaying;
