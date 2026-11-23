import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile } from "remotion";
import { Captions, Fade, FontGate } from "./Overlay";
import { CAPTIONS, S1Aerial, S2Plates, S3Ping, S4Dhaba, S5Phones, S6Fight, S7Map, S8LookAround } from "./Scenes";

export const SHOTS: { id: string; dur: number; C: React.FC<{ dur: number }> }[] = [
  { id: "aerial", dur: 150, C: S1Aerial },
  { id: "plates", dur: 120, C: S2Plates },
  { id: "ping", dur: 150, C: S3Ping },
  { id: "dhaba", dur: 180, C: S4Dhaba },
  { id: "phones", dur: 240, C: S5Phones },
  { id: "fight", dur: 180, C: S6Fight },
  { id: "map", dur: 180, C: S7Map },
  { id: "look", dur: 180, C: S8LookAround },
  { id: "end", dur: 90, C: ({ dur }) => <S1Aerial dur={dur} titleOnly /> },
];
export const REEL3D_FRAMES = SHOTS.reduce((n, s) => n + s.dur, 0);

export const Reel3D: React.FC = () => {
  let at = 0;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <FontGate>
        {SHOTS.map((s) => {
          const from = at;
          at += s.dur;
          return (
            <Sequence key={s.id} from={from} durationInFrames={s.dur} name={s.id}>
              <Fade dur={s.dur}>
                <s.C dur={s.dur} />
              </Fade>
            </Sequence>
          );
        })}
        <Captions phrases={CAPTIONS} />
      </FontGate>
      <Audio
        src={staticFile("indian-traffic.mp3")}
        volume={(f) => interpolate(f, [0, 10, REEL3D_FRAMES - 45, REEL3D_FRAMES], [0, 0.9, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
      />
    </AbsoluteFill>
  );
};
