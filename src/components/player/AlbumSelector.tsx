import React from "react";
import type { AlbumData } from "../AlbumCard";

interface AlbumSelectorProps {
  albums: AlbumData[];
  selectedSlug?: string;
  onSelect: (slug: string) => void;
}

export function AlbumSelector({
  albums,
  selectedSlug,
  onSelect,
}: AlbumSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2 pb-4">
      {albums.map((a) => (
        <button
          key={a.slug}
          className={`pill ${a.slug === selectedSlug ? "pill-active" : ""}`}
          onClick={() => onSelect(a.slug)}
        >
          {a.title}
        </button>
      ))}
    </div>
  );
}

export default AlbumSelector;
