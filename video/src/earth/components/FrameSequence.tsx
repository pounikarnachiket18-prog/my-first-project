import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";

/**
 * Plays a Blender-rendered JPG sequence (public/earth/renders/<shot>/0000.jpg ...).
 * `offset` shifts the source frame, `speed` time-scales it, `hold` clamps to the last frame.
 * A soft "bloom" copy is screened on top so highlights glow like a real lens.
 */
export const FrameSequence: React.FC<{
  shot: string;
  frames: number;
  offset?: number;
  speed?: number;
  bloom?: number;
  filter?: string;
  scale?: number;
  style?: React.CSSProperties;
}> = ({ shot, frames, offset = 0, speed = 1, bloom = 0.35, filter = "", scale = 1, style }) => {
  const f = useCurrentFrame();
  const src = Math.max(0, Math.min(frames - 1, Math.round(offset + f * speed)));
  const file = staticFile(`earth/renders/${shot}/${String(src).padStart(4, "0")}.jpg`);
  const img: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale})` };
  return (
    <AbsoluteFill style={{ overflow: "hidden", ...style }}>
      <Img src={file} style={{ ...img, filter }} />
      {bloom > 0 && (
        <Img
          src={file}
          style={{ ...img, filter: `${filter} brightness(0.9) contrast(2.6) saturate(1.3) blur(28px)`, mixBlendMode: "screen", opacity: bloom }}
        />
      )}
    </AbsoluteFill>
  );
};
