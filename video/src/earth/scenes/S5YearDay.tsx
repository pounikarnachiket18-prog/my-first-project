import React from "react";
import { AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { SpaceStage } from "../components/three/SpaceStage";
import { EarthGlobe, latLon } from "../components/three/EarthGlobe";
import { CameraRig, GlowRing, Starfield, SunSprite } from "../components/three/Space";
import { orbit, easeInOut, lerp, seg, project, deg } from "../components/three/cam";
import { Grade } from "../components/Look";
import { Callout, Tag } from "../components/Typography";
import { FONT } from "../fonts";

const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
// local frames (global 840-1110): E1 0-90, E2 90-270
const E2 = 90;
const ORBIT_R = 5.5;
const TH0 = deg(-8);
const ER = 1.2;
const MARK = { lat: 22, lon: 0 };

/** E1: the calm after the storm, a planet that no longer spins. */
const StillEarth: React.FC = () => {
  const f = useCurrentFrame();
  const cam = orbit(lerp(3.5, 3.0, easeInOut(f / 95)), lerp(20, 8, f / 95), lerp(12, 8, f / 95));
  return (
    <SpaceStage>
      <CameraRig position={cam} target={new THREE.Vector3(0, 0, 0)} fov={38} />
      <Starfield brightness={0.6} />
      <EarthGlobe spin={2.9} cloudSpin={2.9 + 0.02 + f * 0.0004} sunDir={new THREE.Vector3(-1, 0.25, 0.35)} time={f / 30}
        look={{ sunI: 2.5, atmo: 1.05, storm: interpolate(f, [0, 60], [0.5, 0], cl), saturation: 1.0 }} />
    </SpaceStage>
  );
};

export const orbitAngle = (l: number) => TH0 + Math.PI * easeInOut(seg(l, 10, 172)); // half an orbit = ~6 months

/** E2: Earth revolves around the Sun but keeps a fixed orientation (no rotation). */
const OrbitDiagram: React.FC = () => {
  const l = useCurrentFrame(); // 0..180
  const { width: W, height: H } = useVideoConfig();
  const th = orbitAngle(l);
  const ep = new THREE.Vector3(ORBIT_R * Math.cos(th), 0, ORBIT_R * Math.sin(th));
  const toSun = ep.clone().multiplyScalar(-1).normalize();
  const spin = Math.PI - TH0; // marker faces the Sun at the start, and the spin never changes
  // rolled 90 deg so the half-orbit runs top -> bottom in the vertical frame (screen-up = world +X)
  const cam = orbit(lerp(31, 29, easeInOut(l / 180)), lerp(-6, 6, easeInOut(l / 180)), lerp(36, 30, easeInOut(l / 180)));
  const target = new THREE.Vector3(-1.3, 0, 0);
  const fov = 40;
  const roll = Math.PI / 2;
  // marker world position and whether it is in daylight
  const mLocal = new THREE.Vector3(...latLon(MARK.lat, MARK.lon, 1.0));
  const mWorld = mLocal.clone().multiplyScalar(ER).applyAxisAngle(new THREE.Vector3(0, 1, 0), spin).add(ep);
  const nrm = mWorld.clone().sub(ep).normalize();
  const day = nrm.dot(toSun) > 0;
  const mp = project(mWorld, cam, target, fov, W, H, roll);
  const sp = project(new THREE.Vector3(-1.4, 0, 0), cam, target, fov, W, H, roll);
  const months = Math.min(6, Math.max(0, ((th - TH0) / Math.PI) * 6));
  return (
    <AbsoluteFill>
      <SpaceStage>
        <CameraRig position={cam} target={target} fov={fov} roll={roll} />
        <Starfield brightness={0.45} />
        <SunSprite position={new THREE.Vector3(0, 0, 0)} size={3.2} intensity={1.1} time={l / 30} />
        <mesh>
          <sphereGeometry args={[0.85, 48, 24]} />
          <meshBasicMaterial color={new THREE.Color(1.0, 0.86, 0.55)} toneMapped={false} />
        </mesh>
        <GlowRing radius={ORBIT_R} color="#9fb7d8" width={0.018} opacity={0.4} />
        <group rotation={[0, -TH0, 0]}>
          <GlowRing radius={ORBIT_R} progress={(th - TH0) / (Math.PI * 2)} color="#ffd36b" width={0.03} opacity={0.95} />
        </group>
        <EarthGlobe position={[ep.x, ep.y, ep.z]} radius={ER} spin={spin} tiltDeg={0} sunDir={toSun} time={l / 30}
          look={{ sunI: 2.6, atmo: 1.2, nightStrength: 1.0 }}>
          <mesh position={latLon(MARK.lat, MARK.lon, 1.01)}>
            <sphereGeometry args={[0.045, 16, 8]} />
            <meshBasicMaterial color={day ? "#ffe08a" : "#9fd8ff"} toneMapped={false} />
          </mesh>
        </EarthGlobe>
      </SpaceStage>
      {/* labels tracking the 3D objects */}
      <div style={{ position: "absolute", left: sp.x, top: sp.y - 16, transform: "translateX(-50%)", fontFamily: FONT.mono, fontWeight: 700, fontSize: 28, letterSpacing: 8, color: "#ffe2a0", textShadow: "0 0 12px #ff9f1a" }}>
        SUN
      </div>
      {!mp.behind && (
        <div style={{ position: "absolute", left: mp.x + 22, top: mp.y - 22, fontFamily: FONT.mono, fontWeight: 700, fontSize: 26, letterSpacing: 3,
          color: day ? "#ffe08a" : "#9fd8ff", textShadow: "0 2px 10px #000", opacity: interpolate(l, [6, 14], [0, 1], cl), whiteSpace: "nowrap" }}>
          ◀ TUM · {day ? "☀ DIN" : "☾ RAAT"}
        </div>
      )}
      <div style={{ position: "absolute", top: 1700, left: 0, right: 0, textAlign: "center", fontFamily: FONT.mono, fontWeight: 700, fontSize: 30, letterSpacing: 5, color: "#e8eef6", textShadow: "0 2px 10px #000", opacity: interpolate(l, [8, 16, 172, 180], [0, 1, 1, 0], cl) }}>
        ORBIT: {months.toFixed(1)} / 12 MAHINE · ROTATION: 0
      </div>
    </AbsoluteFill>
  );
};

/** "24 GHANTE" gets struck out, then "1 DIN = 1 SAAL" slams in. */
const DayEquation: React.FC<{ at24: number; strike: number; atYear: number; out: number }> = ({ at24, strike, atYear, out }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s24 = spring({ frame: f - at24, fps, config: { damping: 15 } });
  const st = interpolate(f, [strike, strike + 6], [0, 1], cl);
  const o24 = interpolate(f, [atYear - 4, atYear + 2], [1, 0], cl);
  return (
    <>
      {f >= at24 && f < atYear + 3 && (
        <div style={{ position: "absolute", top: 1450, left: 0, right: 0, textAlign: "center", opacity: s24 * o24 }}>
          <span style={{ position: "relative", fontFamily: FONT.title, fontSize: 104, color: "#fff", textShadow: "0 0 30px #0008" }}>
            1 DIN = 24 GHANTE
            <span style={{ position: "absolute", left: -10, right: -10, top: "52%", height: 12, background: "#ff4646", transform: `scaleX(${st}) rotate(-4deg)`, transformOrigin: "left", boxShadow: "0 0 20px #ff4646" }} />
          </span>
        </div>
      )}
      <Callout at={atYear} out={out} y={0.74} kicker="NON-ROTATING EARTH" title="1 DIN = 1 SAAL" sub="Ek din-raat ka chakkar = ek poora orbit" accent="#ffd36b" size={112} />
    </>
  );
};

export const S5YearDay: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Sequence from={0} durationInFrames={E2 + 6} layout="none">
        <Grade tint="#6a8cff" tintOpacity={0.1} vignette={0.55} filter={`contrast(1.05) brightness(${interpolate(f, [0, 12], [1.6, 1], cl)})`}>
          <StillEarth />
        </Grade>
      </Sequence>
      <Sequence from={E2} durationInFrames={270 - E2} layout="none">
        <AbsoluteFill style={{ opacity: interpolate(f, [E2, E2 + 6], [0, 1], cl) }}>
          <Grade tint="#ffcf80" tintOpacity={0.1} vignette={0.55} grain={0.04} filter="contrast(1.05)">
            <OrbitDiagram />
          </Grade>
        </AbsoluteFill>
      </Sequence>
      <DayEquation at24={100} strike={120} atYear={165} out={262} />
      <Tag text="ILLUSTRATIVE · NOT TO SCALE · AXIAL TILT IGNORED" at={E2 + 6} out={262} y={0.935} />
    </AbsoluteFill>
  );
};
