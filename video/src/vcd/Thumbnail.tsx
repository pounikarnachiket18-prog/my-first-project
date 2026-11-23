import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { brand, display, fontCss, sans } from "./theme";

/** Reel cover (1080x1920). Key content kept inside the centre 4:5 area (y 285-1635) for the profile grid. */
export const Thumbnail: React.FC = () => (
  <AbsoluteFill style={{ background: "#07050c" }}>
    <style>{fontCss}</style>
    {/* scene: horn blows, uncles panic, Rajdhani headlight */}
    <Img src={staticFile("vcd/thumb/bg_1192.png")} style={{ position: "absolute", left: -54, top: -30, width: 1188, height: 2112 }} />
    {/* darken the top for the headline + vignette */}
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(7,5,12,1) 0%, rgba(7,5,12,0.99) 36%, rgba(7,5,12,0.25) 45%, rgba(7,5,12,0) 60%, rgba(7,5,12,0.55) 100%)" }} />
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)" }} />

    {/* headline */}
    <div style={{ position: "absolute", left: 64, top: 300, lineHeight: 0.86 }}>
      <div
        style={{
          display: "inline-block",
          fontFamily: sans,
          fontWeight: 900,
          fontSize: 40,
          letterSpacing: 6,
          color: brand.ink,
          background: brand.cyan,
          padding: "8px 18px 6px",
          borderRadius: 10,
          boxShadow: `0 0 24px ${brand.cyan}`,
        }}
      >
        LOCO PILOT
      </div>
      <div style={{ fontFamily: display, fontSize: 250, color: "#fff", letterSpacing: 4, marginTop: 18, textShadow: `0 0 30px ${brand.magenta}, 0 8px 0 #000` }}>SO GAYA</div>
      <div style={{ fontFamily: display, fontSize: 220, color: brand.magenta, letterSpacing: 4, textShadow: `0 0 34px ${brand.magenta}, 0 8px 0 #000`, WebkitTextStroke: "3px #fff" }}>TOH?!</div>
    </div>

    {/* sleepy ABHI inset */}
    <div
      style={{
        position: "absolute",
        left: 702,
        top: 330,
        width: 340,
        height: 340,
        borderRadius: "50%",
        overflow: "hidden",
        border: `8px solid ${brand.lime}`,
        boxShadow: `0 0 40px ${brand.lime}, 0 12px 30px rgba(0,0,0,0.7)`,
        transform: "rotate(-6deg)",
      }}
    >
      <Img src={staticFile("vcd/thumb/sleep_700.png")} style={{ position: "absolute", left: -281, top: -455, width: 756, height: 1344 }} />
    </div>
    <div style={{ position: "absolute", left: 930, top: 300, fontFamily: display, fontSize: 96, color: "#fff", textShadow: `0 0 20px ${brand.cyan}`, transform: "rotate(-12deg)" }}>Zz</div>

    {/* topic pill + channel */}
    <div style={{ position: "absolute", left: 0, right: 0, top: 1772, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div
        style={{
          fontFamily: display,
          fontSize: 58,
          letterSpacing: 4,
          color: "#fff",
          padding: "12px 34px 8px",
          borderRadius: 999,
          background: "linear-gradient(90deg, rgba(255,46,147,0.95), rgba(124,40,220,0.95))",
          boxShadow: `0 0 30px ${brand.magenta}`,
        }}
      >
        DEAD MAN SWITCH EXPLAINED
      </div>
      <div style={{ fontFamily: sans, fontWeight: 800, fontSize: 30, letterSpacing: 6, color: brand.cyan, textShadow: "0 2px 6px #000" }}>MINDSET MODE | EXPLAINERS</div>
    </div>
  </AbsoluteFill>
);
