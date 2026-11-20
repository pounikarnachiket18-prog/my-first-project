/** Clean single-subject stills (no overlays, no blur) to use as Google Flow "ingredients". */
import React from "react";
import * as THREE from "three";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { setTheme, TH } from "./theme";
import { useFontsReady } from "./three/fonts";
import { Cam, Lights, Room, trainLength, V3 } from "./three/Parts";
import { CardWall, R, StationSet, useScreen } from "./Reel";

type View = { pos: V3; target: V3; fov: number };
export const VIEWS: Record<string, View> = {
  "train-nose": { pos: [6.5, 2.2, 6.2], target: [-3, 2.3, -1.9], fov: 45 },
  "train-side": { pos: [-4, 2.3, 10.5], target: [-4, 2.3, -1.9], fov: 42 },
  loudspeaker: { pos: [1.6, 4.6, 4.6], target: [0, 5.4, 2.3], fov: 45 },
  "departure-board": { pos: [2.2, 4.0, 7.2], target: [3.6, 4.7, 3.0], fov: 40 },
  "station-platform": { pos: [2.5, 2.9, 7.4], target: [-12, 2.4, 3.2], fov: 52 },
  "tea-stall": { pos: [-4.6, 2.6, 7.4], target: [-10.6, 2.4, 4.35], fov: 50 },
  "book-stall": { pos: [12.5, 2.6, 8.2], target: [7.5, 2.3, 5.2], fov: 50 },
  "passengers": { pos: [-3.2, 2.2, 6.4], target: [-8.0, 1.8, 2.6], fov: 50 },
  "announcement-cabin": { pos: [-10.5, 2.9, 9.6], target: [-18.5, 3.0, 5.4], fov: 50 },
  "control-room": { pos: R([1.5, 1.65, 0.7]), target: R([0, 1.1, -1.45]), fov: 50 },
  "operator-screen": { pos: R([0, 1.34, -0.3]), target: R([0, 1.32, -1.62]), fov: 45 },
  "clip-library-screen": { pos: R([0, 1.34, -0.3]), target: R([0, 1.32, -1.62]), fov: 45 },
  "clip-cards": { pos: [0, 3.0, 7.2], target: [0, 3.0, 1.0], fov: 45 },
};

const Scene: React.FC<{ view: string }> = ({ view }) => {
  const v = VIEWS[view];
  const room = ["control-room", "operator-screen", "clip-library-screen"].includes(view);
  const tex = useScreen(view === "clip-library-screen" ? { mode: "media" } : { mode: "trains", sel: 0, typed: { no: "12846", pf: "3", time: "18:40" } });
  const tip = 0;
  return room ? (
    <>
      <Lights />
      <Room screen={tex} typing={3} />
      <Cam {...v} />
    </>
  ) : (
    <StationSet dist={0} speed={0} trainX={view === "train-nose" ? tip - trainLength() : view === "train-side" ? -60 : undefined} nose={view === "train-nose"}>
      {view === "clip-cards" && <CardWall f={200} appearStart={0} playStart={9999} />}
      <Cam {...v} />
    </StationSet>
  );
};

export const Ingredient: React.FC<{ view: string; theme?: string }> = ({ view, theme = "classic" }) => {
  setTheme(theme);
  const { width, height } = useVideoConfig();
  const ready = useFontsReady();
  return (
    <AbsoluteFill style={{ background: TH().bg }}>
      {ready && (
        <ThreeCanvas
          width={width}
          height={height}
          gl={{ antialias: true, preserveDrawingBuffer: true }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.NeutralToneMapping;
            gl.toneMappingExposure = 1.05;
          }}
        >
          <Scene view={view} />
        </ThreeCanvas>
      )}
    </AbsoluteFill>
  );
};
