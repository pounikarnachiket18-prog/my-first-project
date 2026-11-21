import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT } from "../theme";
import { Headline, TrainGlyph, popStyle, usePop } from "../ui";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const STATIONS = [
  { n: "HOWRAH JN", t: "08:05", done: true },
  { n: "BANDEL JN", t: "08:47", done: true },
  { n: "MEMARI", t: "09:38", done: true },
  { n: "BARDHAMAN JN", t: "10:05", done: false },
];

export const PhoneStatusBar: React.FC<{ dataOff: number }> = ({ dataOff }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "22px 34px 10px",
      fontFamily: FONT,
      fontWeight: 700,
      fontSize: 24,
      color: C.ink,
    }}
  >
    <span>10:01</span>
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      {/* one bar of signal */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 22 }}>
        {[8, 12, 16, 20].map((h, i) => (
          <div key={i} style={{ width: 5, height: h, borderRadius: 2, background: i === 0 ? C.ink : "#CBD5E1" }} />
        ))}
      </div>
      {/* mobile data arrows with slash */}
      <svg width={30} height={26} viewBox="0 0 30 26">
        <path d="M9 22 V5 M4 10 L9 5 L14 10 M21 4 V21 M16 16 L21 21 L26 16" stroke={C.ink} strokeWidth={3} fill="none" strokeLinecap="round" />
        <line x1={3} y1={24} x2={27} y2={2} stroke={C.red} strokeWidth={3.5} strokeLinecap="round" opacity={dataOff} />
      </svg>
      <div style={{ width: 40, height: 20, borderRadius: 5, border: `2.5px solid ${C.ink}`, padding: 2 }}>
        <div style={{ width: "78%", height: "100%", background: C.ink, borderRadius: 2 }} />
      </div>
    </div>
  </div>
);

/** Scene 3: over-the-shoulder to Riya's phone. Data OFF, app still shows location. */
export const S03Phone: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 16, stiffness: 90 } });
  const toggle = interpolate(frame, [30, 42], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const ripple = (frame - 70) % 40;
  const q = usePop(118, 8);
  const marker = interpolate(frame, [0, 180], [0.7, 0.8]);
  const windowShift = (frame * 14) % 300;

  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #FFE9C7 0%, #FFF8EC 55%, #E7F4FF 100%)", overflow: "hidden" }}>
      {/* train window with passing fields */}
      <div
        style={{
          position: "absolute",
          left: 90,
          right: 90,
          top: 560,
          height: 640,
          borderRadius: 60,
          overflow: "hidden",
          border: `22px solid ${C.train}`,
          filter: "blur(5px)",
          opacity: 0.9,
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${C.skyTop}, ${C.skyLow} 55%, ${C.field} 55%)` }} />
        {new Array(8).fill(0).map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: 300 + (i % 3) * 30,
              left: i * 300 - windowShift - 300,
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: i % 2 ? C.tree : C.treeDark,
            }}
          />
        ))}
      </div>

      {/* phone */}
      <div
        style={{
          position: "absolute",
          left: 240,
          top: 640,
          width: 600,
          height: 1180,
          borderRadius: 72,
          background: "#0F172A",
          padding: 18,
          boxShadow: "0 40px 80px rgba(19,35,58,0.35)",
          rotate: `${interpolate(enter, [0, 1], [8, -3])}deg`,
          translate: `0px ${interpolate(enter, [0, 1], [500, 0]) + Math.sin(frame / 15) * 6}px`,
        }}
      >
        <div style={{ width: "100%", height: "100%", borderRadius: 56, background: "#F8FAFC", overflow: "hidden", fontFamily: FONT }}>
          <PhoneStatusBar dataOff={toggle} />
          {/* app header */}
          <div style={{ background: C.train, color: C.white, padding: "26px 34px", display: "flex", alignItems: "center", gap: 18 }}>
            <TrainGlyph size={54} />
            <div>
              <div style={{ fontSize: 36, fontWeight: 800 }}>Where is my Train</div>
              <div style={{ fontSize: 24, fontWeight: 600, opacity: 0.9 }}>12345 · Sapna Express</div>
            </div>
          </div>
          {/* live chip */}
          <div style={{ padding: "22px 34px 6px", display: "flex", alignItems: "center", gap: 10, fontSize: 22, fontWeight: 800, color: C.green, letterSpacing: 2 }}>
            <div style={{ width: 14, height: 14, borderRadius: 7, background: C.green, opacity: 0.5 + Math.sin(frame / 4) * 0.5 }} />
            LIVE STATUS
          </div>
          {/* timeline */}
          <div style={{ position: "relative", margin: "10px 34px", height: 520 }}>
            <div style={{ position: "absolute", left: 18, top: 20, bottom: 20, width: 6, background: "#CBD5E1", borderRadius: 3 }} />
            <div style={{ position: "absolute", left: 18, top: 20, height: `${marker * 100}%`, width: 6, background: C.train, borderRadius: 3 }} />
            {STATIONS.map((s, i) => (
              <div key={s.n} style={{ position: "absolute", top: 4 + i * 160, left: 0, right: 0, display: "flex", alignItems: "center", gap: 26 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    background: s.done ? C.train : C.white,
                    border: `5px solid ${s.done ? C.train : C.inkSoft}`,
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: s.done ? C.inkSoft : C.ink }}>{s.n}</div>
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, color: C.inkSoft }}>{s.t}</div>
              </div>
            ))}
            {/* live position marker */}
            <div style={{ position: "absolute", left: -10, top: `${marker * 100}%`, display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{ position: "relative", width: 62, height: 62 }}>
                {frame > 70 ? (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: 31,
                      border: `4px solid ${C.stripe}`,
                      scale: interpolate(ripple, [0, 40], [1, 2.4]),
                      opacity: interpolate(ripple, [0, 40], [1, 0]),
                    }}
                  />
                ) : null}
                <div style={{ position: "absolute", inset: 0, borderRadius: 31, background: C.stripe, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <TrainGlyph size={40} color={C.ink} />
                </div>
              </div>
              <div style={{ background: C.ink, color: C.white, padding: "10px 18px", borderRadius: 16, fontSize: 24, fontWeight: 700 }}>
                2 km pehle <span style={{ color: C.stripe }}>BARDHAMAN</span>
              </div>
            </div>
          </div>
          {/* mobile data toggle */}
          <div
            style={{
              margin: "10px 26px",
              padding: "22px 28px",
              borderRadius: 26,
              background: C.white,
              boxShadow: "0 6px 20px rgba(19,35,58,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 700, color: C.ink }}>Mobile Data</div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 26, fontWeight: 800, color: toggle > 0.5 ? C.red : C.green }}>{toggle > 0.5 ? "OFF" : "ON"}</span>
              <div
                style={{
                  width: 88,
                  height: 48,
                  borderRadius: 24,
                  background: interpolateColor(toggle),
                  position: "relative",
                }}
              >
                <div style={{ position: "absolute", top: 5, left: interpolate(toggle, [0, 1], [45, 5]), width: 38, height: 38, borderRadius: 19, background: C.white }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Headline
        lines={[
          ["Data", { t: "OFF...", c: C.pink }],
          ["phir", "bhi", { t: "location!", c: C.stripe }],
        ]}
        delay={20}
        top={200}
        size={96}
        stagger={6}
      />
      <div
        style={{
          position: "absolute",
          right: 60,
          top: 520,
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: 260,
          color: C.stripe,
          WebkitTextStroke: `18px ${C.ink}`,
          paintOrder: "stroke fill",
          rotate: `${Math.sin(frame / 6) * 8}deg`,
          ...popStyle(q),
        }}
      >
        ?
      </div>
    </AbsoluteFill>
  );
};

const interpolateColor = (t: number) => (t > 0.5 ? "#CBD5E1" : C.green);
