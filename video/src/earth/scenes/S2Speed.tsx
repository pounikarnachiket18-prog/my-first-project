import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { SpaceStage } from "../components/three/SpaceStage";
import { EarthGlobe } from "../components/three/EarthGlobe";
import { CameraRig, GlowRing, Starfield } from "../components/three/Space";
import { orbit, easeInOut, lerp, seg, project, deg } from "../components/three/cam";
import { Grade } from "../components/Look";
import { Speedometer } from "../components/Speedometer";
import { Callout } from "../components/Typography";
import { WhipBlur, whipEnv } from "../components/Transitions";
import { FONT } from "../fonts";

const SPIN = (0.5 * Math.PI) / 180;
const TILT = 23.44;

/** Glowing arcs sweeping eastward around several latitudes: the "invisible speed". */
const SpeedArcs: React.FC<{ phase: number; opacity: number }> = ({ phase, opacity }) => {
  const arcs = useMemo(() => {
    const out: { lat: number; off: number; len: number }[] = [];
    [-45, -25, 0, 25, 45].forEach((lat, i) => {
      for (let k = 0; k < 5; k++) out.push({ lat, off: (k / 5) * Math.PI * 2 + i * 0.7, len: lat === 0 ? 0.55 : 0.35 });
    });
    return out;
  }, []);
  return (
    <group>
      {arcs.map((a, i) => {
        const r = Math.cos(deg(a.lat)) * 1.035;
        return (
          <group key={i} position={[0, Math.sin(deg(a.lat)) * 1.035, 0]} rotation={[0, a.off + phase * (a.lat === 0 ? 1 : Math.cos(deg(a.lat))), 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[r, a.lat === 0 ? 0.006 : 0.004, 6, 48, a.len]} />
              <meshBasicMaterial color={a.lat === 0 ? "#ffd36b" : "#8fd8ff"} transparent opacity={opacity * (a.lat === 0 ? 1 : 0.6)}
                blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

export const S2Speed: React.FC = () => {
  const f = useCurrentFrame(); // local: 0..210 (global 150..360)
  const { width: Wd, height: Ht } = useVideoConfig();
  const spin = SPIN * (f + 150) + 1.0;
  const sun = new THREE.Vector3(-0.9, 0.3, 0.55);
  const B2 = 120;
  const inB2 = f >= B2;
  // B1: orbit sweep; B2: low equatorial view
  const cam = inB2
    ? orbit(lerp(2.35, 2.15, easeInOut(seg(f, B2, 210))), lerp(-18, -8, seg(f, B2, 210)) + 30 * (1 - easeInOut(seg(f, B2, B2 + 10))), lerp(10, 6, seg(f, B2, 210)))
    : orbit(lerp(3.6, 3.0, easeInOut(f / B2)), lerp(55, -40, easeInOut(f / B2)), lerp(24, 12, easeInOut(f / B2)));
  const target = inB2 ? new THREE.Vector3(0.0, -0.32, 0) : new THREE.Vector3(0, 0, 0);
  const fov = inB2 ? 40 : 38;
  const whip = whipEnv(f, B2, 5) * 70;
  const arcs = interpolate(f, [40, 60, B2 - 4, B2 + 2], [0, 1, 1, 0.0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const eq = seg(f, B2 + 2, B2 + 30);
  // equator label position: a point on the equator facing the camera
  const tilt = deg(TILT);
  const eqPoint = new THREE.Vector3(Math.sin(deg(-14)) * 1.0, 0, Math.cos(deg(-14)) * 1.0).applyAxisAngle(new THREE.Vector3(0, 0, 1), -tilt);
  const lp = project(eqPoint, cam, target, fov, Wd, Ht);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <WhipBlur amount={whip}>
        <Grade tint={inB2 ? "#ffb347" : "#4a7dff"} tintOpacity={inB2 ? 0.12 : 0.12} vignette={0.6} grain={0.05} filter="contrast(1.05) saturate(1.1)">
          <SpaceStage>
            <CameraRig position={cam} target={target} fov={fov} />
            <Starfield brightness={0.55} />
            <EarthGlobe spin={spin} sunDir={sun} time={f / 30} tiltDeg={TILT} look={{ sunI: 2.7, atmo: 1.1 }}>
              <SpeedArcs phase={f * 0.06} opacity={arcs} />
            </EarthGlobe>
            <group rotation={[0, 0, -tilt]}>
              {inB2 && <GlowRing radius={1.004} progress={eq} color="#ffcf5a" width={0.004} opacity={1} />}
            </group>
          </SpaceStage>
        </Grade>
      </WhipBlur>
      {inB2 && !lp.behind && (
        <div style={{ position: "absolute", left: lp.x - 20, top: lp.y - 70, opacity: interpolate(f, [B2 + 14, B2 + 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          fontFamily: FONT.mono, fontWeight: 700, fontSize: 30, letterSpacing: 6, color: "#ffd36b", textShadow: "0 0 14px #ff9f1a, 0 2px 8px #000" }}>
          ◆ EQUATOR
        </div>
      )}
      <Speedometer at={B2 + 18} countFrom={150} countTo={178} y={0.075} out={206} />
      <Callout at={B2 + 58} out={206} y={0.43} kicker="EARTH'S CIRCUMFERENCE" title="40,075 KM ÷ 24 H" accent="#ffc24a" size={66} />
    </AbsoluteFill>
  );
};
