import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Captions, Chip, EndCard, Title, blink, ip } from "./overlay";
import { Tex, useFontsReady, useTextures } from "./textures";
import { UI } from "./theme";
import {
  Badge,
  CameraRig,
  Ground,
  Hut,
  LAMP_Y,
  LV_POS,
  OHE,
  PITCH,
  Platform,
  Ring,
  Signal,
  Sky,
  StationBoard,
  StationMaster,
  Track,
  Train,
  X_Y,
  Zone,
} from "./world";

type V3 = [number, number, number];

const Stage: React.FC<{ ortho?: boolean; render: (tex: Tex) => React.ReactNode }> = ({ ortho, render }) => {
  const { width, height } = useVideoConfig();
  const ready = useFontsReady();
  const tex = useTextures(ready);
  return (
    <ThreeCanvas
      width={width}
      height={height}
      orthographic={ortho}
      camera={ortho ? { near: 0.1, far: 3000, zoom: 12, position: [-100, 115, 100] } : { fov: 40, near: 0.1, far: 900, position: [0, 3, 20] }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
    >
      {tex ? render(tex) : null}
    </ThreeCanvas>
  );
};

const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Station world used by the "on the ground" shots */
const StationSet: React.FC<{ tex: Tex; night?: boolean; boards?: number[] }> = ({ tex, night, boards }) => (
  <>
    <Sky night={night} fogNear={night ? 30 : 70} fogFar={night ? 170 : 300} />
    <Ground night={night} />
    <Track night={night} />
    <Track x={-5.6} night={night} />
    <OHE night={night} />
    <Platform tex={tex} night={night} boards={boards} />
  </>
);

/* 1. Night hook — the blinking red lamp */
export const NightHook: React.FC = () => {
  const f = useCurrentFrame();
  const rearZ = 6 - 50 * ip(f, [20, 190], [0, 1], Easing.in(Easing.quad));
  const cam = lerp3([0.5, 2.3, 24], [0.3, 2.5, 18], ip(f, [0, 190], [0, 1]));
  return (
    <AbsoluteFill>
      <Stage
        render={(tex) => (
          <>
            <CameraRig pos={cam} look={[0, 2.6, -40]} fov={42} />
            <StationSet tex={tex} night boards={[-24, -120]} />
            <Train rearZ={rearZ} coaches={7} tex={tex} lamp={blink(f)} night />
          </>
        )}
      />
      <Title text="Ye **laal batti** kyun?" dark hi="#FF4B5C" from={8} />
      <Captions
        lines={[
          { from: 0, to: 96, text: "Raat ko har train ke peeche ek **laal batti** blink karti hai." },
          { from: 96, to: 190, text: "Aur din mein dikhta hai ek bada **X**." },
        ]}
      />
    </AbsoluteFill>
  );
};

/* 2. Day reveal — X, LV board, lamp */
export const DayReveal: React.FC = () => {
  const f = useCurrentFrame();
  const cam = lerp3([1.2, 2.5, 30], [0.15, 2.75, 11.5], ip(f, [0, 120], [0, 1]));
  return (
    <AbsoluteFill>
      <Stage
        render={(tex) => (
          <>
            <CameraRig pos={cam} look={[0, 2.7, 0]} fov={40} />
            <StationSet tex={tex} boards={[-40]} />
            <Train rearZ={0} coaches={8} tex={tex} lamp={blink(f) * 0.9} />
            <Ring position={[0, X_Y, 0.08]} r={1.0} progress={ip(f, [40, 52], [0, 1]) * ip(f, [118, 126], [1, 0])} />
            <Ring
              position={[LV_POS.x, LV_POS.y, 0.08]}
              r={0.36}
              width={0.05}
              progress={ip(f, [126, 138], [0, 1]) * ip(f, [186, 194], [1, 0]) + ip(f, [246, 258], [0, 1])}
            />
            <Ring position={[0, LAMP_Y, 0.2]} r={0.3} width={0.045} progress={ip(f, [194, 206], [0, 1]) * ip(f, [240, 246], [1, 0])} />
          </>
        )}
      />
      <Title text="Ye **X** kyun?" from={6} />
      <Chip text="Bada X" x={540} y={1330} from={44} to={124} />
      <Chip text="Laal LV board" x={540} y={1330} from={128} to={192} />
      <Chip text="Blink karti batti" x={540} y={1330} from={196} to={246} />
      <Chip text="LV = Last Vehicle" x={540} y={1330} from={250} to={310} kind="white" />
      <Captions
        lines={[
          { from: 0, to: 196, text: "Ye **X**, ye laal **LV board** aur ye **batti** — teeno railway staff ke liye hain." },
          { from: 196, to: 310, text: "**LV** matlab **Last Vehicle** — yaani train ka aakhri dabba." },
        ]}
        y={1460}
      />
    </AbsoluteFill>
  );
};

/* Isometric helpers */
const ISO_OFF: V3 = [-100, 115, 100];
const isoCam = (target: V3): { pos: V3; look: V3 } => ({
  pos: [target[0] + ISO_OFF[0], target[1] + ISO_OFF[1], target[2] + ISO_OFF[2]],
  look: target,
});

const IsoSet: React.FC<{ tex: Tex }> = ({ tex }) => (
  <>
    <Sky fogNear={400} fogFar={900} />
    <Ground />
    <Track from={260} to={-520} />
  </>
);

/* 3. Why only the last coach — the coupling story */
export const WhyLast: React.FC = () => {
  const f = useCurrentFrame();
  const v = 0.32;
  const SPLIT = 120;
  // rear part: constant speed, then brakes to a stop after the split
  const tb = Math.max(0, f - SPLIT);
  const brake = Math.min(tb, 80);
  const rearZ = 70 - v * Math.min(f, SPLIT) - (v * brake - (v / 160) * brake * brake);
  // front part keeps going (slightly faster)
  const frontZ = 70 - v * f - 0.0025 * tb * tb;
  const gap = rearZ - frontZ;
  const coupling = rearZ - 3 * PITCH + 0.3;
  const mid = coupling - gap / 2;
  const target: V3 = [0, 2, mid + (rearZ - 1.3 * PITCH - mid) * ip(f, [150, 280], [0, 1])];
  const { pos, look } = isoCam(target);
  const zoom = interpolate(f, [0, 110, 260, 370], [40, 40, 21, 19], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  return (
    <AbsoluteFill>
      <Stage
        ortho
        render={(tex) => (
          <>
            <CameraRig pos={pos} look={look} zoom={zoom} />
            <IsoSet tex={tex} />
            <Hut position={[-14, 0, 92]} />
            <StationBoard tex={tex.prevBoard} position={[-8, 4, 82]} rotY={-Math.PI / 4} scale={1.6} />
            <Train rearZ={rearZ} coaches={7} tex={tex} lamp={blink(f)} detach={{ at: 3, gap }} lowDetail />
            <Signal position={[-3, 0, -40]} state="green" tex={tex} />
            <Ring position={[0, 2.5, coupling - gap / 2]} r={5} width={0.45} billboard progress={ip(f, [112, 124], [0, 1]) * ip(f, [214, 222], [1, 0])} />
          </>
        )}
      />
      <Title text="Sirf aakhri dabba **kyun?**" from={6} top={200} hi={UI.blue} />
      <Chip text="coupling khula" x={540} y={760} from={120} to={220} />
      <Chip text="peeche ke dabbe ruk gaye" x={540} y={1280} from={226} to={370} kind="white" />
      <Captions
        lines={[
          { from: 0, to: 150, text: "Kabhi-kabhi do dabbon ke beech ka **coupling** khul jaata hai." },
          { from: 150, to: 370, text: "Engine aage nikal jaata hai, aur **peeche ke dabbe** raste mein hi ruk jaate hain." },
        ]}
      />
    </AbsoluteFill>
  );
};

/* 4a. Station master watches the last coach (day) */
const SM_POS: V3 = [3.9, 1.05, -4];
export const StationCheckDay: React.FC = () => {
  const f = useCurrentFrame();
  const rearZ = 55 - 0.62 * f;
  const p = ip(f, [24, 84], [0, 1]);
  return (
    <AbsoluteFill>
      <Stage
        render={(tex) => (
          <>
            <CameraRig pos={lerp3([7.6, 2.3, -8], [6.8, 2.7, 6], p)} look={lerp3([0, 2.1, -14], [0.5, 2.0, -40], p)} fov={44} />
            <StationSet tex={tex} boards={[-30, -110]} />
            <StationMaster position={SM_POS} rotY={-Math.PI / 2} />
            <Train rearZ={rearZ} coaches={8} tex={tex} lamp={blink(f) * 0.9} />
          </>
        )}
      />
      <Chip text="Mindset Mode | Explainers" x={540} y={330} from={4} to={60} kind="white" />
      <Chip text="station master" x={760} y={1180} from={62} to={100} kind="white" />
      <Chip text="aakhri dabba dekha ✓" x={700} y={1180} from={102} to={190} kind="green" />
      <Captions
        lines={[{ from: 0, to: 190, text: "Isliye har station par **station master** har guzarti train ka **aakhri dabba** dekhta hai." }]}
      />
    </AbsoluteFill>
  );
};

/* 4b. Same check at night */
export const StationCheckNight: React.FC = () => {
  const f = useCurrentFrame();
  const rearZ = -8 - 0.5 * f;
  return (
    <AbsoluteFill>
      <Stage
        render={(tex) => (
          <>
            <CameraRig pos={[6.8, 2.7, 6]} look={[0.5, 2.0, -40]} fov={44} />
            <StationSet tex={tex} night boards={[-30, -110]} />
            <StationMaster position={SM_POS} rotY={-Math.PI / 2} />
            <Train rearZ={rearZ} coaches={8} tex={tex} lamp={blink(f)} night />
          </>
        )}
      />
      <Chip text="Din mein: X + LV board" x={540} y={330} from={4} to={66} kind="white" />
      <Chip text="Raat mein: blink karti batti" x={540} y={330} from={70} to={140} kind="white" />
      <Captions lines={[{ from: 0, to: 140, text: "Din mein **X + LV board**, raat mein **blink karti laal batti**." }]} />
    </AbsoluteFill>
  );
};

/* 5. The verdict — mark seen / not seen */
const Verdict: React.FC<{ ok: boolean }> = ({ ok }) => {
  const f = useCurrentFrame();
  const rearZ = 50 - 0.5 * f;
  const smZ = 0;
  const { pos, look } = isoCam([-2, 2, 6]);
  const zoneP = ip(f, [118, 140], [0, 1]);
  return (
    <AbsoluteFill>
      <Stage
        ortho
        render={(tex) => (
          <>
            <CameraRig pos={pos} look={look} zoom={30} />
            <IsoSet tex={tex} />
            <Hut position={[-11, 0, smZ - 2]} />
            <mesh position={[-4.6, 0.5, smZ]}>
              <boxGeometry args={[4, 1, 30]} />
              <meshStandardMaterial color="#F4F5F7" />
            </mesh>
            <StationBoard tex={tex.board} position={[-5.5, 4.6, smZ + 13]} rotY={-Math.PI / 4} scale={1.2} />
            <StationMaster position={[-4.2, 1, smZ]} rotY={Math.PI / 2} scale={2.2} />
            <Train
              rearZ={rearZ}
              coaches={ok ? 6 : 3}
              tex={tex}
              rear={ok ? "mark" : "plain"}
              lamp={ok ? blink(f) : 0}
              lowDetail
            />
            <Zone z1={7} z2={52} color={ok ? "#1E8A4C" : "#C8283B"} opacity={zoneP} width={4.6} />
            <Signal position={[2.8, 0, 32]} state={ok && f > 128 ? "green" : "red"} tex={tex} scale={1.3} />
            <Badge tex={ok ? tex.ok : tex.no} position={[-4.2, 9.5, smZ]} size={4.2} p={ip(f, [104, 116], [0, 1], Easing.out(Easing.back(2)))} />
            {ok && <Ring position={[0, 2.7, rearZ]} r={3.2} width={0.32} billboard progress={ip(f, [84, 96], [0, 1]) * ip(f, [124, 132], [1, 0])} />}
          </>
        )}
      />
      <Title
        text={ok ? "Nishaan dikha =\nline **khaali**" : "Nishaan nahi =\nline **band**"}
        hi={ok ? UI.green : UI.red}
        from={120}
        top={180}
      />
      <Chip
        text={ok ? "train poori aayi" : "nishaan nahi dikha"}
        x={540}
        y={1100}
        from={108}
        to={190}
        kind={ok ? "green" : "red"}
      />
      <Chip text={ok ? "line khaali hai" : "peeche ki line band"} x={540} y={1240} from={134} to={190} kind={ok ? "blue" : "red"} />
      <Captions
        lines={[
          ok
            ? { from: 0, to: 190, text: "Nishaan dikha, matlab **poori train** aa gayi — peeche ki line **khaali** hai." }
            : { from: 0, to: 190, text: "Nishaan nahi dikha, toh peeche ki line **band** — agli train roki jaati hai." },
        ]}
      />
    </AbsoluteFill>
  );
};
export const VerdictOk: React.FC = () => <Verdict ok />;
export const VerdictNo: React.FC = () => <Verdict ok={false} />;

/* 6. Outro */
export const Outro: React.FC = () => {
  const f = useCurrentFrame();
  const rearZ = -6 - 70 * ip(f, [0, 210], [0, 1], Easing.in(Easing.quad));
  return (
    <AbsoluteFill>
      <Stage
        render={(tex) => (
          <>
            <CameraRig pos={[4.5, 3.2, 16]} look={[0.5, 2.6, -40]} fov={44} />
            <StationSet tex={tex} night boards={[-24, -90]} />
            <StationMaster position={[3.9, 1.05, 6]} rotY={-Math.PI / 2} />
            <Train rearZ={rearZ} coaches={8} tex={tex} lamp={blink(f)} night />
          </>
        )}
      />
      <Title text={"Ek chhota **X**,\npoori line ki safety."} dark hi={UI.yellow} from={6} to={112} />
      <Captions lines={[{ from: 0, to: 112, text: "Agli baar ye **X** dikhe, toh yaad rakhna — ye **safety ka signal** hai." }]} />
      <EndCard from={112} />
    </AbsoluteFill>
  );
};
