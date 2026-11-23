/**
 * Remix of the original reel (woman attendant) with a new motion-graphics
 * layer: punch zooms, flash transitions, stickers, stamps, particles,
 * counter, arrow callout, PRO-TIP banner, animated brand badge,
 * progress bar and a follow outro.
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
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FONT, FONT_CHECKS } from "../rail/theme";
import {
  ArrowCallout,
  Banner,
  BrandBadge,
  Bubbles,
  EmojiPop,
  Flash,
  K,
  ProgressBar,
  QuestionMarks,
  Sparkles,
  Stamp,
  Sticker,
  TripCounter,
} from "./fx";

export const FPS = 30;
export const BASE_FRAMES = 1308; // 43.6s base video
export const OUTRO_FRAMES = 60;
export const REMIX_FRAMES = BASE_FRAMES + OUTRO_FRAMES;
const f = (sec: number) => Math.round(sec * FPS);
const BASE = "video/remix-base-maroon.mp4";

// Scene changes in the reel → flash + punch. Extra punches on key beats.
const FLASHES = [8.6, 11.35, 16.0, 20.0, 27.0, 38.0];
const PUNCHES = [0.9, 4.5, 8.6, 11.35, 16.0, 20.0, 22.5, 27.0, 30.2, 34.6, 38.0, 39.6];

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

/** The reel itself, with a slow drift plus punch-in zooms on beats. */
const CameraVideo: React.FC = () => {
  const frame = useCurrentFrame();
  let z = 1.02 + 0.015 * Math.sin((frame / FPS / 9) * Math.PI * 2);
  let rot = 0;
  PUNCHES.forEach((t, i) => {
    const d = frame - f(t);
    if (d >= 0 && d < 40) {
      const env = Math.min(1, d / 2) * Math.exp(-d / 8);
      z += 0.075 * env;
      rot += (i % 2 ? 1 : -1) * 0.9 * env;
    }
  });
  return (
    <AbsoluteFill style={{ transform: `scale(${z}) rotate(${rot}deg)`, transformOrigin: "50% 45%" }}>
      <OffthreadVideo src={staticFile(BASE)} style={{ width: 1080, height: 1920, objectFit: "cover" }} />
    </AbsoluteFill>
  );
};

/** Show `children` from `at` seconds for `dur` seconds. */
const At: React.FC<{ at: number; dur: number; children: (d: number) => React.ReactNode }> = ({ at, dur, children }) => (
  <Sequence from={f(at)} durationInFrames={f(dur)} layout="none">
    {children(f(dur))}
  </Sequence>
);

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const btn = spring({ frame: frame - 14, fps, config: { damping: 10, stiffness: 180 } });
  const tap = 1 + Math.max(0, Math.sin((frame - 24) / 4)) * 0.06;
  return (
    <AbsoluteFill>
      <Freeze frame={BASE_FRAMES - 2}>
        <AbsoluteFill style={{ filter: "blur(22px)", transform: "scale(1.12)" }}>
          <OffthreadVideo src={staticFile(BASE)} muted style={{ width: 1080, height: 1920, objectFit: "cover" }} />
        </AbsoluteFill>
      </Freeze>
      <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(163,25,46,0.6), rgba(21,23,28,0.78))`, opacity: inP }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 60, opacity: inP }}>
        <BrandBadge big />
        <div
          style={{
            fontFamily: FONT.title,
            fontWeight: 800,
            fontSize: 64,
            color: "#FFFFFF",
            textAlign: "center",
            lineHeight: 1.15,
            textShadow: "0 6px 20px rgba(0,0,0,0.4)",
          }}
        >
          Aise hi 1-minute
          <br />
          explainers ke liye 👇
        </div>
        <div
          style={{
            transform: `scale(${btn * tap})`,
            background: K.yellow,
            color: K.ink,
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
      <Flash />
    </AbsoluteFill>
  );
};

export const Remix: React.FC = () => {
  useFonts();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Sequence durationInFrames={BASE_FRAMES}>
        <CameraVideo />

        {/* 0–4.5  hook */}
        <At at={0.5} dur={3.6}>{(d) => <Sticker text="Ye nahi pata hoga!" emoji="😳" x={560} y={1450} dur={d} tilt={-6} />}</At>

        {/* 4.5–8.5 bedroll packet */}
        <At at={5.4} dur={3.0}>{(d) => <Stamp text="FRESH ✓" x={790} y={1180} dur={d} />}</At>

        {/* 8.5–11.2 attendant */}
        <At at={8.9} dur={2.3}>{(d) => <Sparkles cx={543} cy={520} r={280} dur={d} />}</At>

        {/* 11.2–16 laundry */}
        <At at={11.4} dur={4.6}>{(d) => <Bubbles dur={d} top={300} bottom={1700} />}</At>
        <At at={11.8} dur={4.0}>{(d) => <Sticker text="Laundry time" emoji="🧼" x={330} y={1680} dur={d} tilt={5} bg={K.brand} color="#FFFFFF" size={50} />}</At>

        {/* 16–20 "Toh kambal bhi?" */}
        <At at={16.3} dur={3.6}>
          {(d) => (
            <QuestionMarks
              dur={d}
              spots={[
                [975, 520, 14],
                [105, 560, -16],
                [960, 820, 8],
              ]}
            />
          )}
        </At>
        <At at={17.6} dur={2.3}>{(d) => <EmojiPop emoji="🤔" x={870} y={1320} dur={d} size={170} />}</At>

        {/* 20–27 calendar */}
        <At at={20.3} dur={6.5}>{(d) => <TripCounter x={540} y={1490} dur={d} countFrames={f(2.0)} />}</At>
        <At at={22.6} dur={1.8}>{(d) => <EmojiPop emoji="😱" x={930} y={1250} dur={d} size={150} />}</At>

        {/* 27–30 do chadar */}
        <At at={27.3} dur={2.8}>{(d) => <Sticker text="Ek nahi, DO!" emoji="✌️" x={790} y={1560} dur={d} tilt={-5} size={50} />}</At>

        {/* 30–34.5 sheet + blanket */}
        <At at={31.0} dur={3.4}>{(d) => <ArrowCallout from={[820, 1560]} to={[600, 1250]} label="Yahi trick hai!" dur={d} />}</At>

        {/* 34.6–38 pro tip */}
        <At at={34.8} dur={3.1}>{(d) => <Banner tag="💡 PRO TIP" text="Chadar ko cover bana lo" y={1640} dur={d} />}</At>

        {/* 38–43.6 printed cover */}
        <At at={39.6} dur={3.9}>{(d) => <Stamp text="✔ ALAG SE DHULTA" x={540} y={760} dur={d} color={K.brand} tilt={-8} size={64} />}</At>
        <At at={39.8} dur={3.0}>{(d) => <Sparkles cx={540} cy={760} r={330} dur={d} n={10} />}</At>

        {/* transitions */}
        {FLASHES.map((t) => (
          <Sequence key={t} from={f(t) - 2} durationInFrames={12} layout="none">
            <Flash />
          </Sequence>
        ))}

        <BrandBadge />
        <ProgressBar total={BASE_FRAMES} />
      </Sequence>

      {/* follow outro */}
      <Sequence from={BASE_FRAMES} durationInFrames={OUTRO_FRAMES}>
        <Outro />
        <Audio
          src={staticFile("audio/train-ambience.mp3")}
          startFrom={BASE_FRAMES}
          volume={(fr) => 0.35 * interpolate(fr, [0, 6, OUTRO_FRAMES - 12, OUTRO_FRAMES], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
        />
      </Sequence>
    </AbsoluteFill>
  );
};
