import React from "react";
import { Volume2 } from "lucide-react";

interface VolumeControlProps {
  volume: number;
  onChange: (v: number) => void;
}

export function VolumeControl({ volume, onChange }: VolumeControlProps) {
  return (
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
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Volume"
      />
    </div>
  );
}

export default VolumeControl;
