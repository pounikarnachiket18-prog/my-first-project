import React from "react";
import * as THREE from "three";
import { AbsoluteFill, Easing, interpolate, random, useCurrentFrame } from "remotion";
import { C, FONT } from "../theme";
import { Chip, Headline, PinIcon, popStyle, usePop } from "../ui";
import { Routes, Tower, TrackGlow, World3D } from "../three/World3D";
import { STATION, project } from "../three/track";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ST = new THREE.Vector3(STATION.x, 0, (STATION.zStart + STATION.zEnd) / 2);
const CLUSTER = new Array(6).fill(0).map((_, i) => {
  const a = (i / 6) * Math.PI * 2 + 0.4;
  const r = 70 + random(`cl${i}`) * 60;
  return new THREE.Vector3(ST.x + Math.cos(a) * r, 0, ST.z + Math.sin(a) * r);
});

/** Scene 6: drone climbs high; lakhs of journeys light up into one tower map. */
export const S06CrowdMap: React.FC = () => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, 120], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const t2 = interpolate(frame, [150, 230], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const wide = new THREE.Vector3(-250, 3300, 900);
  const wideLook = new THREE.Vector3(-350, 0, -250);
  const close = new THREE.Vector3(ST.x - 420, 700, ST.z + 520);
  const pos = new THREE.Vector3().lerpVectors(new THREE.Vector3(-300, 900, 600), wide, t).lerp(close, t2);
  const look = new THREE.Vector3().lerpVectors(new THREE.Vector3(-300, 0, 0), wideLook, t).lerp(ST, t2);
  const cam = { pos, look, fov: 50 };
  const chip = usePop(110);
  const station = usePop(185);
  const sp = project(cam, ST.clone().add(new THREE.Vector3(0, 40, 0)), 1080, 1920);

  return (
    <AbsoluteFill>
      <World3D cam={cam} head={STATION.sStart - 900} coaches={8} shadowFocus={look} shadowSize={900} fogFar={9000}>
        <Routes progress={(i) => interpolate(frame, [10 + (i % 12) * 6, 90 + (i % 12) * 6], [0, 1], clamp)} count={42} />
        <TrackGlow progress={interpolate(frame, [20, 110], [0, 1], clamp)} />
        {CLUSTER.map((p, i) => {
          const s = interpolate(frame, [160 + i * 6, 178 + i * 6], [0.001, 1], { ...clamp, easing: Easing.out(Easing.back(2)) });
          return (
            <group key={i} scale={[1, s, 1]}>
              <Tower pos={p} scale={3} active />
            </group>
          );
        })}
      </World3D>
      <div style={{ position: "absolute", left: sp.x - 40, top: sp.y - 150, display: "flex", alignItems: "center", gap: 10, ...popStyle(station) }}>
        <PinIcon size={80} />
        <div
          style={{
            padding: "14px 26px",
            borderRadius: 18,
            background: C.stripe,
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 40,
            color: C.ink,
            boxShadow: "0 12px 30px rgba(0,0,0,0.3)",
          }}
        >
          BARDHAMAN JN
        </div>
      </div>
      <Headline
        lines={[
          ["Users", "ke", { t: "safar", c: C.stripe }, "se..."],
          ["poore", "India", "ka", { t: "map!", c: C.stripe }],
        ]}
        delay={8}
        top={190}
        size={88}
      />
      <div style={{ position: "absolute", top: 440, width: "100%", display: "flex", justifyContent: "center", ...popStyle(chip) }}>
        <Chip color={C.green} size={36}>
          Lakhs of safar · crowd data
        </Chip>
      </div>
    </AbsoluteFill>
  );
};
