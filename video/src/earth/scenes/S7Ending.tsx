import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { SpaceStage } from "../components/three/SpaceStage";
import { EarthGlobe } from "../components/three/EarthGlobe";
import { CameraRig, Starfield, SunSprite } from "../components/three/Space";
import { deg, easeInOut, lerp, project, seg } from "../components/three/cam";
import { Fade, Grade } from "../components/Look";
import { BEATS, SHOTS } from "../timeline";

const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Sunrise over Earth's limb, the planet spinning again, then a slow pull-back into black. */
export const S7Ending: React.FC = () => {
  const f = useCurrentFrame(); // 0..177  (global 1323-1500)
  const g = f + SHOTS.G1.from;
  const sunDir = new THREE.Vector3(-1, 0, 0);
  // Camera sits on a ray making angle beta with the Sun direction (seen from the Earth's centre).
  // The Sun is hidden while beta < alpha (Earth's angular radius from the camera) and rises over the limb as beta grows.
  const rise = easeInOut(seg(f, 4, 60));
  const pull = easeInOut(seg(f, 60, 150));
  const dist = lerp(1.6, 5.8, pull);
  const alpha = Math.asin(1 / dist);
  const beta = alpha + deg(lerp(-2.5, 3.5, rise)) + deg(lerp(0, 38, pull));
  const cam = new THREE.Vector3(dist * Math.cos(beta), dist * Math.sin(beta), 0.0001);
  const toCenter = cam.clone().multiplyScalar(-1).normalize();
  const w = 0.4 + 0.6 * pull;
  const look = toCenter.clone().multiplyScalar(w).add(sunDir.clone().multiplyScalar(1 - w)).normalize();
  const target = cam.clone().add(look);
  const sunPos = sunDir.clone().multiplyScalar(420);
  const spin = 2.0 + f * 0.0035; // rotating again: day follows night
  const { width: W, height: H } = useVideoConfig();
  const sunY = project(sunPos, cam, target, lerp(48, 36, pull), W, H).y;
  const blackAt = BEATS.black - SHOTS.G1.from;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Grade tint="#ffb070" tintOpacity={interpolate(f, [0, 80], [0.25, 0.08], cl)} vignette={0.6} grain={0.04} filter="contrast(1.06) saturate(1.1)">
        <SpaceStage>
          <CameraRig position={cam} target={target} fov={lerp(48, 36, pull)} />
          <Starfield brightness={lerp(0.25, 0.65, pull)} />
          <SunSprite position={sunPos} size={lerp(70, 40, pull)} intensity={lerp(0.6, 1.3, rise)} time={f / 30} />
          <EarthGlobe spin={spin} cloudSpin={spin + 0.01} sunDir={sunDir} time={f / 30} tiltDeg={23.44}
            look={{ sunI: 2.8, atmo: 1.05, mie: 1.1, nightStrength: 1.8 }} />
        </SpaceStage>
      </Grade>
      {/* anamorphic flare as the sun clears the limb */}
      <AbsoluteFill style={{ mixBlendMode: "screen", opacity: interpolate(f, [18, 34, 70, 110], [0, 0.85, 0.5, 0], cl) }}>
        <div style={{ position: "absolute", top: `${sunY}px`, left: "-10%", right: "-10%", height: 6, background: "linear-gradient(90deg, transparent, rgba(255,190,120,0.9), rgba(255,240,220,1), rgba(255,190,120,0.9), transparent)", filter: "blur(3px)" }} />
      </AbsoluteFill>
      <Fade from={blackAt - 12} to={blackAt} />
      {g >= BEATS.black && <AbsoluteFill style={{ background: "#000" }} />}
    </AbsoluteFill>
  );
};
