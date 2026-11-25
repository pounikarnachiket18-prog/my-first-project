// Channel branding: JustKnow It
import React from "react";

export const BRAND = { name: "JUSTKNOW IT", handle: "JustKnow It" };
export const BRAND_YELLOW = "#ffc233";

/** JustKnow It mark: navy badge, bold J with a yellow "spark" (the moment you just know) */
export const BrandMark: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block", filter: "drop-shadow(0 3px 10px rgba(0,0,0,0.45))" }}>
    <defs>
      <linearGradient id="jkbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#10213a" /><stop offset="1" stopColor="#060d18" /></linearGradient>
    </defs>
    <circle cx={50} cy={50} r={47} fill="url(#jkbg)" stroke={BRAND_YELLOW} strokeWidth={4} />
    <path d="M58 24 L58 60 C58 72 50 78 40 78 C32 78 26 73 25 65" fill="none" stroke="#ffffff" strokeWidth={11} strokeLinecap="round" />
    <path d="M72 18 L66 34 L76 34 L64 54 L68 38 L59 38 Z" fill={BRAND_YELLOW} />
  </svg>
);

/** wordmark: JUSTKNOW (white) IT (yellow) */
export const BrandWord: React.FC<{ size: number; sub?: string }> = ({ size, sub }) => (
  <span style={{ display: "inline-flex", flexDirection: "column", lineHeight: 1 }}>
    <span style={{ fontFamily: "Inter", fontWeight: 900, fontSize: size, letterSpacing: size * 0.04, color: "#fff", transform: "scaleX(0.9)", transformOrigin: "left" }}>
      JUSTKNOW <span style={{ color: BRAND_YELLOW }}>IT</span>
    </span>
    {sub && <span style={{ fontFamily: "Inter", fontWeight: 700, fontSize: size * 0.36, letterSpacing: size * 0.08, color: "#9fe2ff", marginTop: size * 0.12 }}>{sub}</span>}
  </span>
);
