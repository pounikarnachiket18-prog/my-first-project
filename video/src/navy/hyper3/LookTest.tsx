import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { GLView, GLState, Vec3 } from "./GLView";

const shots = (k: number): GLState => ({ exposure: 0.85, ...shots0(k) });
const shots0 = (k: number): GLState => {
  const t = 3.2;
  if (k === 0) {
    // hero close-up: hypersonic glide vehicle wrapped in plasma, skimming the sea
    return {
      t, cam: { pos: [0, 7, -24], target: [1, 7.5, 0], fov: 0.95 },
      m0: { on: true, nose: [8, 8, 0], dir: [1, 0, 0], len: 11, radius: 0.55, plasma: 1, glide: true, burn: 0, trail: { len: 160, width: 0.9, pink: true, opacity: 0.9 } },
    };
  }
  if (k === 1) {
    // supersonic cruise missile with vapour cone
    return {
      t, cam: { pos: [-4, 6, -20], target: [2, 7, 0], fov: 0.9 },
      m0: { on: true, nose: [7, 7.5, 0], dir: [1, 0, 0.0], len: 9, radius: 0.36, plasma: 0, glide: false, burn: 1, trail: { len: 120, width: 0.6, pink: false, opacity: 0.6 } },
      boom: { amt: 1, mach: 2.8, phase: 0.2 },
    };
  }
  if (k === 2) {
    // Tejas releases both
    const jet: Vec3 = [0, 60, 0];
    return {
      t, cam: { pos: [-18, 66, -24], target: [0, 59, 8], fov: 0.75 },
      jet: { pos: jet, dir: [0, 0, 1], scale: 1.0 },
      m0: { on: true, nose: [-4.5, 57.5, 22], dir: [0, 0, 1], len: 8, radius: 0.33, plasma: 0, glide: false, burn: 1, trail: { len: 30, width: 0.5, pink: false, opacity: 0.7 } },
      m1: { on: true, nose: [4.5, 57.8, 34], dir: [0, 0.03, 1], len: 7.5, radius: 0.4, plasma: 0.5, glide: true, burn: 1, trail: { len: 45, width: 0.6, pink: true, opacity: 0.9 } },
    };
  }
  // target ship under attack, wide
  return {
    t, cam: { pos: [-170, 22, -150], target: [0, 12, 0], fov: 0.55 },
    ship: { pos: [0, 0, 0], yaw: 0.6, damage: 0.4, fire: 1, sink: 0 },
    ex0: { pos: [0, 12, 10], age: 0.25, size: 1.2 },
    m1: { on: true, nose: [-60, 40, -90], dir: [0.55, -0.3, 0.75], len: 8, radius: 0.4, plasma: 1, glide: true, burn: 0, trail: { len: 140, width: 1.2, pink: true, opacity: 1 } },
  };
};

export const LookTest: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <GLView s={shots(f)} />
    </AbsoluteFill>
  );
};
