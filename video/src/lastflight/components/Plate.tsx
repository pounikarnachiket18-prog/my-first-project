import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";

/**
 * Plays a Blender-rendered JPG sequence from public/lastflight/renders/<shot>/0000.jpg ...
 * The 540x960 renders are scaled to 1080x1920 here; a soft screened copy gives highlights a lens bloom.
 */
export const Plate: React.FC<{ shot: string; frames: number; offset?: number; bloom?: number; filter?: string; scale?: number }> = ({
  shot, frames, offset = 0, bloom = 0.25, filter = "", scale = 1,
}) => {
  const f = useCurrentFrame();
  const src = Math.max(0, Math.min(frames - 1, offset + f));
  const file = staticFile(`lastflight/renders/${shot}/${String(src).padStart(4, "0")}.jpg`);
  const img: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale})` };
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Img src={file} style={{ ...img, filter }} />
      {bloom > 0 && (
        <Img src={file} style={{ ...img, filter: `${filter} brightness(0.85) contrast(2.8) saturate(1.2) blur(26px)`, mixBlendMode: "screen", opacity: bloom }} />
      )}
    </AbsoluteFill>
  );
};
