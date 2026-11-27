import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { SpaceStage } from "../components/three/SpaceStage";
import { EarthGlobe } from "../components/three/EarthGlobe";
import { CameraRig, Starfield } from "../components/three/Space";
import { orbit, easeOut, easeInOut, lerp, seg } from "../components/three/cam";
import { Flash, Grade, Shake, impulse } from "../components/Look";
import { TitleCard } from "../components/Typography";
import { FONT } from "../fonts";
import { BEATS } from "../timeline";

const W = (0.85 * Math.PI) / 180; // rad per frame: a visible, majestic spin

/** Earth's spin angle: normal rotation until FREEZE, then a violent stop. */
export const hookSpin = (f: number) => {
  const F = BEATS.freeze;
  if (f <= F) return W * f;
  const d = f - F;
  return W * F + W * 1.2 * (1 - Math.exp(-d / 1.2));
};
/** The atmosphere (clouds) does not stop: it keeps drifting east and only slowly decays. */
export const hookClouds = (f: number) => {
  const F = BEATS.freeze;
  if (f <= F) return W * f;
  const d = f - F;
  return W * F + W * 40 * (1 - Math.exp(-d / 40));
};

export const S1Hook: React.FC = () => {
  const f = useCurrentFrame();
  const t = easeOut(f / 92, 3.2);
  const dist = lerp(15, 3.9, t) - 0.25 * seg(f, 92, 150);
  const az = lerp(-28, -8, easeInOut(f / 150));
  const el = lerp(16, 9, easeInOut(f / 150));
  const cam = orbit(dist, az, el);
  const target = new THREE.Vector3(0, 0.05 * seg(f, 40, 150), 0);
  const sun = new THREE.Vector3(-0.95, 0.22, 0.42);
  const shake = impulse(f, BEATS.freeze, 9) * 26 + impulse(f, BEATS.freeze, 30) * 4;
  const stopped = f >= BEATS.freeze;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Shake amp={shake} rot={shake * 0.05} seed="hook">
        <Grade tint="#3a6cff" tintOpacity={0.14} vignette={0.6} grain={0.05} filter={`contrast(1.06) saturate(1.08) blur(${impulse(f, BEATS.freeze, 3) * 3}px)`}>
          <SpaceStage>
            <CameraRig position={cam} target={target} fov={38} roll={lerp(-0.1, 0, easeOut(f / 110))} />
            <Starfield brightness={0.6} />
            <EarthGlobe spin={hookSpin(f) - 1.2} cloudSpin={hookClouds(f) - 1.2} sunDir={sun} time={f / 30} look={{ sunI: 2.7, atmo: 1.1 }} />
          </SpaceStage>
        </Grade>
      </Shake>
      <Flash at={BEATS.freeze} color="#cfe6ff" peak={0.55} decay={5} />
      {/* rotation status HUD */}
      <div style={{ position: "absolute", top: 150, left: 0, right: 0, textAlign: "center", fontFamily: FONT.mono, fontWeight: 700, fontSize: 28, letterSpacing: 6,
        color: stopped ? "#ff5a4a" : "#9fd8ff", opacity: interpolate(f, [12, 24, 140, 150], [0, 0.9, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        textShadow: "0 2px 10px #000" }}>
        {stopped ? "■ ROTATION: STOPPED" : "● ROTATION: ON"}
      </div>
      <TitleCard at={BEATS.title} y={0.2} glow="#7fd4ff" lines={[{ text: "What if Earth", size: 118 }, { text: "stopped rotating?", size: 104, color: "#8fd8ff" }]} />
    </AbsoluteFill>
  );
};
