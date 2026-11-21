import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Stage } from "../three/Stage";
import { Cab, LP_SEAT, Pilot } from "../three/Cab";
import { Chip } from "../overlays";
import { COLOR, ramp } from "../theme";

export const S13_DURATION = 60;

/** "Insaan so sakta hai — system nahi!" */
export const S13Human: React.FC = () => {
  const f = useCurrentFrame();
  const on = ramp(f, 26, 34);
  return (
    <AbsoluteFill>
      <Stage cam={{ position: [0.6, 1.75, 0.2], target: [-0.25, 0.98, -1.35], fov: ramp(f, 0, 60, 56, 50) }} background="#d9d6cf">
        <Cab lamp={on * (0.8 + 0.2 * Math.sin(f / 3))} lampColor="#8dffbf" lightLevel={1 - on * 0.25}>
          <Pilot position={LP_SEAT} nod={1} slump={0.85} eyeOpen={0.05} />
        </Cab>
      </Stage>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 70% 50% at 50% 55%, rgba(120,255,180,0.22), transparent 70%)", opacity: on }} />
      <Chip from={4} top={240} size={54}>
        Insaan so sakta hai
      </Chip>
      <Chip from={28} top={370} size={76} color={COLOR.mint} bg={COLOR.chipBgLight}>
        System nahi!
      </Chip>
    </AbsoluteFill>
  );
};
