import React from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import { FrameSequence } from "../components/FrameSequence";
import { Flash, Grade, Shake, impulse } from "../components/Look";
import { Particles } from "../components/Particles";
import { Callout } from "../components/Typography";
import { WhipBlur, whipEnv, ZoomPunch } from "../components/Transitions";
import { FONT } from "../fonts";

const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// local frames: C1 0-40, C2 40-150, C3 150-240  (global 360-600)
const C2 = 40;
const C3 = 150;

const EastArrow: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [at, at + 8, out - 8, out], [0, 1, 1, 0], cl);
  const slide = ((f - at) * 14) % 120;
  return (
    <div style={{ position: "absolute", top: 230, left: 0, right: 0, textAlign: "center", opacity: o, fontFamily: FONT.mono, fontWeight: 700, color: "#ffd9b0",
      fontSize: 30, letterSpacing: 6, textShadow: "0 2px 10px #000" }}>
      MOMENTUM → EAST
      <div style={{ height: 6, margin: "12px auto 0", width: 360, background: `repeating-linear-gradient(90deg, rgba(255,180,90,0.9) 0 40px, transparent 40px 60px)`,
        backgroundPosition: `${slide}px 0`, maskImage: "linear-gradient(90deg, transparent, #000 20%, #000 80%, transparent)" }} />
    </div>
  );
};

export const S3Inertia: React.FC = () => {
  const f = useCurrentFrame();
  // C2 is slow motion until ~local 102 (shot frame 62), then ramps to real time
  const ramp = interpolate(f, [C2 + 62, C2 + 82], [0.12, 1], cl);
  const impact = impulse(f, C2, 7) * 42 + impulse(f, C2, 26) * 10;
  const quake = f >= C2 ? 3 + 6 * ramp : 1.6;
  const shake = impact + quake + (f >= C3 ? 4 : 0);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <ZoomPunch at={0} half={4} maxScale={1.25}>
        <WhipBlur amount={whipEnv(f, C3, 4) * 50}>
          <Shake amp={shake} rot={shake * 0.04} speed={f >= C2 ? 0.6 : 0.18} seed="city" zoom={1.04}>
            {/* C1 — normal traffic, warm morning */}
            <Sequence from={0} durationInFrames={C2 + 1} layout="none">
              <Grade tint="#ffb070" tintOpacity={0.3} shadows="#203048" shadowOpacity={0.18} vignette={0.5} filter="contrast(1.12) saturate(1.15)">
                <FrameSequence shot="C1" frames={48} offset={4} bloom={0.45} />
              </Grade>
            </Sequence>
            {/* C2 — the stop */}
            <Sequence from={C2} durationInFrames={C3 - C2 + 1} layout="none">
              <Grade tint="#ff9a50" tintOpacity={0.22} shadows="#3a2a20" shadowOpacity={0.2} vignette={0.62} filter="contrast(1.16) saturate(1.05)">
                <FrameSequence shot="C2" frames={114} bloom={0.4} />
                <Particles kind="dust" count={18} seed="c2dust" speed={1.5 * ramp + 0.4} opacity={interpolate(f, [C2, C2 + 30], [0, 0.9], cl)} />
                <Particles kind="streaks" count={70} seed="c2s" speed={0.25 + 1.6 * ramp} opacity={interpolate(f, [C2, C2 + 8], [0, 0.85], cl)} />
              </Grade>
            </Sequence>
            {/* C3 — buildings shear, atmosphere keeps going */}
            <Sequence from={C3} durationInFrames={240 - C3} layout="none">
              <Grade tint="#d9a070" tintOpacity={0.2} shadows="#2a2230" shadowOpacity={0.3} vignette={0.6} filter="contrast(1.32) saturate(1.05) brightness(0.95)">
                <FrameSequence shot="C3" frames={94} bloom={0.2} />
                <Particles kind="dust" count={18} seed="c3dust" speed={0.9} opacity={interpolate(f, [C3, C3 + 60], [0.2, 0.5], cl)} color="#a58564" />
                <Particles kind="streaks" count={90} seed="c3s" speed={0.5} opacity={0.75} />
              </Grade>
            </Sequence>
          </Shake>
        </WhipBlur>
      </ZoomPunch>
      <Flash at={C2} color="#fff2e0" peak={0.85} decay={5} />
      <Flash at={C3} color="#ffffff" peak={0.25} decay={4} />
      <Callout at={C2 + 14} out={C2 + 84} y={0.13} kicker="NEWTON'S FIRST LAW" title="INERTIA" sub="Jo chal raha hai, woh chalta rahega" accent="#ff7a3d" size={120} />
      <EastArrow at={C3 + 6} out={238} />
      {/* slow-motion indicator */}
      <div style={{ position: "absolute", top: 70, right: 60, fontFamily: FONT.mono, fontWeight: 700, fontSize: 26, letterSpacing: 4, color: "#fff",
        opacity: interpolate(f, [C2 + 4, C2 + 8, C2 + 60, C2 + 66], [0, 0.85, 0.85, 0], cl) + interpolate(f, [C3 + 4, C3 + 8, 230, 236], [0, 0.85, 0.85, 0], cl),
        textShadow: "0 2px 8px #000" }}>
        ● SLOW MOTION
      </div>
    </AbsoluteFill>
  );
};
