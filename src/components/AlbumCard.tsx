import React, { useState } from "react";
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
  const [imgSrc, setImgSrc] = useState(
    `/media/${album.slug}/${encodeURIComponent(album.cover)}`,
  );
  return (
    <button
      className="panel w-full text-left overflow-hidden !p-0 hover:bg-white/10"
      onClick={() => onSelect?.(album.slug)}
    >
      <div className="aspect-square w-full bg-black">
        <img
          src={imgSrc}
          onError={() => setImgSrc("/media/phantom-love/cover.jpg")}
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
            <Music2 size={12} /> {album.tracks.length}
          </span>
          {album.videos?.length ? (
            <span className="inline-flex items-center gap-1">
              <VideoIcon size={12} /> {album.videos.length}
            </span>
          ) : null}
        </p>
      </div>
    </button>
  );
}

export default AlbumCard;
