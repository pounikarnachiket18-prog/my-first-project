// Channel branding: Just KnowIt (user's logo: white brain + wordmark on red)
import React from "react";
import { Img, staticFile } from "remotion";

export const BRAND = { name: "JUST KNOWIT", handle: "Just KnowIt" };
export const JK_RED = "#c10211";
export const BRAND_YELLOW = "#ffc233";
const WORD_AR = 783 / 97, BRAIN_AR = 184 / 203;

/** brain mark on a red disc */
export const BrandMark: React.FC<{ size: number }> = ({ size }) => (
  <span style={{ width: size, height: size, borderRadius: "50%", background: JK_RED, display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "0 3px 12px rgba(0,0,0,0.45)" }}>
    <Img src={staticFile("navy/jk_brain.png")} style={{ height: size * 0.66, width: size * 0.66 * BRAIN_AR }} />
  </span>
);

/** the "Just KnowIt" wordmark (white), optional small subline */
export const BrandWord: React.FC<{ size: number; sub?: string }> = ({ size, sub }) => (
  <span style={{ display: "inline-flex", flexDirection: "column", lineHeight: 1 }}>
    <Img src={staticFile("navy/jk_word.png")} style={{ height: size * 0.82, width: size * 0.82 * WORD_AR }} />
    {sub && <span style={{ fontFamily: "Inter", fontWeight: 700, fontSize: size * 0.32, letterSpacing: size * 0.07, color: "#ffffff", opacity: 0.85, marginTop: size * 0.14 }}>{sub}</span>}
  </span>
);

/** corner watermark: red pill with the brain + wordmark */
export const BrandBadge: React.FC = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 16px 7px 10px", borderRadius: 12, background: JK_RED, boxShadow: "0 3px 14px rgba(0,0,0,0.4)" }}>
    <Img src={staticFile("navy/jk_brain.png")} style={{ height: 34, width: 34 * BRAIN_AR }} />
    <Img src={staticFile("navy/jk_word.png")} style={{ height: 22, width: 22 * WORD_AR }} />
  </div>
);
