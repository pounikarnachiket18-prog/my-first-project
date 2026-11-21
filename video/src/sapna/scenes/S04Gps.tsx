import React from "react";
import * as THREE from "three";
import { AbsoluteFill, interpolate, interpolateColors, useCurrentFrame } from "remotion";
import { C, FONT } from "../theme";
import { BulbIcon, Chip, Headline, popStyle, usePop } from "../ui";
import { Satellite, World3D } from "../three/World3D";
import { poseAt, vehicleCenterS } from "../three/track";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const CAM_S = 1320;

/** Scene 4: low trackside shot, satellite beam locks on the train, battery drains. */
export const S04Gps: React.FC = () => {
  const frame = useCurrentFrame();
  const pct = Math.round(interpolate(frame, [40, 165], [100, 23], clamp));
  const fill = interpolateColors(pct, [23, 60, 100], [C.red, C.stripe, C.green]);
  const out = interpolate(frame, [170, 182], [1, 0], clamp);
  const bulb = usePop(180, 9);
  const chip = usePop(70);

  const head = CAM_S - 160 + frame * 0.9;
  const at = poseAt(CAM_S);
  const cam = {
    pos: at.p.clone().addScaledVector(at.side, 55).add(new THREE.Vector3(0, 3, 0)),
    look: at.p.clone().addScaledVector(at.fwd, -60).add(new THREE.Vector3(0, 85, 0)),
    fov: 62,
  };
  const trainMid = poseAt(vehicleCenterS(head, 3)).p.clone().add(new THREE.Vector3(0, 4.5, 0));
  const satPos = at.p.clone().addScaledVector(at.fwd, -220).addScaledVector(at.side, -90).add(new THREE.Vector3(0, 300, 0));
  const beam = (0.18 + Math.sin(frame / 3) * 0.06) * out;

  return (
    <AbsoluteFill>
      <World3D cam={cam} head={head} shadowFocus={at.p} shadowSize={120}>
        <Satellite pos={satPos} target={trainMid} beam={beam} />
      </World3D>
      <div style={{ position: "absolute", inset: 0, background: `rgba(8,16,30,${interpolate(frame, [165, 185], [0, 0.45], clamp)})` }} />

      <div style={{ opacity: out }}>
        <div style={{ position: "absolute", left: 270, top: 900, display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 480,
              height: 220,
              borderRadius: 40,
              border: `12px solid rgba(255,255,255,0.95)`,
              padding: 14,
              boxSizing: "border-box",
              background: "rgba(12,22,38,0.55)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div style={{ width: `${pct}%`, height: "100%", borderRadius: 20, background: fill, boxShadow: `0 0 30px ${fill}` }} />
          </div>
          <div style={{ width: 28, height: 90, borderRadius: "0 14px 14px 0", background: "rgba(255,255,255,0.95)" }} />
          <div
            style={{
              position: "absolute",
              inset: 0,
              right: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: FONT,
              fontWeight: 800,
              fontSize: 110,
              color: C.white,
              textShadow: "0 4px 20px rgba(0,0,0,0.6)",
            }}
          >
            {pct}%
          </div>
        </div>
        <div style={{ position: "absolute", top: 1170, width: "100%", display: "flex", justifyContent: "center" }}>
          <div style={popStyle(chip)}>
            <Chip color={C.red} size={38}>
              GPS ON = BATTERY DOWN
            </Chip>
          </div>
        </div>
      </div>

      <Headline
        lines={[
          ["GPS", "="],
          [
            { t: "battery", c: C.pink },
            { t: "khaata!", c: C.pink },
          ],
        ]}
        delay={6}
        top={190}
        size={104}
        exitAt={170}
      />
      <Headline
        lines={[
          ["Isliye..."],
          [
            { t: "smart", c: C.stripe },
            { t: "jugaad!", c: C.stripe },
          ],
        ]}
        delay={186}
        top={190}
        size={104}
      />
      <div style={{ position: "absolute", top: 820, width: "100%", display: "flex", justifyContent: "center", ...popStyle(bulb) }}>
        <div style={{ rotate: `${Math.sin(frame / 7) * 6}deg`, filter: "drop-shadow(0 0 40px rgba(255,201,60,0.7))" }}>
          <BulbIcon size={360} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
