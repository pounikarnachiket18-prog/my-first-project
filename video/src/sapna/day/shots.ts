import * as THREE from "three";
import { Cam, STATION, localToWorld, offsetFrom, poseAt, vehicleCenterS } from "../three/track";

/** Every shot of the day reel, keyed to the voice timeline (seconds of the original reel). */

export type Shot = {
  id: string;
  from: number;
  to: number;
  cam: (u: number) => Cam;
  head: (u: number) => number;
  focus?: (u: number) => THREE.Vector3;
  shadow?: number;
  fog?: number;
  blur?: number;
  dim?: number;
};

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const ease = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t));
const mid = (head: number, i = 4) => poseAt(vehicleCenterS(head, i));
export const towerAt = (s: number, side: number) => {
  const p = poseAt(s);
  return p.p.clone().addScaledVector(p.side, side);
};

/* Tower layout used across the explainer shots */
export const T_HERO = towerAt(2300, -45);
export const T_ROW = [towerAt(2560, 60), towerAt(2660, -65), towerAt(2780, 58)];
export const T_MAP_A = towerAt(2650, -80);
export const T_MAP_B = towerAt(2830, 85);
export const T_OFF = [towerAt(2560, 140), towerAt(2700, 170), towerAt(2860, -150)];
const ST = V(STATION.x, 0, (STATION.zStart + STATION.zEnd) / 2);
export const T_STATION = new Array(7).fill(0).map((_, i) => {
  const a = (i / 7) * Math.PI * 2 + 0.3;
  const r = 70 + (i % 3) * 30;
  return V(ST.x + Math.cos(a) * r, 0, ST.z + Math.sin(a) * r);
});
export const ST_CENTER = ST;

const mapCam = (center: THREE.Vector3, height: number, back: number, u: number, drift = 0): Cam => ({
  pos: V(center.x - 40 - drift * u, height, center.z + back),
  look: V(center.x, 0, center.z - 20),
  fov: 50,
});

export const SHOTS: Shot[] = [
  // Data khatam, internet band! — train charges at a low trackside camera
  {
    id: "charge",
    from: 0,
    to: 2,
    head: (u) => 700 + u * 96,
    cam: (u) => {
      const c = poseAt(905);
      return { pos: offsetFrom(c, 0, 2.4, -6.5), look: offsetFrom(poseAt(700 + u * 96 - 10), 0, 3.2, 0), fov: 44 };
    },
    focus: () => poseAt(860).p,
    shadow: 90,
  },
  {
    id: "whoosh",
    from: 2,
    to: 3,
    head: (u) => 1000 + u * 32,
    cam: () => {
      const c = poseAt(905);
      return { pos: offsetFrom(c, 0, 3.2, -9), look: offsetFrom(c, 6, 3, 0), fov: 52 };
    },
    focus: () => poseAt(905).p,
    shadow: 60,
  },
  // Phir bhi... app still shows the live status
  {
    id: "track34",
    from: 3,
    to: 8.5,
    head: (u) => 1060 + u * 28,
    cam: (u) => {
      const f = mid(1060 + u * 28, 3);
      return { pos: offsetFrom(f, 45 - u * 2, 20, -48), look: offsetFrom(f, 5, 2, 0), fov: 50 };
    },
    focus: (u) => mid(1060 + u * 28, 3).p,
    shadow: 140,
  },
  // Bina internet... pata kaise chala?
  {
    id: "overtrack",
    from: 8.5,
    to: 11,
    head: (u) => 1230 + u * 28,
    cam: (u) => {
      const h = 1230 + u * 28;
      return { pos: offsetFrom(poseAt(h + 170), 0, 70, -35), look: offsetFrom(poseAt(h - 30), 0, 0, 0), fov: 48 };
    },
    focus: (u) => poseAt(1230 + u * 28 + 60).p,
    shadow: 220,
  },
  // Jawab: ek chhupa hua number!
  {
    id: "towerReveal",
    from: 11,
    to: 14,
    head: (u) => 2150 + u * 28,
    cam: (u) => {
      const t = T_HERO;
      const p = poseAt(2300);
      return {
        pos: t.clone().addScaledVector(p.side, -60).addScaledVector(p.fwd, -40 + u * 6).add(V(0, 7, 0)),
        look: t.clone().add(V(0, 22, 0)),
        fov: 52,
      };
    },
    focus: () => T_HERO,
    shadow: 120,
  },
  // Pehla guess: GPS? GPS = battery khaata!
  {
    id: "satellite",
    from: 14,
    to: 18,
    head: (u) => 1540 + u * 27,
    cam: () => {
      const at = poseAt(1700);
      return { pos: at.p.clone().addScaledVector(at.side, 55).add(V(0, 3, 0)), look: at.p.clone().addScaledVector(at.fwd, -60).add(V(0, 85, 0)), fov: 62 };
    },
    focus: () => poseAt(1700).p,
    shadow: 120,
  },
  // Metal body: signal kamzor!
  {
    id: "coachSide",
    from: 18,
    to: 21,
    head: (u) => 1900 + u * 26,
    cam: (u) => {
      const h = 1900 + u * 26;
      return { pos: localToWorld(h, 4, [-2 + u * 0.6, 3.2, -8.5]), look: localToWorld(h, 4, [1, 2.7, 0]), fov: 50 };
    },
    focus: (u) => mid(1900 + u * 26).p,
    shadow: 50,
  },
  // Founder ka logic: meter-level nahi, kuch km kaafi
  {
    id: "founder",
    from: 21,
    to: 26,
    head: (u) => 1990 + u * 28,
    cam: (u) => {
      const f = mid(1990 + u * 28, 4);
      return { pos: offsetFrom(f, -120 + u * 6, 95, -95), look: offsetFrom(f, 10, 0, 0), fov: 50 };
    },
    focus: (u) => mid(1990 + u * 28, 4).p,
    shadow: 260,
  },
  // Raaz: mobile tower!
  {
    id: "towerHero",
    from: 26,
    to: 28,
    head: () => 1500,
    cam: (u) => {
      const p = poseAt(2300);
      return { pos: T_HERO.clone().addScaledVector(p.side, -28).addScaledVector(p.fwd, -14).add(V(0, 1.8, 0)), look: T_HERO.clone().add(V(0, 24 + u * 2, 0)), fov: 60 };
    },
    focus: () => T_HERO,
    shadow: 80,
  },
  // Data off... phir bhi juda!
  {
    id: "towerTrain",
    from: 28,
    to: 33,
    head: (u) => 2210 + u * 24,
    cam: () => {
      const p = poseAt(2300);
      return { pos: p.p.clone().addScaledVector(p.side, 95).addScaledVector(p.fwd, -10).add(V(0, 24, 0)), look: p.p.clone().addScaledVector(p.side, -12).add(V(0, 10, 0)), fov: 55 };
    },
    focus: () => poseAt(2300).p,
    shadow: 140,
  },
  // Har tower ki fixed ID!
  {
    id: "towerRow",
    from: 33,
    to: 35,
    head: (u) => 2440 + u * 28,
    cam: (u) => {
      const p = poseAt(2470 + u * 10);
      return { pos: offsetFrom(p, -30, 60, -10), look: offsetFrom(poseAt(2720), 0, 0, 0), fov: 55 };
    },
    focus: () => poseAt(2650).p,
    shadow: 260,
  },
  // App chupchaap ID padhta hai
  {
    id: "behind",
    from: 35,
    to: 38,
    head: (u) => 2500 + u * 28,
    cam: (u) => {
      const f = mid(2500 + u * 28, 6);
      return { pos: offsetFrom(f, -70, 30, 14), look: offsetFrom(f, 60, 0, 0), fov: 52 };
    },
    focus: (u) => mid(2500 + u * 28, 4).p,
    shadow: 180,
  },
  // ID se jagah kaise pata chale? / GPS + Tower ID: dono record!
  {
    id: "loggerBg",
    from: 38,
    to: 46,
    head: (u) => 2000 + u * 28,
    cam: (u) => mapCam(poseAt(2200).p, 520, 380, u, 6),
    focus: () => poseAt(2200).p,
    shadow: 500,
    fog: 6000,
    blur: 7,
    dim: 0.25,
  },
  // Map pe plot kiya... Towers ne track kheench di!
  {
    id: "plot",
    from: 46,
    to: 50,
    head: () => 1200,
    cam: (u) => ({ pos: V(poseAt(1900).p.x - 120 - u * 10, 1350, poseAt(1900).p.z + 520), look: poseAt(1900).p, fov: 50 }),
    focus: () => poseAt(1900).p,
    shadow: 900,
    fog: 9000,
  },
  // Users ke safar se... poore India ka map!
  {
    id: "routes",
    from: 50,
    to: 53,
    head: () => 1200,
    cam: (u) => ({ pos: V(-300 - u * 20, 3200, 900), look: V(-380, 0, -250), fov: 50 }),
    focus: () => V(-380, 0, -250),
    shadow: 1500,
    fog: 12000,
  },
  // Size? 7-8 MB
  {
    id: "size",
    from: 53,
    to: 56,
    head: () => 1200,
    cam: (u) => ({ pos: V(-360 - u * 20, 3200, 900), look: V(-380, 0, -250), fov: 50 }),
    focus: () => V(-380, 0, -250),
    shadow: 1500,
    fog: 12000,
    blur: 6,
    dim: 0.2,
  },
  // Asli trick / Area: kai km... par track = ek line / Tower badla = train aage
  {
    id: "mapTrack",
    from: 56,
    to: 65,
    head: (u) => 2560 + u * 32,
    cam: (u) => mapCam(poseAt(2720).p, 640, 330, u, 4),
    focus: () => poseAt(2720).p,
    shadow: 520,
    fog: 8000,
  },
  // Station pe towers ghane... accuracy GPS jaisi!
  {
    id: "mapStation",
    from: 65,
    to: 70,
    head: (u) => STATION.sStart - 220 + u * 30,
    cam: (u) => ({ pos: V(ST.x - 220 - u * 6, 520, ST.z + 320), look: V(ST.x, 0, ST.z - 10), fov: 50 }),
    focus: () => ST,
    shadow: 450,
    fog: 8000,
  },
  // Late kitni? Timetable offline / Kahaan hai, kahaan honi chahiye / Farak = delay / Usi train mein
  {
    id: "mapDelay",
    from: 70,
    to: 81,
    head: (u) => 2950 + u * 6,
    cam: (u) => mapCam(poseAt(3060).p, 560, 300, u, 2),
    focus: () => poseAt(3060).p,
    shadow: 450,
    fog: 8000,
  },
  // TWIST!
  {
    id: "twist",
    from: 81,
    to: 83,
    head: (u) => 600 + u * 30,
    cam: (u) => {
      const f = mid(600 + u * 30, 3);
      return { pos: offsetFrom(f, 10, 6, -40), look: offsetFrom(f, 0, 3, 0), fov: 46 };
    },
    focus: (u) => mid(600 + u * 30, 3).p,
    shadow: 120,
  },
  // Bengaluru ke 5 engineers / Google ne khareed liya 2018
  {
    id: "story",
    from: 83,
    to: 87,
    head: (u) => 700 + u * 30,
    cam: (u) => {
      const at = poseAt(760);
      return { pos: offsetFrom(at, -20 + u * 4, 12, -70), look: offsetFrom(at, 10, 4, 0), fov: 50 };
    },
    focus: () => poseAt(760).p,
    shadow: 140,
    dim: 0.35,
  },
  // Maps live train status
  {
    id: "maps",
    from: 87,
    to: 91,
    head: (u) => 820 + u * 30,
    cam: (u) => mapCam(poseAt(900).p, 380, 260, u, 6),
    focus: () => poseAt(900).p,
    shadow: 400,
    fog: 6000,
    blur: 6,
    dim: 0.25,
  },
  // Internet na ho... location phir bhi! / Phone ki towers se chupchaap baat!
  {
    id: "drone",
    from: 91,
    to: 98,
    head: (u) => 2440 + u * 28,
    cam: (u) => {
      const f = mid(2440 + u * 28, 6);
      return { pos: offsetFrom(f, -110, 55, -38), look: offsetFrom(f, 60, 0, 0), fov: 52 };
    },
    focus: (u) => mid(2440 + u * 28, 2).p,
    shadow: 260,
  },
  // Comment karo / Follow karo
  {
    id: "outro",
    from: 98,
    to: 106,
    head: (u) => 780 + u * 24,
    cam: (u) => {
      const f = mid(780 + u * 24, 2);
      return { pos: offsetFrom(f, 14, 5.5, -20), look: offsetFrom(f, -12, 2.5, 0), fov: 55 };
    },
    focus: (u) => mid(780 + u * 24, 2).p,
    shadow: 90,
    dim: 0.3,
  },
];

export const shotAt = (t: number) => SHOTS.find((s) => t >= s.from && t < s.to) ?? SHOTS[SHOTS.length - 1];

export const easeIn = ease;
