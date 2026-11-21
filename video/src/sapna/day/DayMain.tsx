import React from "react";
import * as THREE from "three";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, FONT } from "../theme";
import { CoverageRing, MapMarker, PlotDots, Routes, Satellite, Tower, TrackGlow, TrackSegment, World3D } from "../three/World3D";
import { Cam, poseAt, project, vehicleCenterS } from "../three/track";
import { ST_CENTER, T_HERO, T_MAP_A, T_MAP_B, T_OFF, T_ROW, T_STATION, shotAt, towerAt } from "./shots";
import {
  AppCard,
  Avatars,
  Battery,
  CommentCard,
  FollowCard,
  GChip,
  IdCounter,
  LoggerCard,
  MapsCard,
  MeterCard,
  PNK,
  Place,
  ServingCard,
  SizeCard,
  TimedHeadline,
  TimetableCard,
  YEL,
  pop,
  popStyle,
  vis,
} from "./overlays";
import { CheckIcon, CrossIcon, PinIcon, TowerIcon, TrainGlyph } from "../ui";

export const DAY_FRAMES = 3160; // 105.33 s, same as the voice track

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const up = (v: THREE.Vector3, y: number) => v.clone().add(V(0, y, 0));
const W = 1080;
const H = 1920;

const HEADLINES: { from: number; to: number; size?: number; top?: number; lines: { at: number; words: (string | { t: string; c: string })[] }[] }[] = [
  { from: 1.0, to: 3.0, lines: [{ at: 1.0, words: ["Data", { t: "khatam,", c: PNK }] }, { at: 1.9, words: ["internet", { t: "band!", c: PNK }] }] },
  { from: 3.0, to: 8.5, lines: [{ at: 3.0, words: ["Phir", "bhi..."] }] },
  { from: 8.7, to: 11.0, lines: [{ at: 9.0, words: ["Bina", "internet..."] }, { at: 9.9, words: ["pata", { t: "kaise", c: YEL }, "chala?"] }] },
  { from: 11.0, to: 14.0, lines: [{ at: 11.0, words: ["Jawab:", "ek"] }, { at: 12.0, words: [{ t: "chhupa", c: YEL }, { t: "hua", c: YEL }, { t: "number!", c: YEL }] }] },
  { from: 14.0, to: 15.95, lines: [{ at: 14.0, words: ["Pehla", "guess:"] }, { at: 15.0, words: [{ t: "GPS?", c: YEL }] }] },
  { from: 16.0, to: 18.0, lines: [{ at: 16.0, words: ["GPS", "="] }, { at: 17.0, words: [{ t: "battery", c: PNK }, { t: "khaata!", c: PNK }] }] },
  { from: 18.7, to: 21.0, lines: [{ at: 19.0, words: ["Metal", "body:"] }, { at: 19.6, words: ["signal", { t: "kamzor!", c: PNK }] }] },
  { from: 21.0, to: 26.0, lines: [{ at: 21.0, words: ["Founder", "ka", { t: "logic:", c: YEL }] }] },
  { from: 26.0, to: 28.0, lines: [{ at: 26.0, words: ["Raaz:", { t: "mobile", c: YEL }] }, { at: 26.8, words: [{ t: "tower!", c: YEL }] }] },
  { from: 28.0, to: 33.0, lines: [{ at: 28.0, words: ["Data", { t: "off...", c: PNK }] }, { at: 29.0, words: ["phir", "bhi"] }, { at: 32.0, words: [{ t: "juda!", c: YEL }] }] },
  { from: 33.0, to: 35.0, lines: [{ at: 33.0, words: ["Har", "tower", "ki"] }, { at: 34.0, words: [{ t: "fixed", c: YEL }, { t: "ID!", c: YEL }] }] },
  { from: 35.3, to: 38.0, lines: [{ at: 35.5, words: ["App", { t: "chupchaap", c: YEL }] }, { at: 36.5, words: ["ID", { t: "padhta", c: PNK }, "hai"] }] },
  { from: 38.8, to: 41.0, lines: [{ at: 39.0, words: ["ID", "se", { t: "jagah", c: YEL }] }, { at: 40.0, words: ["kaise", "pata", "chale?"] }] },
  { from: 42.8, to: 46.0, lines: [{ at: 43.0, words: ["GPS", "+", "Tower", "ID:"] }, { at: 44.0, words: [{ t: "dono", c: YEL }, { t: "record!", c: YEL }] }] },
  { from: 46.0, to: 47.0, lines: [{ at: 46.0, words: ["Map", "pe", { t: "plot", c: YEL }, "kiya..."] }] },
  { from: 47.0, to: 50.0, lines: [{ at: 47.0, words: ["Towers", "ne", { t: "track", c: YEL }] }, { at: 48.5, words: [{ t: "kheench", c: YEL }, { t: "di!", c: YEL }] }] },
  { from: 50.0, to: 53.0, lines: [{ at: 50.0, words: ["Users", "ke", { t: "safar", c: YEL }, "se..."] }, { at: 51.0, words: ["poore", "India", "ka", { t: "map!", c: YEL }] }] },
  { from: 53.0, to: 56.0, lines: [{ at: 53.0, words: ["Size?"] }] },
  { from: 56.0, to: 59.0, lines: [{ at: 56.0, words: ["Asli", "trick:"] }, { at: 57.0, words: ["train", "sirf", { t: "track", c: YEL }, "pe!"] }] },
  { from: 60.0, to: 63.0, lines: [{ at: 60.0, words: ["Area:", { t: "kai", c: YEL }, { t: "km...", c: YEL }] }, { at: 61.0, words: ["par", "track", "=", { t: "ek", c: YEL }, { t: "line!", c: YEL }] }] },
  { from: 63.0, to: 65.0, lines: [{ at: 63.0, words: ["Tower", { t: "badla", c: YEL }, "="] }, { at: 64.0, words: ["train", { t: "aage!", c: YEL }] }] },
  { from: 65.0, to: 70.0, size: 74, lines: [{ at: 65.0, words: ["Station", "pe", "towers", { t: "ghane...", c: YEL }] }, { at: 67.5, words: ["accuracy", { t: "GPS", c: YEL }, { t: "jaisi!", c: YEL }] }] },
  { from: 70.0, to: 72.0, lines: [{ at: 70.0, words: ["Late", { t: "kitni?", c: YEL }] }] },
  { from: 72.0, to: 74.0, lines: [{ at: 72.0, words: ["Timetable:", { t: "offline!", c: YEL }] }] },
  { from: 74.0, to: 76.0, lines: [{ at: 74.0, words: ["Kahaan", { t: "hai...", c: YEL }] }, { at: 75.0, words: ["kahaan", { t: "honi", c: YEL }, { t: "chahiye?", c: YEL }] }] },
  { from: 76.0, to: 78.0, lines: [{ at: 76.0, words: ["Farak", "=", { t: "delay!", c: YEL }] }] },
  { from: 78.0, to: 81.0, lines: [{ at: 78.0, words: ["Par", "sirf", "jab", "tum"] }, { at: 79.5, words: [{ t: "usi", c: YEL }, { t: "train", c: YEL }, "mein", "ho!"] }] },
  { from: 83.0, to: 85.0, lines: [{ at: 83.0, words: ["Bengaluru", "ke"] }, { at: 83.8, words: [{ t: "5", c: YEL }, { t: "engineers", c: YEL }] }] },
  { from: 86.0, to: 88.0, lines: [{ at: 86.0, words: [{ t: "Google", c: YEL }, "ne"] }, { at: 86.6, words: ["khareed", "liya!"] }] },
  { from: 88.0, to: 91.0, lines: [{ at: 88.0, words: ["Google", "Maps", "ka"] }, { at: 88.8, words: [{ t: "live", c: YEL }, { t: "train", c: YEL }, { t: "status", c: YEL }] }] },
  { from: 92.0, to: 95.0, lines: [{ at: 92.0, words: ["Internet", "na", "ho..."] }, { at: 93.5, words: ["location", { t: "phir", c: YEL }, { t: "bhi!", c: YEL }] }] },
  { from: 96.0, to: 98.0, lines: [{ at: 96.0, words: ["Phone", "ki", { t: "towers", c: YEL }, "se"] }, { at: 96.8, words: [{ t: "chupchaap", c: YEL }, "baat!"] }] },
  { from: 98.0, to: 102.0, lines: [{ at: 98.0, words: ["Comment", "karo:"] }] },
  { from: 102.0, to: 105.4, size: 70, lines: [{ at: 102.0, words: ["Aise", { t: "tech", c: YEL }, { t: "secrets", c: YEL }, "ke", "liye..."] }] },
];

/** Screen position of a 3D point for the current camera. */
const at3D = (cam: Cam, v: THREE.Vector3) => project(cam, v, W, H);

export const DayMain: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const shot = shotAt(t);
  const u = t - shot.from;
  const cam = shot.cam(u);
  const head = shot.head(u);
  const focus = shot.focus ? shot.focus(u) : poseAt(vehicleCenterS(head, 4)).p;
  const trainMid = poseAt(vehicleCenterS(head, 4)).p;
  const markerS = vehicleCenterS(head, 5);
  const id = shot.id;

  /* ---------- 3D props per shot ---------- */
  const extras: React.ReactNode[] = [];
  if (id === "towerReveal" || id === "towerHero" || id === "towerTrain") {
    extras.push(<Tower key="hero" pos={T_HERO} scale={1.3} active />);
    extras.push(<CoverageRing key="heroRing" pos={T_HERO} r={id === "towerHero" ? 34 : 60} color="#22d3ee" active />);
  }
  if (id === "towerTrain" && t >= 30) {
    const a = up(T_HERO, 40);
    const b = up(poseAt(vehicleCenterS(head, 3)).p, 4.6);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const dir = b.clone().sub(a);
    extras.push(
      <mesh key="beam" position={mid} quaternion={new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir.clone().normalize())}>
        <cylinderGeometry args={[0.6, 0.6, dir.length(), 8]} />
        <meshBasicMaterial color="#22d3ee" toneMapped={false} transparent opacity={0.85 + Math.sin(frame / 3) * 0.15} />
      </mesh>,
    );
  }
  if (id === "satellite") {
    const at = poseAt(1700);
    const sat = at.p.clone().addScaledVector(at.fwd, -220).addScaledVector(at.side, -90).add(V(0, 300, 0));
    extras.push(<Satellite key="sat" pos={sat} target={up(trainMid, 4.5)} beam={0.2 + Math.sin(frame / 3) * 0.06} />);
  }
  if (id === "founder") {
    const g = interpolate(t, [23.6, 24.4], [0, 1], clamp);
    if (g > 0) {
      extras.push(<CoverageRing key="r1" pos={trainMid} r={60 * g} color="#22c55e" active />);
      extras.push(<CoverageRing key="r2" pos={trainMid} r={130 * g} color="#22c55e" active={false} />);
    }
  }
  if (id === "towerRow" || id === "drone") {
    T_ROW.forEach((p, i) => extras.push(<Tower key={`row${i}`} pos={p} scale={1.4} active />));
  }
  if (id === "drone") {
    T_ROW.forEach((p, i) => {
      const a = up(p, 44);
      const b = up(poseAt(vehicleCenterS(head, 2 + i * 3)).p, 4.6);
      const d = b.clone().sub(a);
      const ph = (Math.sin(frame / 7 + i * 2) + 1) / 2;
      extras.push(
        <mesh key={`db${i}`} position={a.clone().add(b).multiplyScalar(0.5)} quaternion={new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize())}>
          <cylinderGeometry args={[0.45, 0.45, d.length(), 6]} />
          <meshBasicMaterial color={["#22c55e", "#a855f7", "#22d3ee"][i]} toneMapped={false} transparent opacity={0.4 + ph * 0.6} />
        </mesh>,
      );
    });
  }
  if (id === "plot") {
    extras.push(<PlotDots key="dots" s0={1450} s1={2350} count={46} progress={interpolate(t, [46.0, 47.6], [0, 1], clamp)} />);
    extras.push(<TrackSegment key="drawn" s0={1450} s1={2350} color="#ffffff" r={7} y={6} progress={interpolate(t, [47.4, 49.4], [0, 1], clamp)} />);
    [1550, 1760, 1980, 2200].forEach((s, i) => extras.push(<Tower key={`pt${i}`} pos={towerAt(s, i % 2 ? 70 : -70)} scale={3} active={false} />));
  }
  if (id === "routes" || id === "size") {
    extras.push(<Routes key="routes" progress={(i) => interpolate(t, [50.0 + (i % 12) * 0.15, 52.0 + (i % 12) * 0.15], [0, 1], clamp)} count={42} />);
    extras.push(<TrackGlow key="tg" progress={interpolate(t, [50.2, 52.4], [0, 1], clamp)} />);
  }
  if (id === "mapTrack") {
    [T_MAP_A, T_MAP_B, ...T_OFF].forEach((p, i) => extras.push(<Tower key={`mt${i}`} pos={p} scale={3} active={(i === 0 && t >= 59 && t < 63) || (i === 1 && t >= 63)} />));
    extras.push(<MapMarker key="mk" s={markerS} />);
    if (t >= 59) extras.push(<CoverageRing key="ra" pos={T_MAP_A} r={155} color="#F97316" active={t < 63} />);
    if (t >= 63) extras.push(<CoverageRing key="rb" pos={T_MAP_B} r={155} color="#3B82F6" active />);
    if (t >= 61 && t < 63) extras.push(<TrackSegment key="sa" s0={2570} s1={2770} color="#FFC93C" r={8} y={7} progress={interpolate(t, [61, 61.8], [0, 1], clamp)} />);
    if (t >= 63) extras.push(<TrackSegment key="sb" s0={2750} s1={2950} color="#FFC93C" r={8} y={7} progress={interpolate(t, [63, 63.8], [0, 1], clamp)} />);
  }
  if (id === "mapStation") {
    const cols = ["#FFC93C", "#FF5C8A", "#3B82F6", "#22c55e", "#F97316", "#A855F7", "#22d3ee"];
    T_STATION.forEach((p, i) => {
      const s = interpolate(t, [65.6 + i * 0.15, 66.0 + i * 0.15], [0.001, 1], clamp);
      extras.push(
        <group key={`st${i}`} scale={[1, s, 1]}>
          <Tower pos={p} scale={2.6} active />
        </group>,
      );
      if (s > 0.5) extras.push(<CoverageRing key={`sr${i}`} pos={p} r={85} color={cols[i]} active={false} />);
    });
    extras.push(<MapMarker key="mk" s={markerS} />);
  }
  if (id === "mapDelay") {
    extras.push(<MapMarker key="mk" s={markerS} />);
    if (t >= 74.6) extras.push(<MapMarker key="ghost" s={3170} color="#ffffff" size={0.8} />);
    if (t >= 76) extras.push(<TrackSegment key="red" s0={markerS + 40} s1={3150} color="#FF4D4D" r={7} y={7} progress={interpolate(t, [76, 76.8], [0, 1], clamp)} />);
    [2980, 3120].forEach((s, i) => extras.push(<Tower key={`dt${i}`} pos={towerAt(s, i ? 90 : -90)} scale={3} active={false} />));
  }

  /* ---------- anchored labels ---------- */
  const anchored: React.ReactNode[] = [];
  if (id === "towerRow" || id === "drone") {
    const ids = ["21433", "21447", "21425"];
    const cols = ["#60A5FA", "#C084FC", PNK];
    T_ROW.forEach((p, i) => {
      const s = at3D(cam, up(p, 52));
      if (!s.visible) return;
      const start = id === "towerRow" ? 33.6 + i * 0.25 : 91.6 + i * 0.4;
      anchored.push(
        <Place key={`id${i}`} t={t} at={start} to={shot.to} x={s.x} y={s.y}>
          <GChip color={cols[i]} size={26} icon={<TowerIcon size={28} color={cols[i]} />}>
            ID {ids[i]}
          </GChip>
        </Place>,
      );
    });
  }
  if (id === "mapTrack") {
    if (t >= 58 && t < 59.6) {
      T_OFF.forEach((p, i) => {
        const s = at3D(cam, up(p, 30));
        anchored.push(
          <Place key={`x${i}`} t={t} at={58 + i * 0.12} to={59.6} x={s.x} y={s.y}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <CrossIcon size={64} color={C.red} />
              <GChip color={C.red} size={22}>
                YAHAN?
              </GChip>
            </div>
          </Place>,
        );
      });
    }
    const towerP = at3D(cam, up(t < 63 ? T_MAP_A : T_MAP_B, 120));
    anchored.push(
      <Place key="serve" t={t} at={59.2} to={65} x={towerP.x} y={towerP.y}>
        <GChip color={t < 63 ? "#F97316" : "#3B82F6"} size={28} icon={<TowerIcon size={30} color={t < 63 ? "#F97316" : "#3B82F6"} />}>
          SERVING · ID {t < 63 ? "21465" : "21481"}
        </GChip>
      </Place>,
    );
    const edge = at3D(cam, T_MAP_A.clone().add(V(0, 0, 160)));
    anchored.push(
      <Place key="area" t={t} at={60.4} to={63} x={edge.x} y={edge.y + 40}>
        <GChip color="#F97316" size={24}>
          TOWER AREA · KAI KM
        </GChip>
      </Place>,
    );
    const mk = at3D(cam, up(poseAt(markerS).p, 20));
    anchored.push(
      <Place key="here" t={t} at={62} to={65} x={mk.x + 150} y={mk.y - 60}>
        <GChip color={YEL} size={26} icon={<TrainGlyph size={28} color={YEL} />}>
          TRAIN YAHAN KAHIN
        </GChip>
      </Place>,
    );
  }
  if (id === "mapStation") {
    const s = at3D(cam, up(ST_CENTER, 40));
    anchored.push(
      <Place key="stn" t={t} at={65.3} to={70} x={s.x} y={s.y - 40}>
        <div style={{ padding: "12px 26px", borderRadius: 16, background: "#FFD400", border: "5px solid #111", fontFamily: FONT, fontWeight: 800, fontSize: 38, color: "#111" }}>BARDHAMAN JN</div>
      </Place>,
    );
  }
  if (id === "mapDelay") {
    const a = at3D(cam, up(poseAt(markerS).p, 20));
    const b = at3D(cam, up(poseAt(3170).p, 20));
    anchored.push(
      <Place key="abhi" t={t} at={74.4} to={81} x={a.x - 170} y={a.y} anchor="center">
        <GChip color={YEL} size={26} icon={<TrainGlyph size={28} color={YEL} />}>
          ABHI YAHAN
        </GChip>
      </Place>,
    );
    anchored.push(
      <Place key="honi" t={t} at={75.2} to={81} x={b.x + 30} y={b.y - 70}>
        <GChip color="#ffffff" size={24}>
          HONI CHAHIYE THI
        </GChip>
      </Place>,
    );
    const late = t < 77 ? "12 min late" : "18 min late";
    anchored.push(
      <Place key={`late${late}`} t={t} at={t < 77 ? 76.2 : 77.0} to={t < 77 ? 77.0 : 78.2} x={W / 2} y={1330}>
        <div style={{ padding: "18px 38px", borderRadius: 999, background: C.red, color: "#fff", fontFamily: FONT, fontWeight: 800, fontSize: 52, boxShadow: "0 14px 40px rgba(255,77,77,0.5)" }}>{late}</div>
      </Place>,
    );
  }

  const blur = shot.blur ?? 0;
  const dim = shot.dim ?? 0;

  return (
    <AbsoluteFill style={{ background: "#8FD3FF" }}>
      <div style={{ position: "absolute", inset: 0, filter: blur ? `blur(${blur}px)` : undefined, scale: blur ? 1.04 : 1 }}>
        <World3D
          cam={cam}
          head={head}
          shadowFocus={focus}
          shadowSize={shot.shadow ?? 140}
          fogFar={shot.fog ?? 2600}
          coaches={id.startsWith("map") || id === "plot" ? 0 : 10}
          showTrain={!(id === "routes" || id === "size" || id === "plot")}
        >
          {extras}
        </World3D>
      </div>
      {dim ? <div style={{ position: "absolute", inset: 0, background: `rgba(10,20,38,${dim})` }} /> : null}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 700, background: "linear-gradient(180deg, rgba(8,16,30,0.55), rgba(8,16,30,0))" }} />

      {anchored}

      {/* ---------- UI overlays ---------- */}
      <Place t={t} at={0.1} to={3} x={W / 2} y={190}>
        <GChip color={YEL} size={24} icon={<TrainGlyph size={26} color={YEL} />}>
          TRAIN MEIN...
        </GChip>
      </Place>
      <Place t={t} at={1.2} to={3} x={330} y={1250}>
        <GChip color={PNK} size={32}>
          DATA: 0 MB
        </GChip>
      </Place>
      <Place t={t} at={2.1} to={3} x={620} y={1360}>
        <GChip color={PNK} size={32} icon={<CrossIcon size={32} color={PNK} />}>
          NO INTERNET
        </GChip>
      </Place>
      <Place t={t} at={3.3} to={8.4} x={W / 2} y={1050}>
        <AppCard t={t} />
      </Place>
      {vis(t, 10.0, 11.0) > 0 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 820, textAlign: "center", fontFamily: FONT, fontWeight: 800, fontSize: 300, color: YEL, textShadow: "0 10px 40px rgba(0,0,0,0.5)", opacity: vis(t, 10.0, 11.0), rotate: `${Math.sin(t * 6) * 6}deg`, ...popStyle(pop(t, 10.0, 8)) }}>
          ?
        </div>
      ) : null}
      <Place t={t} at={11.8} to={14} x={W / 2} y={1330}>
        <IdCounter t={t} />
      </Place>
      <Place t={t} at={16.0} to={18} x={W / 2} y={1080}>
        <Battery t={t} />
      </Place>
      {vis(t, 19.0, 21.0) > 0 ? (
        <div
          style={{
            position: "absolute",
            left: W / 2 - 260,
            top: 900,
            width: 520,
            height: 520,
            borderRadius: "50%",
            border: `10px solid ${t < 20 ? "#FFC93C" : C.red}`,
            boxShadow: `0 0 60px ${t < 20 ? "rgba(255,201,60,0.6)" : "rgba(255,77,77,0.7)"}`,
            opacity: vis(t, 19.0, 21.0) * (0.6 + Math.sin(t * 9) * 0.4),
            scale: 0.9 + ((t * 1.2) % 1) * 0.2,
          }}
        />
      ) : null}
      <Place t={t} at={19.0} to={21} x={W / 2} y={1500}>
        <GChip color={t < 20 ? C.green : C.red} size={32}>
          COACH KE ANDAR · GPS: {t < 20 ? "OK" : "WEAK"}
        </GChip>
      </Place>
      <Place t={t} at={23.0} to={26} x={W / 2} y={1360}>
        <MeterCard t={t} />
      </Place>
      <Place t={t} at={24.2} to={26} x={W / 2} y={1130}>
        <GChip color={C.green} size={26} icon={<PinIcon size={28} color={C.green} />}>
          ~ KUCH KM
        </GChip>
      </Place>
      <Place t={t} at={28.3} to={33} x={260} y={1330}>
        <GChip color={C.red} size={28}>
          DATA OFF
        </GChip>
      </Place>
      <Place t={t} at={30.0} to={33} x={720} y={1330}>
        <GChip color={C.green} size={28}>
          SIGNAL ON
        </GChip>
      </Place>
      <Place t={t} at={30.3} to={33} x={W / 2} y={1430}>
        <GChip color="#60A5FA" size={26}>
          CALLS KE LIYE
        </GChip>
      </Place>
      <Place t={t} at={36.0} to={38} x={W / 2} y={1250}>
        <ServingCard t={t} />
      </Place>
      <Place t={t} at={39.2} to={41.6} x={W / 2} y={1150}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <GChip color="#60A5FA" size={34} icon={<TowerIcon size={36} color="#60A5FA" />}>
            ID 21433
          </GChip>
          <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 44, color: "#fff", letterSpacing: 4 }}>{t > 40 ? "----->" : "-----"}</span>
          <div style={{ width: 84, height: 84, borderRadius: 42, background: "rgba(255,201,60,0.25)", border: `4px solid ${YEL}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <PinIcon size={50} color={YEL} />
          </div>
        </div>
      </Place>
      <Place t={t} at={41.2} to={45.6} x={W / 2} y={660}>
        <GChip color="#C084FC" size={24}>
          FOUNDER + DOSTON KE PHONES
        </GChip>
      </Place>
      <Place t={t} at={41.6} to={45.8} x={W / 2} y={1090}>
        <LoggerCard t={t} />
      </Place>
      <Place t={t} at={53.6} to={56} x={W / 2} y={1050}>
        <SizeCard t={t} />
      </Place>
      <Place t={t} at={67.0} to={70} x={W / 2} y={1480}>
        <div style={{ display: "flex", gap: 18 }}>
          <GChip color={YEL} size={28} icon={<PinIcon size={30} color={YEL} />}>
            ± KUCH METER
          </GChip>
          <GChip color={C.green} size={28} icon={<CheckIcon size={30} />}>
            GPS JAISI
          </GChip>
        </div>
      </Place>
      <Place t={t} at={71.0} to={74} x={W / 2} y={1080}>
        <TimetableCard t={t} />
      </Place>
      <Place t={t} at={79.8} to={81} x={W / 2} y={1330}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <GChip color={C.green} size={28} icon={<CheckIcon size={30} />}>
            TUM ISI TRAIN MEIN
          </GChip>
          <GChip color={C.red} size={24}>
            Dusri train ka status? Internet chahiye
          </GChip>
        </div>
      </Place>
      {vis(t, 81.8, 83.0) > 0 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 820, textAlign: "center", fontFamily: FONT, fontWeight: 800, fontSize: 210, color: YEL, letterSpacing: -4, textShadow: `0 0 40px rgba(255,201,60,0.6), 6px 6px 0 ${PNK}`, opacity: vis(t, 81.8, 83.0), ...popStyle(pop(t, 81.8, 7)) }}>
          TWIST!
        </div>
      ) : null}
      <Place t={t} at={83.5} to={85} x={W / 2} y={1100}>
        <Avatars t={t} />
      </Place>
      {vis(t, 85.0, 87.6) > 0 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 840, textAlign: "center", fontFamily: FONT, fontWeight: 800, fontSize: 230, color: YEL, textShadow: "0 10px 40px rgba(0,0,0,0.5)", opacity: vis(t, 85.0, 87.6), ...popStyle(pop(t, 85.0, 9)) }}>
          2018
        </div>
      ) : null}
      <Place t={t} at={86.4} to={87.6} x={W / 2} y={1180}>
        <GChip color={YEL} size={30} icon={<CheckIcon size={32} color={YEL} />}>
          ACQUIRED · DEC 2018
        </GChip>
      </Place>
      <Place t={t} at={88.0} to={91} x={W / 2} y={1120}>
        <MapsCard t={t} />
      </Place>
      <Place t={t} at={98.8} to={102} x={W / 2} y={1080}>
        <CommentCard t={t} />
      </Place>
      <Place t={t} at={102.2} to={105.4} x={W / 2} y={1150}>
        <FollowCard t={t} />
      </Place>

      {HEADLINES.map((h, i) => (
        <TimedHeadline key={i} t={t} from={h.from} to={h.to} lines={h.lines} size={h.size} top={h.top} />
      ))}
      {vis(t, 103.0, 105.4) > 0 ? (
        <div style={{ position: "absolute", top: 480, left: 0, right: 0, textAlign: "center", fontFamily: FONT, fontWeight: 800, fontSize: 130, color: YEL, textShadow: "0 6px 30px rgba(0,0,0,0.55)", opacity: vis(t, 103.0, 105.4), ...popStyle(pop(t, 103.0, 9)) }}>
          FOLLOW <span style={{ color: "#fff" }}>karo!</span>
        </div>
      ) : null}

      {/* episode tag + progress bar like the original */}
      <div style={{ position: "absolute", top: 0, left: 0, height: 9, width: `${(frame / DAY_FRAMES) * 100}%`, background: "#F97316" }} />
      <div style={{ position: "absolute", top: 54, left: 50, padding: "8px 20px", borderRadius: 999, background: "rgba(10,20,38,0.5)", color: "#fff", fontFamily: FONT, fontWeight: 700, fontSize: 24, letterSpacing: 3 }}>EP 12 · TECH</div>
    </AbsoluteFill>
  );
};
