/**
 * New storyline, re-cut from our own rebuilt reel (rail/scenes) plus the
 * 3D sleeping passenger, two clips from the Mindset Mode Explainers
 * announcement reel, and that reel's graphic language: spotlight titles,
 * red/blue swoosh wipes, red-line train progress, ring + number callouts.
 */
import React from "react";
import {
  AbsoluteFill,
  Audio,
  Freeze,
  OffthreadVideo,
  Sequence,
  continueRender,
  delayRender,
  getStaticFiles,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { C, FONT, FONT_CHECKS } from "../rail/theme";
import { FadeIn, Title, TitleStyle } from "../rail/parts";
import { AttendantScene, BerthStoryScene, CalendarScene, HookPacketScene, KambalBhiScene, LaundryScene } from "../rail/scenes";
import { BrandBadge } from "../remix/fx";
import { Flashback, Sleeper } from "./sleeper";

const FPS = 30;
const f = (sec: number) => Math.round(sec * FPS);
const X = 8; // cross-fade frames
const SW = 16; // swoosh length (frames); cut happens at its midpoint

type Seg = { el: React.ReactNode; dur: number; from?: number; cut?: "fade" | "swoosh"; label: string };

/** Mindset Mode train clips, slowed down and graded. */
const Clip: React.FC<{ src: string; rate: number; night?: boolean; freezeAfter: number }> = ({ src, rate, night, freezeAfter }) => {
  const frame = useCurrentFrame();
  const v = (
    <OffthreadVideo
      src={staticFile(src)}
      playbackRate={rate}
      muted
      style={{ width: 1080, height: 1920, objectFit: "cover", filter: night ? "brightness(0.62) saturate(0.85)" : undefined }}
    />
  );
  const z = 1 + frame * 0.0015;
  return (
    <AbsoluteFill style={{ transform: `scale(${z})` }}>
      {frame < freezeAfter ? v : <Freeze frame={freezeAfter - 1}>{v}</Freeze>}
      {night && <AbsoluteFill style={{ background: "rgba(20,30,80,0.35)" }} />}
    </AbsoluteFill>
  );
};

/** Red ring + numbered blue badge callout (announcement-reel style). */
const Ring: React.FC<{ x: number; y: number; r: number; n: number; inAt: number }> = ({ x, y, r, n, inAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < inAt) return null;
  const p = spring({ frame: frame - inAt, fps, config: { damping: 12, stiffness: 170 } });
  const pulse = 1 + Math.sin((frame - inAt) / 6) * 0.04;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x - r,
          top: y - r,
          width: r * 2,
          height: r * 2,
          borderRadius: "50%",
          border: `6px solid ${C.accent}`,
          boxShadow: `0 0 0 14px rgba(163,25,46,0.15)`,
          transform: `scale(${p * pulse})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: x - r * 0.75 - 30,
          top: y + r * 0.6,
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: "#2F44E0",
          color: "#FFFFFF",
          border: "4px solid #FFFFFF",
          fontFamily: FONT.title,
          fontWeight: 800,
          fontSize: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${p})`,
        }}
      >
        {n}
      </div>
    </>
  );
};

/** White panel with blue + red diagonal stripes sweeping left → right. */
const Swoosh: React.FC = () => {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [0, SW], [-2600, 1500], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -400, left: x, height: 2800, display: "flex", transform: "skewX(-18deg)" }}>
        <div style={{ width: 90, background: "#2F44E0" }} />
        <div style={{ width: 120, background: C.accent }} />
        <div style={{ width: 1500, background: "#FBF7EE" }} />
        <div style={{ width: 120, background: C.accent }} />
        <div style={{ width: 90, background: "#2F44E0" }} />
      </div>
    </AbsoluteFill>
  );
};

/** Thin red progress line along the top with a small train riding it. */
const TrainProgress: React.FC<{ total: number }> = ({ total }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, total], [0, 1], { extrapolateRight: "clamp" });
  const x = 40 + p * 960;
  return (
    <div style={{ position: "absolute", top: 6, left: 40, width: 1000, height: 40 }}>
      <div style={{ position: "absolute", top: 18, left: 0, width: 1000, height: 4, background: "rgba(163,25,46,0.25)", borderRadius: 2 }} />
      <div style={{ position: "absolute", top: 18, left: 0, width: x - 40, height: 4, background: C.accent, borderRadius: 2 }} />
      <svg width="64" height="34" viewBox="0 0 64 34" style={{ position: "absolute", left: x - 72, top: 3 }}>
        <rect x="2" y="4" width="56" height="20" rx="8" fill="#FFFFFF" stroke="#2F44E0" strokeWidth="3" />
        <rect x="8" y="9" width="10" height="7" rx="2" fill="#2F44E0" />
        <rect x="22" y="9" width="10" height="7" rx="2" fill="#2F44E0" />
        <rect x="36" y="9" width="10" height="7" rx="2" fill="#2F44E0" />
        <rect x="2" y="20" width="56" height="4" fill={C.accent} />
        <circle cx="14" cy="28" r="4" fill="#2B2B33" />
        <circle cx="46" cy="28" r="4" fill="#2B2B33" />
      </svg>
    </div>
  );
};

const FollowSlate: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const btn = spring({ frame: frame - 14, fps, config: { damping: 10, stiffness: 180 } });
  const tap = 1 + Math.max(0, Math.sin((frame - 24) / 4)) * 0.05;
  return (
    <AbsoluteFill style={{ opacity: inP, alignItems: "center", justifyContent: "flex-start", paddingTop: 360, gap: 50 }}>
      <BrandBadge big color={C.accent} />
      <div style={{ fontFamily: FONT.title, fontWeight: 800, fontSize: 62, color: C.ink, textAlign: "center", lineHeight: 1.12, background: "rgba(255,255,255,0.9)", padding: "16px 40px", borderRadius: 30 }}>
        Aise hi 1-minute explainers ke liye 👇
      </div>
      <div
        style={{
          transform: `scale(${btn * tap})`,
          background: C.accent,
          color: "#FFFFFF",
          fontFamily: FONT.title,
          fontWeight: 800,
          fontSize: 72,
          padding: "18px 80px",
          borderRadius: 999,
          border: "8px solid #FFFFFF",
          boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
        }}
      >
        Follow karo 🔔
      </div>
    </AbsoluteFill>
  );
};

/** Plays `children` starting `from` seconds into it. */
const From: React.FC<{ from: number; children: React.ReactNode }> = ({ from, children }) => (
  <Sequence from={-f(from)} layout="none">
    {children}
  </Sequence>
);

const SEGMENTS: Seg[] = [
  { label: "1 Train arrives (Mindset Mode clip)", dur: 1.5, el: <Clip src="video/mme-platform.mp4" rate={0.55} night freezeAfter={f(1.45)} /> },
  { label: "1 Passenger asleep", dur: 2.6, cut: "swoosh", el: <Sleeper /> },
  { label: "2 Wakes up", dur: 2.0, el: <Sleeper wake /> },
  { label: "2 Kambal kab dhula tha?", dur: 3.0, el: <KambalBhiScene title={"Kambal kab\ndhula tha?"} pill={null} titleOut={99} /> },
  { label: "3 Coach mein hi", dur: 2.6, el: <From from={2.4}><KambalBhiScene title={null} pill="Kambal coach mein hi" pillAt={2.6} /></From> },
  { label: "3 Calendar", dur: 7.0, el: <CalendarScene /> },
  {
    label: "4 Flashback: packet",
    dur: 4.2,
    cut: "swoosh",
    el: (
      <>
        <From from={4.5}>
          <HookPacketScene />
        </From>
        <Ring x={430} y={1170} r={150} n={1} inAt={f(1.5)} />
        <Ring x={830} y={850} r={120} n={2} inAt={f(2.3)} />
        <Flashback />
      </>
    ),
  },
  { label: "5 Attendant", dur: 2.5, el: <AttendantScene /> },
  { label: "5 Laundry", dur: 4.8, el: <LaundryScene /> },
  { label: "6-8 Two sheets → cover → printed cover", dur: 16.6, cut: "swoosh", el: <BerthStoryScene /> },
  { label: "9 Back to sleep", dur: 3.0, el: <Sleeper cover /> },
  {
    label: "9 Follow (branded train clip)",
    dur: 3.4,
    cut: "swoosh",
    el: (
      <>
        <Clip src="video/mme-branded-train.mp4" rate={0.5} freezeAfter={f(1.4)} />
        <FollowSlate />
      </>
    ),
  },
];

// absolute start of each segment
const STARTS = SEGMENTS.reduce<number[]>((acc, s, i) => [...acc, i === 0 ? 0 : acc[i - 1] + SEGMENTS[i - 1].dur], []);
export const RECUT_SEC = STARTS[STARTS.length - 1] + SEGMENTS[SEGMENTS.length - 1].dur;
export const RECUT_FRAMES = f(RECUT_SEC);

const has = (file: string) => {
  try {
    return getStaticFiles().some((x) => x.name === file);
  } catch {
    return false;
  }
};

const useFonts = () => {
  const [handle] = React.useState(() => delayRender("Loading embedded fonts"));
  React.useEffect(() => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        continueRender(handle);
      }
    };
    Promise.all(FONT_CHECKS.map((c) => document.fonts.load(c, "Aa")))
      .then(finish)
      .catch(finish);
    const t = setTimeout(finish, 10000);
    return () => clearTimeout(t);
  }, [handle]);
};

export const Recut: React.FC = () => {
  useFonts();
  const slateAt = STARTS[STARTS.length - 1];
  return (
    <TitleStyle.Provider value="spot">
      <AbsoluteFill style={{ background: C.wall }}>
        {SEGMENTS.map((seg, i) => {
          const a = f(STARTS[i]);
          const fade = i > 0 && seg.cut !== "swoosh";
          const from = fade ? a - X : a;
          return (
            <Sequence key={i} from={from} durationInFrames={a + f(seg.dur) - from}>
              {fade ? <FadeIn frames={X}>{seg.el}</FadeIn> : seg.el}
            </Sequence>
          );
        })}
        {/* opening title over the train clip */}
        <Sequence durationInFrames={f(1.5)}>
          <Title text={"Raat ka\nsafar"} inAt={2} y={260} />
        </Sequence>

        {SEGMENTS.map((seg, i) =>
          seg.cut === "swoosh" ? (
            <Sequence key={`sw${i}`} from={f(STARTS[i]) - SW / 2} durationInFrames={SW} layout="none">
              <Swoosh />
            </Sequence>
          ) : null,
        )}

        <Sequence durationInFrames={f(slateAt)}>
          <BrandBadge color={C.accent} />
          <TrainProgress total={f(slateAt)} />
        </Sequence>

        {has("audio/story-voiceover.mp3") && <Audio src={staticFile("audio/story-voiceover.mp3")} />}
        {has("audio/train-ambience.mp3") && (
          <Audio
            src={staticFile("audio/train-ambience.mp3")}
            volume={(fr) => 0.3 * interpolate(fr, [0, 10, RECUT_FRAMES - 15, RECUT_FRAMES], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
          />
        )}
      </AbsoluteFill>
    </TitleStyle.Provider>
  );
};

/** Segment start times, for retiming to the recorded voiceover. */
export const SEGMENT_TIMES = SEGMENTS.map((s, i) => `${STARTS[i].toFixed(1)}s  ${s.label}`);
