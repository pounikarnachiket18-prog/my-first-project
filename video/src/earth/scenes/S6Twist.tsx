import React from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { SpaceStage } from "../components/three/SpaceStage";
import { EarthGlobe } from "../components/three/EarthGlobe";
import { CameraRig, Starfield } from "../components/three/Space";
import { orbit, easeInOut, lerp } from "../components/three/cam";
import { FrameSequence } from "../components/FrameSequence";
import { Grade, Shake } from "../components/Look";
import { Particles } from "../components/Particles";
import { Callout } from "../components/Typography";
import { DiagonalSplit } from "../components/Transitions";
import { FONT } from "../fonts";

const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
// local frames (global 1110-1323): F1 0-105, F2 105-165, F3 165-213
const F2 = 105, SPLIT0 = 156, SPLIT1 = 172, END = 213;

const HalfLit: React.FC = () => {
  const f = useCurrentFrame();
  const cam = orbit(lerp(6.4, 5.5, easeInOut(f / 110)), lerp(-14, 10, easeInOut(f / 110)), lerp(6, 10, f / 110));
  const sun = new THREE.Vector3(1, 0.08, -0.08);
  return (
    <SpaceStage>
      <CameraRig position={cam} target={new THREE.Vector3(0, 0, 0)} fov={38} />
      <Starfield brightness={0.7} />
      <EarthGlobe spin={1.6} sunDir={sun} time={f / 30} tiltDeg={0}
        look={{ sunI: 3.2, heat: 0.5, frost: 0.45, nightStrength: 0.15, cloudAmt: 0.5, atmo: 1.3, saturation: 1.0 }} />
    </SpaceStage>
  );
};

const SideLabel: React.FC<{ at: number; side: "day" | "night" }> = ({ at, side }) => {
  const f = useCurrentFrame();
  const { width } = useVideoConfig();
  const o = interpolate(f, [at, at + 8, F2 - 6, F2], [0, 1, 1, 0], cl);
  const s = interpolate(f, [at, at + 10], [0.85, 1], cl);
  const day = side === "day";
  return (
    <div style={{ position: "absolute", top: day ? 560 : 1000, [day ? "right" : "left"]: 60, width: width * 0.5, textAlign: day ? "right" : "left", opacity: o, transform: `scale(${s})`,
      transformOrigin: day ? "right" : "left" }}>
      <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 30, letterSpacing: 6, color: day ? "#ffb35a" : "#9fd8ff" }}>{day ? "☀ SUN-FACING SIDE" : "☾ FAR SIDE"}</div>
      <div style={{ fontFamily: FONT.title, fontSize: 104, lineHeight: 1, color: "#fff", textShadow: `0 0 34px ${day ? "#ff7a1a" : "#3aa8ff"}, 0 6px 20px #000` }}>
        6 MAHINE<br />{day ? "DIN" : "RAAT"}
      </div>
    </div>
  );
};

/** Heat shimmer: animated turbulence displacement over the scorched ground. */
const HeatHaze: React.FC<{ children: React.ReactNode; strength?: number }> = ({ children, strength = 9 }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter id="heat" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency={`0.004 ${0.028 + 0.002 * Math.sin(f * 0.3)}`} numOctaves={2} seed={Math.floor(f / 2)} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={strength} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <AbsoluteFill style={{ filter: "url(#heat)" }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

const Hot: React.FC = () => (
  <Grade tint="#ff8a2a" tintOpacity={0.45} shadows="#5a2008" shadowOpacity={0.25} vignette={0.6} filter="contrast(1.18) saturate(1.45) brightness(1.02) sepia(0.15)">
    <HeatHaze>
      <FrameSequence shot="F2" frames={64} bloom={0.55} />
    </HeatHaze>
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 38%, rgba(255,240,200,0.55), rgba(255,140,40,0.0) 42%)", mixBlendMode: "screen" }} />
    <Particles kind="embers" count={60} seed="heat" speed={0.6} opacity={0.6} />
  </Grade>
);

const Cold: React.FC = () => (
  <Grade tint="#3a7dff" tintOpacity={0.35} shadows="#020814" shadowOpacity={0.35} vignette={0.7} filter="contrast(1.2) saturate(1.1) brightness(0.95) hue-rotate(-6deg)">
    <FrameSequence shot="F3" frames={54} offset={-(SPLIT0 - F2) * 0.93} speed={0.93} bloom={0.3} />
    <Particles kind="snow" count={150} seed="frost" speed={1.0} opacity={0.85} />
  </Grade>
);

export const S6Twist: React.FC = () => {
  const f = useCurrentFrame();
  const split = interpolate(f, [SPLIT0, SPLIT1], [0, 1], cl);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Sequence from={0} durationInFrames={F2 + 4} layout="none">
        <Grade tint="#ffffff" tintOpacity={0.0} vignette={0.6} filter={`contrast(1.08) brightness(${interpolate(f, [F2 - 4, F2], [1, 1.8], cl)})`}>
          <HalfLit />
        </Grade>
        <SideLabel at={28} side="day" />
        <SideLabel at={74} side="night" />
      </Sequence>
      <Sequence from={F2} durationInFrames={END - F2} layout="none">
        <Shake amp={2} seed="land" speed={0.15} zoom={1.02}>
          {f < SPLIT0 ? <Hot /> : f >= SPLIT1 ? <Cold /> : <DiagonalSplit progress={split} seam="#ffffff" a={<Hot />} b={<Cold />} />}
        </Shake>
      </Sequence>
      <Callout at={F2 + 22} out={SPLIT0 - 2} y={0.13} kicker="DAY SIDE · MONTHS OF SUNLIGHT" title="EXTREME HEAT" accent="#ff9b3d" size={124} />
      <Callout at={SPLIT1 - 2} out={END - 4} y={0.13} kicker="NIGHT SIDE · MONTHS WITHOUT SUN" title="FREEZING DARKNESS" accent="#8fd8ff" size={108} />
    </AbsoluteFill>
  );
};
