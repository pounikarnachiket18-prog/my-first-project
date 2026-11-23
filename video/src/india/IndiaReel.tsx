import React from "react";
import { AbsoluteFill, Audio, interpolate, random, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { DhabaScene } from "./DhabaScene";
import { FightScene } from "./FightScene";
import { Camera, Highway, Honk, LANES, Oncoming, ONC_LANES, Roadside, Vehicle } from "./Highway";
import { Caption, Chip, Flash, Grade, TopBar, Vignette } from "./Overlay";
import { DUSK, F, NIGHT, SAFFRON } from "./theme";

// ---------------------------------------------------------------- timeline
export const SCENES = {
  hook: { from: 0, dur: 150 },
  traffic: { from: 150, dur: 240 },
  dhaba: { from: 390, dur: 240 },
  fight: { from: 630, dur: 270 },
  night: { from: 900, dur: 210 },
  outro: { from: 1110, dur: 150 },
};
export const REEL_FRAMES = 1260; // 42 s @ 30 fps

const COLORS = ["#F4F4F4", "#D7263D", "#2E86AB", "#1B1B1B", "#9AA0A6", "#E36414", "#3D5A80", "#7B2CBF", "#6A994E", "#C2A878"];
const PLATES = [
  "MH 12 KT 4581",
  "MH 01 AB 2207",
  "MH 14 BX 9034",
  "MH 43 CD 1188",
  "MH 04 GR 6612",
  "GJ 05 RT 7781",
  "KA 01 MJ 3345",
  "DL 3C AB 1234",
  "MH 12 NE 5050",
  "MH 02 DN 8899",
  "MH 15 FG 2468",
  "RJ 14 CV 7070",
];

const trees = (seed: string, from: number, to: number, step: number): Roadside[] => {
  const out: Roadside[] = [];
  for (let s = from, i = 0; s < to; s += step, i++) {
    const r = random(`${seed}${i}`);
    if (r < 0.25) out.push({ kind: "palm", s: s + r * 5, x: -11 - r * 6 });
    else out.push({ kind: "tree", s: s + r * 5, x: -12 - r * 8, scale: 0.8 + r * 0.6, hue: r > 0.6 ? "#4F7D3A" : "#3F6B3A" });
  }
  return out;
};

const crowd = (seed: string, n: number, sMin: number, sMax: number, vMin: number, vMax: number, plateOffset = 0): Vehicle[] =>
  Array.from({ length: n }, (_, i) => {
    const r = random(`${seed}${i}`);
    const kind: Vehicle["kind"] = r < 0.12 ? "truck" : r < 0.22 ? "auto" : r < 0.27 ? "bus" : r < 0.5 ? "suv" : "car";
    return {
      id: `${seed}${i}`,
      kind,
      x: LANES[i % 3] + (random(`${seed}x${i}`) - 0.5) * 0.5,
      s0: sMin + ((sMax - sMin) * i) / n + random(`${seed}s${i}`) * 6,
      v: vMin + random(`${seed}v${i}`) * (vMax - vMin),
      color: kind === "truck" ? ["#E0592A", "#1F4E9A", "#C8102E"][i % 3] : COLORS[i % COLORS.length],
      plate: kind === "truck" || kind === "bus" ? `MH 46 AF ${3300 + i}` : kind === "auto" ? `MH 12 R ${7700 + i}` : PLATES[(i + plateOffset) % PLATES.length],
      plateType: i % 11 === 5 ? "ev" : "private",
      brakeAt: [[(i * 37) % 120, ((i * 37) % 120) + 30]],
    };
  });

const oncoming = (seed: string, n: number, spread: number): Oncoming[] =>
  Array.from({ length: n }, (_, i) => ({
    x: ONC_LANES[i % 3],
    s0: 30 + (spread * i) / n + random(`${seed}${i}`) * 10,
    v: 14 + random(`${seed}v${i}`) * 6,
    color: COLORS[(i * 3) % COLORS.length],
  }));

// ---------------------------------------------------------------- scene 1: hook (wide jam)
const HOOK_CAM: Camera = { start: 0, speed: 8, x: 1.2, h: 3.2, f: 1000, horizon: 780, bob: 1 };
const HOOK_VEH = crowd("hk", 42, 8, 165, 6.5, 8.5);
const HOOK_SIDE: Roadside[] = [
  { kind: "sign", s: 70, x: -8.5, title: "NH 48", lines: [["Lonavala", "18 km"], ["Khandala", "22 km"], ["Pune", "64 km"]] },
  { kind: "stone", s: 26, x: -6.5, place: "PUNE", km: 64 },
  ...trees("hkt", 5, 200, 9),
];

const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - 6, fps, config: { damping: 12, stiffness: 120 } });
  return (
    <AbsoluteFill>
      <Highway palette={DUSK} cam={HOOK_CAM} vehicles={HOOK_VEH} oncoming={oncoming("hko", 10, 150)} roadside={HOOK_SIDE} />
      <div style={{ position: "absolute", top: 300, width: "100%", textAlign: "center", transform: `scale(${s})` }}>
        <div style={{ fontFamily: F.fun, fontWeight: 800, fontSize: 116, lineHeight: 1, color: "#FFF", textShadow: "0 6px 0 rgba(0,0,0,0.5)" }}>
          MUMBAI <span style={{ color: SAFFRON }}>→</span> PUNE
        </div>
        <div style={{ fontFamily: F.ui, fontWeight: 900, fontSize: 40, letterSpacing: 8, color: "#FFE08A", marginTop: 14, textShadow: "0 3px 0 rgba(0,0,0,0.5)" }}>
          RUSH HOUR ON NH 48
        </div>
      </div>
      <Chip text="HEAVY TRAFFIC AHEAD" from={4} />
      <Caption text="5 PM. Expressway. Everybody is late." from={40} to={146} highlight={["late"]} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- scene 2: close traffic + plates + honks
const TR_CAM: Camera = { start: 0, speed: 6, x: 0, h: 1.15, f: 1350, horizon: 860, bob: 2 };
const TR_VEH: Vehicle[] = [
  { id: "hero", kind: "car", x: 0, s0: 6.2, v: 6, color: "#D7263D", plate: "MH 12 KT 4581", brakeAt: [[20, 60], [130, 170]] },
  { id: "auto", kind: "auto", x: -3.4, s0: 3, v: 6.6, plate: "MH 12 R 7781" },
  { id: "suv", kind: "suv", x: 3.5, s0: 9, v: 5.6, color: "#1B1B1B", plate: "MH 01 AB 2207", brakeAt: [[90, 140]] },
  { id: "truck", kind: "truck", x: 0, s0: 17, v: 6, color: "#E0592A", plate: "MH 46 AF 3312" },
  { id: "ev", kind: "car", x: -3.5, s0: 14, v: 6.3, color: "#F4F4F4", plate: "MH 14 EV 0007", plateType: "ev" },
  { id: "gj", kind: "car", x: 3.5, s0: 22, v: 6.1, color: "#2E86AB", plate: "GJ 05 RT 7781" },
  ...crowd("tr", 24, 30, 160, 5, 6.5, 3),
];
const TR_HONKS: Honk[] = [
  { vehicleId: "hero", from: 22, text: "POM POM!" },
  { vehicleId: "auto", from: 70, text: "PEEP PEEP!", color: "#3DDC97", dx: 80 },
  { vehicleId: "truck", from: 112, text: "PAAAAAN!", color: "#FF9933", dur: 30 },
  { vehicleId: "suv", from: 160, text: "POM!", dx: -60 },
  { vehicleId: "hero", from: 196, text: "PEEEEP!", color: "#4CC9F0" },
];
const TR_SIDE: Roadside[] = [
  { kind: "dhaba", s: 58, x: -17, name: "HOTEL HIGHWAY KING", deva: "हाईवे किंग ढाबा" },
  { kind: "stone", s: 20, x: -6.5, place: "LONAVALA", km: 18 },
  ...trees("trt", 2, 120, 8),
];

const TrafficScene: React.FC = () => (
  <AbsoluteFill>
    <Highway palette={DUSK} cam={TR_CAM} vehicles={TR_VEH} oncoming={oncoming("tro", 12, 140)} roadside={TR_SIDE} honks={TR_HONKS} />
    <Chip text="LONAVALA EXIT · 18 KM" from={2} />
    <Caption text="Every car has a number plate…" from={8} to={110} highlight={["plate…"]} />
    <Caption text="…and a horn it LOVES to use." from={116} to={236} highlight={["horn", "LOVES"]} />
  </AbsoluteFill>
);

// ---------------------------------------------------------------- scene 3: dhaba stop
const DhabaWrap: React.FC = () => (
  <AbsoluteFill>
    <DhabaScene />
    <Chip text="KHANDALA GHAT · MAHARASHTRA" from={2} />
    <Caption text="Pit stop: kadak chai + aloo paratha" from={20} to={236} highlight={["chai", "paratha"]} y={240} />
  </AbsoluteFill>
);

// ---------------------------------------------------------------- scene 4: roadside fight
const FightWrap: React.FC = () => (
  <AbsoluteFill>
    <FightScene />
    <Chip text="ROADSIDE DRAMA · KATRAJ, PUNE" from={2} y={130} />
  </AbsoluteFill>
);

// ---------------------------------------------------------------- scene 5: night drive south
const NT_CAM: Camera = { start: 0, speed: 14, x: 0.8, h: 1.6, f: 1200, horizon: 860, bob: 1.5 };
const NT_PLATES_VEH: Vehicle[] = [
  { id: "ka", kind: "car", x: 0, s0: 9, v: 14, color: "#9AA0A6", plate: "KA 22 MB 4040", brakeAt: [[60, 90]] },
  { id: "mh9", kind: "suv", x: 3.5, s0: 15, v: 13.2, color: "#F4F4F4", plate: "MH 09 EK 1212" },
  { id: "trk", kind: "truck", x: -3.5, s0: 28, v: 11, color: "#1F4E9A", plate: "KA 01 AB 9090" },
  ...crowd("nt", 20, 40, 220, 11, 14.5, 6).map((v, i) => ({
    ...v,
    plate: v.kind === "car" || v.kind === "suv" ? ["KA 01 MJ 3345", "MH 11 CT 5151", "MH 09 GH 7272", "KA 22 Z 1001", "KA 51 MN 2323"][i % 5] : v.plate,
  })),
];
const NT_SIDE: Roadside[] = [
  { kind: "sign", s: 60, x: -8.5, title: "NH 48", lines: [["Satara", "112 km"], ["Kolhapur", "228 km"], ["Belagavi", "330 km"]] },
  { kind: "dhaba", s: 150, x: -17, name: "AMRITSARI DHABA", deva: "अमृतसरी ढाबा", wall: "#4CC9F0" },
  { kind: "stone", s: 34, x: -6.5, place: "KOLHAPUR", km: 228 },
  { kind: "dhaba", s: 260, x: -17, name: "HOTEL SAHYADRI", deva: "हॉटेल सह्याद्री", wall: "#F2C14E" },
  ...trees("ntt", 5, 360, 10),
];
const NT_HONKS: Honk[] = [
  { vehicleId: "ka", from: 30, text: "POM POM!" },
  { vehicleId: "trk", from: 120, text: "PAAAN!", color: "#FF9933", dur: 28 },
];

const NightScene: React.FC<{ frameOffset?: number; captions?: boolean }> = ({ frameOffset = 0, captions = true }) => (
  <AbsoluteFill>
    <Highway
      palette={NIGHT}
      cam={NT_CAM}
      vehicles={NT_PLATES_VEH}
      oncoming={oncoming("nto", 18, 300)}
      roadside={NT_SIDE}
      honks={captions ? NT_HONKS : []}
      frameOffset={frameOffset}
    />
    {captions && (
      <>
        <Chip text="NIGHT DRIVE · NH 48 SOUTH" from={2} dot="#3DDC97" />
        <Caption text="Satara… Kolhapur… next stop Karnataka." from={10} to={206} highlight={["Karnataka."]} />
      </>
    )}
  </AbsoluteFill>
);

// ---------------------------------------------------------------- scene 6: outro
const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - 8, fps, config: { damping: 14, stiffness: 110 } });
  const s2 = spring({ frame: frame - 26, fps, config: { damping: 14, stiffness: 110 } });
  return (
    <AbsoluteFill>
      <NightScene frameOffset={210} captions={false} />
      <AbsoluteFill style={{ background: "rgba(4,10,16,0.72)" }} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center", padding: 60 }}>
        <div style={{ transform: `scale(${s})`, fontFamily: F.deva, fontWeight: 800, fontSize: 84, color: "#FFF", lineHeight: 1.25 }}>
          हर सफ़र की
          <br />
          <span style={{ color: SAFFRON }}>अपनी कहानी</span>
        </div>
        <div style={{ transform: `scale(${s2})`, marginTop: 30, fontFamily: F.fun, fontWeight: 800, fontSize: 52, color: "#FFE08A" }}>
          Har safar ki apni kahani.
        </div>
        <div style={{ opacity: s2, marginTop: 40, fontFamily: F.ui, fontWeight: 800, fontSize: 30, letterSpacing: 6, color: "rgba(255,255,255,0.8)" }}>
          NH 48 · MUMBAI → PUNE → BENGALURU
        </div>
        <div
          style={{
            opacity: s2,
            marginTop: 60,
            padding: "16px 36px",
            borderRadius: 50,
            background: SAFFRON,
            fontFamily: F.ui,
            fontWeight: 900,
            fontSize: 34,
            color: "#111",
          }}
        >
          FOLLOW FOR EP 02
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- assemble
const FadeIn: React.FC<{ children: React.ReactNode; dur: number }> = ({ children, dur }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 8, dur - 6, dur], [0, 1, 1, 0.0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

export const IndiaReel: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => {
  const { fps } = useVideoConfig();
  const list: [keyof typeof SCENES, React.FC, boolean][] = [
    ["hook", HookScene, false],
    ["traffic", TrafficScene, false],
    ["dhaba", DhabaWrap, false],
    ["fight", FightWrap, false],
    ["night", () => <NightScene />, true],
    ["outro", Outro, true],
  ];
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {list.map(([key, Comp, night]) => (
        <Sequence key={key} from={SCENES[key].from} durationInFrames={SCENES[key].dur}>
          <FadeIn dur={SCENES[key].dur}>
            <Comp />
            <Grade night={night} />
          </FadeIn>
        </Sequence>
      ))}
      <Vignette />
      <TopBar />
      <Flash at={SCENES.fight.from} dur={6} />
      {withAudio && (
        <Audio
          src={staticFile("indian-traffic.mp3")}
          volume={(f) =>
            interpolate(f, [0, 10, REEL_FRAMES - 2 * fps, REEL_FRAMES], [0, 0.9, 0.9, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }
        />
      )}
    </AbsoluteFill>
  );
};
