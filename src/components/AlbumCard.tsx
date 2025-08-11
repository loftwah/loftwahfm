import React from "react";

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

export function AlbumCard({ album, onSelect }: { album: AlbumData; onSelect?: (slug: string) => void }) {
  return (
    <button className="panel w-full text-left overflow-hidden btn !p-0" onClick={() => onSelect?.(album.slug)}>
      <div className="aspect-square w-full bg-white/10">
        <img
          src={`/media/${album.slug}/${encodeURIComponent(album.cover)}`}
          alt={`${album.title} cover`}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">{album.title}</h3>
          <span className="text-xs text-white/60">{album.year}</span>
        </div>
        <p className="text-sm text-white/80">{album.artist}</p>
        <p className="text-xs text-white/60">{album.tracks.length} tracks{album.videos?.length ? ` · ${album.videos.length} videos` : ""}</p>
      </div>
    </button>
  );
}

export default AlbumCard;


