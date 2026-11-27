import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import captions from "../data/captions.json";
import { FONT } from "../fonts";

type Word = { text: string; start: number; end: number; emph: boolean; accent?: string };
type Line = { id: string; start: number; end: number; accent: string; words: Word[] };

const MAX_CHARS = 15; // per subtitle line at this size; a page never exceeds two lines

const rowsOf = (words: Word[]) => {
  const rows: Word[][] = [[]];
  let chars = 0;
  for (const w of words) {
    if (rows[rows.length - 1].length && chars + w.text.length > MAX_CHARS) {
      rows.push([]);
      chars = 0;
    }
    rows[rows.length - 1].push(w);
    chars += w.text.length + 1;
  }
  return rows;
};

/** Split each narration line into pages of at most two lines; prefer breaking after punctuation. */
const paginate = (line: Line) => {
  const pages: Word[][] = [];
  let cur: Word[] = [];
  for (const w of line.words) {
    const tooLong = cur.length > 0 && rowsOf([...cur, w]).length > 2;
    const punctBreak = cur.length >= 3 && /[.,!?…]$/.test(cur[cur.length - 1].text) && rowsOf(cur).length === 2;
    if (tooLong || punctBreak) {
      pages.push(cur);
      cur = [];
    }
    cur.push(w);
  }
  if (cur.length) pages.push(cur);
  // avoid a lonely last word: pull one word down from the previous page
  const n = pages.length;
  if (n >= 2 && pages[n - 1].length === 1 && pages[n - 2].length >= 2) {
    pages[n - 1].unshift(pages[n - 2].pop()!);
  }
  return pages;
};

const splitLines = rowsOf;

export const Subtitles: React.FC<{ y?: number }> = ({ y = 0.64 }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const t = frame / fps;
  const lines = (captions as { lines: Line[] }).lines;
  const pages = useMemo(() => lines.flatMap((l) => paginate(l).map((p) => ({ line: l, words: p }))), [lines]);
  const idx = pages.findIndex((p, i) => {
    const s = p.words[0].start - 0.08;
    const next = pages[i + 1];
    const e = Math.min(p.words[p.words.length - 1].end + 0.35, next ? next.words[0].start - 0.08 : 1e9);
    return t >= s && t < e;
  });
  if (idx < 0) return null;
  const page = pages[idx];
  const pageStart = page.words[0].start - 0.08;
  const appear = spring({ frame: frame - Math.round(pageStart * fps), fps, config: { damping: 18, stiffness: 260, mass: 0.6 } });
  const rows = splitLines(page.words);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          top: height * y,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          transform: `translateY(${interpolate(appear, [0, 1], [26, 0])}px) scale(${interpolate(appear, [0, 1], [0.94, 1])})`,
          opacity: appear,
        }}
      >
        {rows.map((row, ri) => (
          <div key={ri} style={{ display: "flex", flexWrap: "nowrap", justifyContent: "center", gap: "0 30px" }}>
            {row.map((w, wi) => {
              const active = t >= w.start - 0.03 && t < w.end + 0.02;
              const spoken = t >= w.start - 0.03;
              const accent = w.accent ?? page.line.accent;
              const pop = spring({ frame: frame - Math.round((w.start - 0.03) * fps), fps, config: { damping: 12, stiffness: 320, mass: 0.5 } });
              const s = active ? interpolate(pop, [0, 1], [0.97, 1.04]) : 1;
              const color = w.emph && spoken ? accent : active ? accent : "#ffffff";
              return (
                <span
                  key={wi}
                  style={{
                    fontFamily: FONT.sub,
                    fontWeight: 900,
                    fontSize: w.emph ? 80 : 72,
                    lineHeight: 1.08,
                    letterSpacing: -0.5,
                    textTransform: "uppercase",
                    color,
                    opacity: spoken ? 1 : 0.82,
                    transform: `scale(${s})`,
                    display: "inline-block",
                    WebkitTextStroke: "3px rgba(0,0,0,0.85)",
                    paintOrder: "stroke fill",
                    textShadow: `0 6px 18px rgba(0,0,0,0.75)${w.emph && spoken ? `, 0 0 28px ${accent}88` : ""}`,
                  }}
                >
                  {w.text}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
