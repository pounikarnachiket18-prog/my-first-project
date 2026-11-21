import React, { useMemo } from "react";
import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";
import { Stage } from "../three/Stage";
import { NightWorld } from "../three/Outdoor";
import { Locomotive } from "../three/Locomotive";
import { Chip, Speed, Vignette } from "../overlays";
import { COLOR, ramp } from "../theme";

export const S11_DURATION = 90;

/** Automatic emergency brake: sparks, speed falls 110 -> 35. */
export const S11Brake: React.FC = () => {
  const f = useCurrentFrame();
  const positions = useMemo(() => {
    const out = [0];
    for (let i = 1; i <= S11_DURATION; i++) out.push(out[i - 1] + (1.0 - 0.78 * ramp(i, 6, 86, 0, 1, Easing.out(Easing.quad))));
    return out;
  }, []);
  const z = positions[f] ?? 0;
  const sparks = ramp(f, 4, 10) * (1 - ramp(f, 76, 90) * 0.6);
  return (
    <AbsoluteFill>
      <Stage cam={{ position: [6.5, 1.6, z + 7], target: [0, 2.2, z - 6], fov: 56 }} fog={[50, 380]}>
        <NightWorld />
        <Locomotive z={z} distance={z} sparks={sparks} frame={f} />
      </Stage>
      <Vignette />
      <Chip from={4} top={240} size={58} color={COLOR.coral}>
        Emergency brake
      </Chip>
      <Speed value={ramp(f, 6, 84, 110, 35, Easing.out(Easing.quad))} top={390} from={0} />
    </AbsoluteFill>
  );
};
