import React from "react";
import { AbsoluteFill, interpolate, random, Sequence, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { SpaceStage } from "../components/three/SpaceStage";
import { EarthGlobe } from "../components/three/EarthGlobe";
import { CameraRig, Starfield } from "../components/three/Space";
import { orbit, easeInOut, lerp, seg } from "../components/three/cam";
import { FrameSequence } from "../components/FrameSequence";
import { Flash, Grade, Shake, impulse } from "../components/Look";
import { Particles } from "../components/Particles";
import { Tag } from "../components/Typography";
import { WhipBlur, whipEnv } from "../components/Transitions";

const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
// local frames (global 600-840)
const D2 = 68, D3 = 124, HIT = 164, D4 = 166, END = 240;

/** Storm lightning: random bright flickers inside clouds. */
const Lightning: React.FC<{ seed: string; rate?: number; strength?: number }> = ({ seed, rate = 0.08, strength = 0.6 }) => {
  const f = useCurrentFrame();
  const els = [];
  for (let k = -3; k <= 0; k++) {
    const g = f + k;
    if (random(`${seed}${g}`) < rate) {
      const o = (1 + k / 4) * strength;
      els.push(
        <AbsoluteFill key={k} style={{ background: `radial-gradient(circle at ${random(`${seed}x${g}`) * 100}% ${15 + random(`${seed}y${g}`) * 45}%, rgba(200,220,255,${o}) 0%, rgba(160,190,255,${o * 0.3}) 18%, transparent 45%)`, mixBlendMode: "screen" }} />,
      );
    }
  }
  return <>{els}</>;
};

/** Planet seen from orbit: the solid surface has stopped but the atmosphere races east. */
const StormPlanet: React.FC<{ local: number; wide: boolean }> = ({ local, wide }) => {
  const surf = 2.2; // stopped surface (fixed longitude in view)
  const cloud = surf + (wide ? 0.25 : 0) + local * (wide ? 0.004 : 0.012); // the air keeps moving east
  const sun = new THREE.Vector3(-0.7, 0.35, 0.6);
  const cam = wide
    ? orbit(lerp(2.6, 3.4, easeInOut(local / 74)), lerp(10, -4, local / 74), lerp(14, 8, local / 74))
    : orbit(1.32, lerp(-20, -10, local / 68), lerp(4, 6, local / 68));
  const target = wide ? new THREE.Vector3(0, 0, 0) : new THREE.Vector3(0.25, 0.86, 0);
  return (
    <SpaceStage>
      <CameraRig position={cam} target={target} fov={wide ? 40 : 52} roll={wide ? 0 : -0.15} />
      <Starfield brightness={0.4} />
      <EarthGlobe spin={surf} cloudSpin={cloud} sunDir={sun} time={local / 30 + (wide ? 3 : 0)}
        look={{ storm: 1, cloudAmt: wide ? 1.1 : 0.9, sunI: wide ? 2.3 : 1.6, exposure: wide ? 1 : 0.8, atmo: 1.25, saturation: 0.85, tint: [0.92, 0.95, 1.0] }} />
    </SpaceStage>
  );
};

export const S4Destruction: React.FC = () => {
  const f = useCurrentFrame();
  const shakeD = f >= D2 ? 6 + (f >= D3 ? interpolate(f, [D3, HIT], [4, 22], cl) : 0) : 2;
  const hit = impulse(f, HIT, 8) * 40;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <WhipBlur amount={whipEnv(f, D2, 4) * 60 + whipEnv(f, D3, 3) * 40}>
        <Shake amp={shakeD + hit} rot={(shakeD + hit) * 0.05} speed={0.45} seed="storm" zoom={1.03}>
          <Sequence from={0} durationInFrames={D2 + 1} layout="none">
            <Grade tint="#5b7fa8" tintOpacity={0.25} vignette={0.65} filter="contrast(1.12) saturate(0.85)">
              <StormPlanet local={f} wide={false} />
              <Lightning seed="d1" rate={0.12} strength={0.45} />
            </Grade>
          </Sequence>
          <Sequence from={D2} durationInFrames={D3 - D2 + 1} layout="none">
            <Grade tint="#4a6a80" tintOpacity={0.3} shadows="#0a1a24" shadowOpacity={0.25} vignette={0.7} filter="contrast(1.2) saturate(0.95) brightness(1.5)">
              <FrameSequence shot="D2" frames={66} offset={4} bloom={0.25} />
              <Particles kind="rain" count={170} seed="d2r" speed={1.2} dir={1} opacity={0.8} />
              <Lightning seed="d2" rate={0.06} strength={0.5} />
            </Grade>
          </Sequence>
          <Sequence from={D3} durationInFrames={D4 - D3 + 2} layout="none">
            <Grade tint="#4a6a80" tintOpacity={0.28} shadows="#0a1a24" shadowOpacity={0.25} vignette={0.7} filter="contrast(1.2) saturate(1.0) brightness(1.4)">
              <FrameSequence shot="D3" frames={50} bloom={0.3} />
              <Particles kind="rain" count={190} seed="d3r" speed={1.3} dir={1} opacity={0.85} />
              <Particles kind="streaks" count={40} seed="d3s" speed={1.2} color="#dfe8ee" opacity={interpolate(f, [D3 + 20, HIT], [0, 0.8], cl)} />
              <Lightning seed="d3" rate={0.05} strength={0.5} />
            </Grade>
          </Sequence>
          <Sequence from={D4} durationInFrames={END - D4} layout="none">
            <Grade tint="#7d8fa8" tintOpacity={0.22} vignette={0.65} filter="contrast(1.12) saturate(0.8)">
              <StormPlanet local={f - D4} wide />
              <Lightning seed="d4" rate={0.16} strength={0.35} />
            </Grade>
          </Sequence>
        </Shake>
      </WhipBlur>
      {/* water hits the lens: white-out */}
      <Flash at={HIT} color="#e8f2f6" peak={1} decay={7} />
      <Tag text="ATMOSPHERE KEEPS MOVING · SURFACE STOPPED" at={6} out={D2 - 6} y={0.1} />
      <Tag text="ILLUSTRATIVE SIMULATION" at={D4 + 8} out={END - 6} y={0.1} />
    </AbsoluteFill>
  );
};
