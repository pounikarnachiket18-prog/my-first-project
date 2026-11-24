import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Callout, Chip, EndCard, Title, blink, ip, project, useF } from "./overlay";
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
  const f = useF();
  const rearZ = 6 - 50 * ip(f, [20, 236], [0, 1], Easing.in(Easing.quad));
  const cam = lerp3([0.5, 2.3, 24], [0.3, 2.5, 18], ip(f, [0, 236], [0, 1]));
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
      <Callout
        a={project([0, LAMP_Y, rearZ + 0.1], { pos: cam, look: [0, 2.6, -40], fov: 42 })}
        lx={640}
        ly={1330}
        text="Tail lamp"
        sub="raat mein blink"
        color="#FF4B5C"
        dark
        from={40}
        to={226}
      />
    </AbsoluteFill>
  );
};

/* 2. Day reveal — X, LV board, lamp */
const DR_CAM = { pos: [0.15, 2.75, 11.5] as V3, look: [0, 2.7, 0] as V3, fov: 40 };
export const DayReveal: React.FC = () => {
  const f = useF();
  const cam = lerp3([1.2, 2.5, 30], [0.15, 2.75, 11.5], ip(f, [0, 26], [0, 1]));
  return (
    <AbsoluteFill>
      <Stage
        render={(tex) => (
          <>
            <CameraRig pos={cam} look={[0, 2.7, 0]} fov={40} />
            <StationSet tex={tex} boards={[-40]} />
            <Train rearZ={0} coaches={8} tex={tex} lamp={blink(f) * 0.9} />
            <Ring position={[0, X_Y, 0.08]} r={1.0} progress={ip(f, [18, 30], [0, 1]) * ip(f, [100, 108], [1, 0])} />
            <Ring
              position={[LV_POS.x, LV_POS.y, 0.08]}
              r={0.36}
              width={0.05}
              progress={ip(f, [44, 56], [0, 1]) * ip(f, [108, 116], [1, 0]) + ip(f, [176, 188], [0, 1])}
            />
            <Ring position={[0, LAMP_Y, 0.2]} r={0.3} width={0.045} progress={ip(f, [74, 86], [0, 1]) * ip(f, [124, 130], [1, 0])} />
          </>
        )}
      />
      <Title text="Ye **X** kyun?" from={6} />
      <Callout a={project([0.36, 3.45, 0.1], DR_CAM)} lx={620} ly={480} text="Bada X" sub="peela, door se dikhe" color="#C99A00" from={20} to={287} />
      <Callout a={project([LV_POS.x, LV_POS.y, 0.1], DR_CAM)} lx={700} ly={1520} text="LV board" sub="Last Vehicle" color={UI.red} from={46} to={287} />
      <Callout a={project([0, LAMP_Y, 0.2], DR_CAM)} lx={430} ly={1700} side="left" text="Tail lamp" sub="blink karti batti" color={UI.blue} from={76} to={287} />
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
  const f = useF();
  const v = 0.32;
  const SPLIT = 135;
  // rear part: constant speed, then brakes to a stop after the split
  const tb = Math.max(0, f - SPLIT);
  const brake = Math.min(tb, 110);
  const rearZ = 70 - v * Math.min(f, SPLIT) - (v * brake - (v / 220) * brake * brake);
  // front part keeps going (slightly faster)
  const frontZ = 70 - v * f - 0.0025 * tb * tb;
  const gap = rearZ - frontZ;
  const coupling = rearZ - 3 * PITCH + 0.3;
  const mid = coupling - gap / 2;
  const target: V3 = [0, 2, mid + (rearZ - 1.3 * PITCH - mid) * ip(f, [165, 275], [0, 1])];
  const { pos, look } = isoCam(target);
  const zoom = interpolate(f, [0, 125, 245, 290], [40, 40, 21, 19], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
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
            <Ring position={[0, 2.5, coupling - gap / 2]} r={5} width={0.45} billboard progress={ip(f, [128, 140], [0, 1]) * ip(f, [228, 236], [1, 0])} />
          </>
        )}
      />
      <Title text="Sirf aakhri dabba **kyun?**" from={6} top={200} hi={UI.blue} />
      <Chip text="coupling khula" x={540} y={760} from={135} to={225} />
      <Callout
        a={project([0, 2.6, rearZ - 0.5], { pos, look, zoom })}
        lx={560}
        ly={1330}
        text="Aakhri dabba"
        sub="X ke saath — ruk gaya"
        color={UI.red}
        from={222}
        to={290}
      />
      <Chip text="peeche ke dabbe ruk gaye" x={540} y={1530} from={218} to={290} kind="white" />
    </AbsoluteFill>
  );
};

/* 4a. Station master watches the last coach (day) */
const SM_POS: V3 = [3.9, 1.05, -4];
const SC_CAM = { pos: [6.8, 2.7, 6] as V3, look: [0.5, 2.0, -40] as V3, fov: 44 };
export const StationCheckDay: React.FC = () => {
  const f = useF();
  const rearZ = 55 - 0.62 * f;
  const p = ip(f, [10, 60], [0, 1]);
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
      <Title text="Station master ki **nazar**" from={6} plate />
      <Chip text="Mindset Mode | Explainers" x={540} y={1500} from={4} to={48} kind="white" />
      <Callout a={project([SM_POS[0], 2.95, SM_POS[2]], SC_CAM)} lx={400} ly={640} text="Station master" sub="har train dekhta hai" color={UI.blue} from={49} to={179} />
      <Callout a={project([6.2, 5.0, -30], SC_CAM)} lx={1000} ly={1000} side="left" text="Dhonipur" sub="station" color="#C99A00" from={70} to={179} />
      <Chip text="aakhri dabba dekha ✓" x={540} y={1500} from={112} to={179} kind="green" />
    </AbsoluteFill>
  );
};

/* 4b. Same check at night */
export const StationCheckNight: React.FC = () => {
  const f = useF();
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
      <Title text={"Din mein **X**,\nraat mein **batti**"} dark hi="#FF4B5C" from={4} />
      <Callout a={project([0, LAMP_Y, rearZ + 0.1], SC_CAM)} lx={660} ly={1260} text="Laal batti" sub="blink = aakhri dabba" color="#FF4B5C" dark from={62} to={138} />
    </AbsoluteFill>
  );
};

/* 5. The verdict — mark seen / not seen */
const Verdict: React.FC<{ ok: boolean; dur: number }> = ({ ok, dur }) => {
  const f = useF();
  const rearZ = 25 - 0.55 * f;
  const smZ = 0;
  const { pos, look } = isoCam([-2, 2, 6]);
  const VCAM = { pos, look, zoom: 30 };
  const zoneP = ip(f, [80, 100], [0, 1]);
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
            <Signal position={[2.8, 0, 22]} state={ok && f > 84 ? "green" : "red"} tex={tex} scale={1.3} />
            <Badge tex={ok ? tex.ok : tex.no} position={[-4.2, 9.5, smZ]} size={4.2} p={ip(f, [46, 58], [0, 1], Easing.out(Easing.back(2)))} />
            {ok && <Ring position={[0, 2.7, rearZ]} r={3.2} width={0.32} billboard progress={ip(f, [28, 40], [0, 1]) * ip(f, [70, 78], [1, 0])} />}
          </>
        )}
      />
      <Title text="Station master ka **faisla**" from={4} to={58} top={180} hi={UI.blue} />
      <Title
        text={ok ? "Nishaan dikha =\nline **khaali**" : "Nishaan nahi =\nline **band**"}
        hi={ok ? UI.green : UI.red}
        from={60}
        top={180}
      />
      <Chip
        text={ok ? "train poori aayi" : "nishaan nahi dikha"}
        x={540}
        y={1100}
        from={48}
        to={dur}
        kind={ok ? "green" : "red"}
      />
      <Callout a={project([-4.2, 5.2, 0], VCAM)} lx={620} ly={620} text="Station master" sub="aakhri dabba check" color={UI.blue} from={10} to={46} />
      <Callout
        a={project([0, 0.6, 26], VCAM)}
        lx={560}
        ly={1420}
        side="left"
        text={ok ? "Peeche ki line" : "Peeche ki line"}
        sub={ok ? "khaali ✓ agli train bhejo" : "band ✕ agli train roko"}
        color={ok ? UI.green : UI.red}
        from={84}
        to={dur}
      />
      <Callout
        a={project([2.8, 6.2, 22], VCAM)}
        lx={1000}
        ly={1650}
        side="left"
        text="Signal"
        sub={ok ? "green" : "red"}
        color={ok ? UI.green : UI.red}
        from={100}
        to={dur}
      />
    </AbsoluteFill>
  );
};
export const VerdictOk: React.FC = () => <Verdict ok dur={171} />;
export const VerdictNo: React.FC = () => <Verdict ok={false} dur={142} />;

/* 6. Outro */
export const Outro: React.FC = () => {
  const f = useF();
  const rearZ = -6 - 70 * ip(f, [0, 162], [0, 1], Easing.in(Easing.quad));
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
      <Title text={"Ek chhota **X**,\npoori line ki safety."} dark hi={UI.yellow} from={6} to={100} />
      <EndCard from={100} />
    </AbsoluteFill>
  );
};
