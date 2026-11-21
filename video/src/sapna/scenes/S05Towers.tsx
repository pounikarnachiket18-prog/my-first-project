import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, SCENES } from "../theme";
import { Chip, Headline, TowerIcon, popStyle, usePop } from "../ui";
import { Countryside, Track, TrainOnPath, coachPose } from "../world";

export const MAP_TRACK = "M 560 2300 C 760 1700, 330 1300, 540 820 S 560 100, 640 -400";

const TOWERS = [
  { x: 300, y: 1600, id: "21465", c: C.stripe },
  { x: 820, y: 1160, id: "21470", c: C.pink },
  { x: 310, y: 740, id: "21481", c: "#3B82F6" },
];
const R = 330;

const headAt = (f: number) => 500 + f * 7.2;

const servingAt = (f: number) => {
  const p = coachPose(MAP_TRACK, headAt(f));
  let best = 0;
  let bd = Infinity;
  TOWERS.forEach((t, i) => {
    const d = Math.hypot(t.x - p.x, t.y - p.y);
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  return best;
};

/** Scene 5: every tower has an ID; the phone always knows which one it is on. */
export const S05Towers: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const switches = useMemo(() => {
    const s: number[] = [0];
    let last = servingAt(0);
    for (let f = 1; f < SCENES.towers; f++) {
      const cur = servingAt(f);
      if (cur !== last) {
        s.push(f);
        last = cur;
      }
    }
    return s;
  }, []);
  const serving = servingAt(frame);
  const lastSwitch = switches.filter((s) => s <= frame).pop() ?? 0;
  const flip = spring({ frame: frame - lastSwitch, fps, config: { damping: 12 } });
  const head = coachPose(MAP_TRACK, headAt(frame));
  const t = TOWERS[serving];
  const dataChip = usePop(40);
  const idChip = usePop(60);

  return (
    <AbsoluteFill style={{ background: C.map, overflow: "hidden" }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <g opacity={0.55}>
          <Countryside width={1080} height={1920} seed="towers" villages={[[880, 1650]]} />
        </g>
        <rect width={1080} height={1920} fill="rgba(255,248,236,0.35)" />
        {TOWERS.map((tw, i) => {
          const active = i === serving;
          const ring = ((frame + i * 15) % 45) / 45;
          return (
            <g key={tw.id}>
              <circle cx={tw.x} cy={tw.y} r={R} fill={tw.c} opacity={active ? 0.2 : 0.08} />
              <circle cx={tw.x} cy={tw.y} r={R} fill="none" stroke={tw.c} strokeWidth={active ? 8 : 5} strokeDasharray="18 14" />
              {active ? <circle cx={tw.x} cy={tw.y} r={60 + ring * 200} fill="none" stroke={tw.c} strokeWidth={5} opacity={1 - ring} /> : null}
            </g>
          );
        })}
        <Track d={MAP_TRACK} scale={0.8} />
        <line x1={head.x} y1={head.y} x2={t.x} y2={t.y} stroke={C.ink} strokeWidth={5} strokeDasharray="12 10" opacity={0.7} />
        <TrainOnPath d={MAP_TRACK} head={headAt(frame)} coaches={7} s={0.85} glow={false} />
      </svg>
      {TOWERS.map((tw, i) => (
        <div
          key={tw.id}
          style={{
            position: "absolute",
            left: tw.x - 45,
            top: tw.y - 80,
            width: 90,
            height: 90,
            borderRadius: 24,
            background: C.white,
            border: `5px solid ${tw.c}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 10px 24px rgba(19,35,58,0.2)",
            scale: i === serving ? 1.15 : 0.9,
          }}
        >
          <TowerIcon size={62} />
        </div>
      ))}

      <Headline
        lines={[
          ["Har", "tower", "ki", "ek"],
          [{ t: "ID", c: C.stripe }, "hoti", "hai!"],
        ]}
        delay={6}
        top={190}
        size={96}
      />
      <div style={{ position: "absolute", top: 450, width: "100%", display: "flex", justifyContent: "center", gap: 20 }}>
        <div style={popStyle(dataChip)}>
          <Chip color={C.red} size={34}>
            DATA OFF
          </Chip>
        </div>
        <div style={popStyle(dataChip)}>
          <Chip color={C.green} size={34}>
            SIGNAL ON
          </Chip>
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 330, right: 60, ...popStyle(idChip), transformOrigin: "right center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            padding: "18px 30px",
            borderRadius: 30,
            background: C.ink,
            border: `4px solid ${t.c}`,
            fontFamily: FONT,
            color: C.white,
            boxShadow: "0 16px 40px rgba(19,35,58,0.3)",
          }}
        >
          <TowerIcon size={54} color={t.c} />
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 3, opacity: 0.8 }}>SERVING TOWER</div>
            <div
              style={{
                fontSize: 54,
                fontWeight: 800,
                color: t.c,
                rotate: `x ${interpolate(flip, [0, 1], [90, 0])}deg`,
              }}
            >
              ID {t.id}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
