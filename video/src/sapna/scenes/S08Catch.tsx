import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, FONT } from "../theme";
import { CheckIcon, Headline, LockIcon, TrainGlyph, popStyle, usePop } from "../ui";

const card: React.CSSProperties = {
  position: "absolute",
  left: 90,
  right: 90,
  borderRadius: 44,
  padding: "40px 44px",
  fontFamily: FONT,
  boxShadow: "0 24px 60px rgba(19,35,58,0.18)",
};

/** Scene 8: the honest catch. Only works for the train you are on. */
export const S08Catch: React.FC = () => {
  const frame = useCurrentFrame();
  const c1 = usePop(35);
  const tick = usePop(70, 8);
  const c2 = usePop(110);
  const lock = usePop(140, 8);
  const shake = frame > 150 && frame < 175 ? Math.sin(frame * 2.2) * 10 : 0;

  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${C.sky}, ${C.skyLow} 60%, ${C.cream})` }}>
      <Headline
        lines={[
          ["Par", "sirf", "jab", "tum"],
          [{ t: "usi", c: C.stripe }, { t: "train", c: C.stripe }, "mein", "ho!"],
        ]}
        delay={4}
        top={190}
        size={92}
      />
      <div style={{ ...card, top: 560, background: C.white, border: `6px solid ${C.green}`, ...popStyle(c1) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 76, height: 76, borderRadius: 22, background: C.train, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrainGlyph size={52} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 40, fontWeight: 800, color: C.ink }}>12345 · Sapna Express</div>
            <div style={{ fontSize: 30, fontWeight: 600, color: C.inkSoft }}>Tum isi train mein ho</div>
          </div>
          <div style={popStyle(tick)}>
            <CheckIcon size={80} />
          </div>
        </div>
        <div style={{ marginTop: 28, padding: "18px 26px", borderRadius: 22, background: "#E8F9EF", fontSize: 34, fontWeight: 700, color: "#15803D" }}>
          Bina internet: 2 km pehle BARDHAMAN JN
        </div>
      </div>
      <div
        style={{
          ...card,
          top: 1040,
          background: "#F1F5F9",
          border: `6px solid #CBD5E1`,
          translate: `${shake}px 0px`,
          ...popStyle(c2),
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 76, height: 76, borderRadius: 22, background: "#94A3B8", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrainGlyph size={52} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 40, fontWeight: 800, color: C.inkSoft }}>Dusri train ka status?</div>
            <div style={{ fontSize: 30, fontWeight: 600, color: "#94A3B8" }}>Tum us train mein nahi ho</div>
          </div>
          <div style={{ ...popStyle(lock), rotate: `${interpolate(lock, [0, 1], [-30, 0])}deg` }}>
            <LockIcon size={84} />
          </div>
        </div>
        <div style={{ marginTop: 28, padding: "18px 26px", borderRadius: 22, background: "#FFE4E6", fontSize: 34, fontWeight: 700, color: "#BE123C" }}>
          Uske liye internet chahiye
        </div>
      </div>
    </AbsoluteFill>
  );
};
