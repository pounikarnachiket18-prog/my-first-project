import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import T from "../timeline.json";
import { C, F } from "../tokens";
import { Hi, LedBoard, NightBg, PopLine, Speaker, usePop } from "../ui";
import { Track, Train, trainWidth } from "../Train";

const S = T.hook;
const SCALE = 0.55;
const COACHES = 5;
const RAIL_Y = 1330;

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const W = trainWidth(COACHES) * SCALE;
  const endX = 1050 - W;
  const startX = -W - 300;
  // decelerating arrival
  const t = interpolate(frame, S.trainIn, [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const eased = 1 - Math.pow(1 - t, 3);
  const x = startX + (endX - startX) * eased;
  const speed = (endX - startX) * 3 * Math.pow(1 - t, 2) / (S.trainIn[1] - S.trainIn[0]);

  const board = usePop(6);
  const q = usePop(S.words[0] - 14);

  return (
    <AbsoluteFill>
      <NightBg />
      <Track y={RAIL_Y} wireY={RAIL_Y - 230} />
      {/* speed lines while train is fast */}
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {new Array(12).fill(0).map((_, i) => {
          const yy = RAIL_Y - 190 + (i * 37) % 180;
          const len = Math.min(300, speed * 6);
          const xx = ((i * 211 + frame * 40) % 1400) - 200;
          return <line key={i} x1={xx} y1={yy} x2={xx - len} y2={yy} stroke="#ffffff" strokeOpacity={0.25} strokeWidth={3} strokeLinecap="round" />;
        })}
      </svg>
      <Train coaches={COACHES} distance={x - startX} x={x} y={RAIL_Y} scale={SCALE} />
      {/* foreground platform gradient over wheels */}
      <Speaker x={40} y={430} scale={0.75} ringsFrom={S.chime} ringsUntil={70} />

      {/* LED board */}
      <div style={{ position: "absolute", top: 330, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: board, transform: `translateY(${(1 - board) * -40}px)` }}>
        <LedBoard width={940} height={130}>
          <span style={{ fontFamily: F.deva, fontSize: 64, fontWeight: 700 }}>यात्रीगण कृपया ध्यान दें…</span>
        </LedBoard>
      </div>

      {/* Hook question */}
      <div style={{ position: "absolute", top: 650, left: 60, right: 60, opacity: q }}>
        <PopLine start={S.words[0] - 14} size={64} font={F.sans} weight={700} color={C.muted}>
          Ever noticed why Indian train announcements sound…
        </PopLine>
        <div style={{ display: "flex", justifyContent: "center", gap: 34, marginTop: 30 }}>
          {["like…", "this…", "?"].map((w, i) => (
            <PopLine key={i} start={S.words[i]} size={150} from="scale">
              <Hi c={i === 2 ? C.red : C.yellow}>{w}</Hi>
            </PopLine>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
