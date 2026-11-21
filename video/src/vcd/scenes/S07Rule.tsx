import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Stage } from "../three/Stage";
import { Cab, LP_SEAT, Pilot } from "../three/Cab";
import { Chip, TimerRing } from "../overlays";
import { COLOR, mix, ramp } from "../theme";

export const S07_DURATION = 180;
const RESETS = [92, 122, 152];
const DRAIN = 0.004;

/** Ring drains; every pilot action resets it. */
export const ringProgress = (f: number, start = 0.9) => {
  const last = [...RESETS].reverse().find((r) => f >= r);
  if (last === undefined) return start - f * DRAIN;
  const prevStart = RESETS.indexOf(last) === 0 ? start - last * DRAIN : 1 - (last - RESETS[RESETS.indexOf(last) - 1]) * DRAIN;
  return f < last + 8 ? ramp(f, last, last + 8, prevStart, 1) : 1 - (f - last - 8) * DRAIN;
};

export const S07Rule: React.FC = () => {
  const f = useCurrentFrame();
  const { width } = useVideoConfig();
  const t = ramp(f, 0, S07_DURATION);
  const lever = ramp(f, 84, 96) - ramp(f, 104, 116) * 0.5;
  const brake = ramp(f, 114, 126) - ramp(f, 134, 146);
  const reach = Math.max(ramp(f, 82, 92) - ramp(f, 100, 110), ramp(f, 112, 122) - ramp(f, 130, 140), ramp(f, 144, 152) - ramp(f, 160, 170));
  const press = ramp(f, 146, 152) - ramp(f, 156, 162);
  const ringX = width - 210;
  return (
    <AbsoluteFill>
      <Stage cam={{ position: mix([0.4, 2.15, 2.35], [0.3, 2.0, 2.0], t), target: [-0.15, 0.98, -1.3], fov: 64 }} background="#d9d6cf">
        <Cab lever={lever} brake={brake} press={press}>
          <Pilot position={LP_SEAT} reach={reach} />
        </Cab>
      </Stage>
      <TimerRing progress={ringProgress(f)} x={ringX} y={330} size={230} from={2} />
      {RESETS.map((r) => (
        <Chip key={r} from={r} to={r + 26} top={470} left={ringX} size={34} color={COLOR.mint} bg={COLOR.chipBgLight}>
          Reset
        </Chip>
      ))}
      <Chip from={22} to={90} top={240} left={380} size={52} color={COLOR.gold}>
        Har ~1 minute
      </Chip>
      <Chip from={50} to={90} top={390} left={380} size={46}>
        Koi action zaroori
      </Chip>
      <Chip from={90} to={120} top={240} left={380} size={56} color={COLOR.mint} bg={COLOR.chipBgLight}>
        Speed badalna
      </Chip>
      <Chip from={120} to={150} top={240} left={380} size={56} color={COLOR.mint} bg={COLOR.chipBgLight}>
        Brake chhoona
      </Chip>
      <Chip from={150} top={240} left={380} size={56} color={COLOR.mint} bg={COLOR.chipBgLight}>
        Horn bajana
      </Chip>
    </AbsoluteFill>
  );
};
