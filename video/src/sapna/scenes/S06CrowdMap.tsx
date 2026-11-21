import React, { useMemo } from "react";
import { AbsoluteFill, Easing, interpolate, random, useCurrentFrame } from "remotion";
import { evolvePath } from "@remotion/paths";
import { C, FONT } from "../theme";
import { Chip, Headline, PinIcon, TowerIcon, popStyle, usePop } from "../ui";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const COLORS = [C.stripe, C.pink, "#3B82F6", C.green, "#F97316", "#8B5CF6", "#14B8A6"];

const buildRoutes = () =>
  new Array(34).fill(0).map((_, i) => {
    const r = (k: string) => random(`route${i}${k}`);
    const sx = r("sx") * 1300 - 110;
    const ex = r("ex") * 1300 - 110;
    const vertical = r("v") > 0.45;
    const d = vertical
      ? `M ${sx} 2050 C ${sx + (r("a") - 0.5) * 900} 1400, ${ex + (r("b") - 0.5) * 900} 700, ${ex} -100`
      : `M -120 ${300 + r("sy") * 1500} C 300 ${r("c") * 1900}, 700 ${r("d") * 1900}, 1200 ${300 + r("ey") * 1500}`;
    return { d, color: COLORS[i % COLORS.length], delay: Math.floor(r("delay") * 70) };
  });

const CLUSTER = [
  [560, 1060],
  [480, 990],
  [640, 980],
  [520, 1150],
  [650, 1130],
];

/** Scene 6: lakhs of journeys teach the app which tower sits near which station. */
export const S06CrowdMap: React.FC = () => {
  const frame = useCurrentFrame();
  const routes = useMemo(buildRoutes, []);
  const zoom = interpolate(frame, [0, 90], [1.5, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const chip = usePop(110);
  const station = usePop(170);

  return (
    <AbsoluteFill style={{ background: C.map, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, scale: zoom }}>
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          {new Array(30).fill(0).map((_, i) => (
            <React.Fragment key={i}>
              <line x1={i * 80} y1={0} x2={i * 80} y2={1920} stroke="#E6DCC6" strokeWidth={2} />
              <line x1={0} y1={i * 80} x2={1080} y2={i * 80} stroke="#E6DCC6" strokeWidth={2} />
            </React.Fragment>
          ))}
          {routes.map((rt, i) => {
            const p = interpolate(frame, [rt.delay, rt.delay + 80], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
            const ev = evolvePath(p, rt.d);
            return (
              <path
                key={i}
                d={rt.d}
                stroke={rt.color}
                strokeWidth={7}
                fill="none"
                strokeLinecap="round"
                opacity={0.85}
                strokeDasharray={ev.strokeDasharray}
                strokeDashoffset={ev.strokeDashoffset}
              />
            );
          })}
        </svg>
        {CLUSTER.map(([x, y], i) => {
          const s = interpolate(frame, [150 + i * 6, 165 + i * 6], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2)) });
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x - 36,
                top: y - 36,
                width: 72,
                height: 72,
                borderRadius: 20,
                background: C.white,
                border: `4px solid ${C.ink}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                scale: s,
              }}
            >
              <TowerIcon size={48} />
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 300, top: 1240, display: "flex", alignItems: "center", gap: 10, ...popStyle(station) }}>
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
            boxShadow: "0 12px 30px rgba(19,35,58,0.25)",
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
