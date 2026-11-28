import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

/**
 * Designed transitions at every cut. A transition at global frame `at` with half-width `h` drives both shots:
 *   whip / whipV : outgoing shot slides out with directional motion blur, incoming slides in from the other side
 *   zoom         : push-through: outgoing punches in and blurs, incoming settles from 1.3x
 *   dissolve     : cross-dissolve over [at - h, at + h]
 *   leak         : cross-dissolve under a warm light leak
 *   cut          : straight cut (the flash / shake around it is drawn elsewhere)
 */
export type CutKind = "whip" | "whipL" | "whipV" | "whipVD" | "zoom" | "dissolve" | "leak" | "cut";
export type Cut = { at: number; kind: CutKind; h: number };

const ease = (x: number) => x * x * (3 - 2 * x);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
let uid = 0;

/** How far before/after its nominal range a shot must stay on screen for a given cut. */
export const overlap = (c?: Cut) => (!c ? 0 : c.kind === "dissolve" || c.kind === "leak" ? c.h : 2);

/** Wraps one shot. f is the GLOBAL frame; cin/cout are the transitions at its head and tail. */
export const CutLayer: React.FC<{ f: number; cin?: Cut; cout?: Cut; width: number; height: number; children: React.ReactNode }> = ({
  f, cin, cout, width, height, children,
}) => {
  const id = React.useMemo(() => `cut${uid++}`, []);
  let tx = 0, ty = 0, sc = 1, blurX = 0, blurY = 0, blur = 0, bright = 1, op = 1;
  const motion = (c: Cut, p: number, outgoing: boolean) => {
    // p: 0 = far from the cut, 1 = at the cut
    const e = ease(p);
    const sign = outgoing ? -1 : 1;
    switch (c.kind) {
      case "whip": tx += sign * e * width * 0.55; blurX += e * 90; break;
      case "whipL": tx -= sign * e * width * 0.55; blurX += e * 90; break;
      case "whipV": ty -= sign * e * height * 0.45; blurY += e * 90; break;
      case "whipVD": ty += sign * e * height * 0.45; blurY += e * 90; break;
      case "zoom": sc *= outgoing ? 1 + 0.55 * e * e : 1 + 0.3 * e; blur += e * 14; bright *= 1 + 0.5 * e; break;
      default: break;
    }
  };
  if (cin) {
    if (cin.kind === "dissolve" || cin.kind === "leak") op *= interpolate(f, [cin.at - cin.h, cin.at + cin.h], [0, 1], clamp);
    else {
      op *= interpolate(f, [cin.at - 1, cin.at], [0, 1], clamp);
      if (f >= cin.at - 1 && f < cin.at + cin.h) motion(cin, 1 - Math.max(0, f - cin.at) / cin.h, false);
    }
  }
  if (cout && cout.kind !== "dissolve" && cout.kind !== "leak" && cout.kind !== "cut" && f > cout.at - cout.h && f <= cout.at + 1) {
    motion(cout, Math.min(1, (f - (cout.at - cout.h)) / cout.h), true);
  }
  if (op <= 0.001) return null;
  const dir = blurX > 0.5 || blurY > 0.5;
  return (
    <AbsoluteFill style={{ opacity: op }}>
      {dir && (
        <svg width="0" height="0" style={{ position: "absolute" }}>
          <filter id={id} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation={`${blurX} ${blurY}`} />
          </filter>
        </svg>
      )}
      <AbsoluteFill
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${sc})`,
          filter: `${dir ? `url(#${id})` : ""} ${blur > 0.3 ? `blur(${blur}px)` : ""} ${bright !== 1 ? `brightness(${bright})` : ""}`.trim() || undefined,
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Warm light leak + soft white bloom over leak / zoom cuts. */
export const CutLight: React.FC<{ cuts: Cut[] }> = ({ cuts }) => {
  const f = useCurrentFrame();
  return (
    <>
      {cuts.map((c, i) => {
        const d = Math.abs(f - c.at);
        if (c.kind === "leak" && d < c.h + 4) {
          const a = interpolate(d, [0, c.h + 4], [0.85, 0], clamp);
          const x = interpolate(f, [c.at - c.h - 4, c.at + c.h + 4], [-20, 120], clamp);
          return (
            <AbsoluteFill key={i} style={{ mixBlendMode: "screen", opacity: a,
              background: `radial-gradient(ellipse 60% 80% at ${x}% 40%, rgba(255,190,110,0.95), rgba(255,120,40,0.45) 40%, rgba(0,0,0,0) 75%)` }} />
          );
        }
        if ((c.kind === "zoom" || c.kind.startsWith("whip")) && d < 3) {
          const a = interpolate(d, [0, 3], [c.kind === "zoom" ? 0.55 : 0.3, 0], clamp);
          return <AbsoluteFill key={i} style={{ background: "#fff7ea", opacity: a, mixBlendMode: "screen" }} />;
        }
        return null;
      })}
    </>
  );
};
