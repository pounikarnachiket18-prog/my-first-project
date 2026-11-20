/** Passengers and platform stalls. Faceless, realistic proportions, matte stylised materials. */
import React from "react";
import * as THREE from "three";
import { random, useCurrentFrame } from "remotion";
import { awningTex, shopSignTex } from "./textures";
import { TH } from "../theme";

type V3 = [number, number, number];
const PLAT = 1.1;
const SKINS = ["#C68863", "#A8714F", "#8D5A3B", "#D9A07A", "#B97E58"];
const HAIR = ["#1B1512", "#2A1E18", "#3A2A20", "#151515"];

type Pose = "stand" | "phone" | "suitcase" | "backpack" | "saree" | "child" | "sit";
type PersonDef = { p: V3; r: number; pose: Pose; top: string; bottom: string; h?: number };

const Mat: React.FC<{ c: string; rough?: number }> = ({ c, rough = 0.8 }) => <meshStandardMaterial color={c} roughness={rough} />;

const Person: React.FC<{ d: PersonDef; i: number; f: number; y?: number }> = ({ d, i, f, y = PLAT }) => {
  const skin = SKINS[i % SKINS.length];
  const hair = HAIR[i % HAIR.length];
  const kid = d.pose === "child";
  const s = (d.h ?? 1.7) / 1.7 * (kid ? 0.62 : 1);
  const sway = Math.sin(f / 22 + i * 1.7) * 0.025;
  const look = Math.sin(f / 37 + i) * 0.25;
  const sit = d.pose === "sit";
  const legH = sit ? 0.45 : 0.82;
  const hipY = sit ? 0.46 : 0.86;
  const saree = d.pose === "saree";
  const phone = d.pose === "phone";
  return (
    <group position={[d.p[0], y, d.p[2]]} rotation={[0, d.r, sway]} scale={s}>
      {/* legs / saree */}
      {saree ? (
        <mesh position={[0, 0.45, 0]}>
          <cylinderGeometry args={[0.17, 0.27, 0.9, 20]} />
          <Mat c={d.bottom} />
        </mesh>
      ) : sit ? (
        [-0.1, 0.1].map((x) => (
          <group key={x}>
            <mesh position={[x, hipY, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
              <capsuleGeometry args={[0.065, 0.32, 4, 10]} />
              <Mat c={d.bottom} />
            </mesh>
            <mesh position={[x, 0.23, 0.42]}>
              <capsuleGeometry args={[0.06, 0.34, 4, 10]} />
              <Mat c={d.bottom} />
            </mesh>
          </group>
        ))
      ) : (
        [-0.09, 0.09].map((x) => (
          <mesh key={x} position={[x, legH / 2 + 0.04, 0]}>
            <capsuleGeometry args={[0.07, legH - 0.12, 4, 10]} />
            <Mat c={d.bottom} />
          </mesh>
        ))
      )}
      {/* shoes */}
      {!saree &&
        [-0.09, 0.09].map((x) => (
          <mesh key={x} position={[x, 0.04, sit ? 0.5 : 0.04]}>
            <boxGeometry args={[0.1, 0.07, 0.24]} />
            <Mat c="#26221F" />
          </mesh>
        ))}
      {/* torso */}
      <mesh position={[0, hipY + 0.3, 0]} scale={[1, 1, 0.62]}>
        <capsuleGeometry args={[0.17, 0.36, 6, 16]} />
        <Mat c={d.top} />
      </mesh>
      {saree && (
        // pallu over the shoulder
        <mesh position={[0.06, hipY + 0.33, 0.02]} rotation={[0, 0, -0.5]} scale={[1, 1, 0.66]}>
          <boxGeometry args={[0.12, 0.62, 0.36]} />
          <Mat c={d.bottom} />
        </mesh>
      )}
      {/* arms */}
      {[-1, 1].map((side) => {
        const holdPhone = phone && side === 1;
        const pull = d.pose === "suitcase" && side === 1;
        return (
          <group key={side} position={[side * 0.22, hipY + 0.52, 0]} rotation={[holdPhone ? -1.25 : pull ? 0.25 : 0.04, 0, side * (holdPhone ? -0.15 : 0.1)]}>
            <mesh position={[0, -0.3, 0]}>
              <capsuleGeometry args={[0.05, 0.5, 4, 10]} />
              <Mat c={d.top} />
            </mesh>
            <mesh position={[0, -0.6, 0]}>
              <sphereGeometry args={[0.05, 10, 8]} />
              <Mat c={skin} />
            </mesh>
            {holdPhone && (
              <mesh position={[0, -0.62, 0.04]} rotation={[0.5, 0, 0]}>
                <boxGeometry args={[0.07, 0.13, 0.015]} />
                <meshStandardMaterial color="#111" emissive="#4A6FA8" emissiveIntensity={0.6} />
              </mesh>
            )}
          </group>
        );
      })}
      {/* neck + head + hair */}
      <mesh position={[0, hipY + 0.72, 0]}>
        <cylinderGeometry args={[0.05, 0.06, 0.1, 10]} />
        <Mat c={skin} />
      </mesh>
      <group position={[0, hipY + 0.86, 0]} rotation={[phone ? 0.45 : 0, look, 0]}>
        <mesh scale={[0.9, 1.05, 0.95]}>
          <sphereGeometry args={[0.11, 20, 16]} />
          <Mat c={skin} rough={0.6} />
        </mesh>
        <mesh position={[0, 0.035, -0.012]} scale={[0.95, 0.85, 1]}>
          <sphereGeometry args={[0.112, 20, 16, 0, Math.PI * 2, 0, Math.PI / 1.8]} />
          <Mat c={hair} rough={0.9} />
        </mesh>
        {saree && (
          <mesh position={[0, -0.02, -0.11]}>
            <sphereGeometry args={[0.05, 10, 8]} />
            <Mat c={hair} />
          </mesh>
        )}
      </group>
      {/* props */}
      {d.pose === "suitcase" && (
        <group position={[0.36, 0, 0.18]} rotation={[0.15, 0, 0]}>
          <mesh position={[0, 0.34, 0]}>
            <boxGeometry args={[0.38, 0.58, 0.22]} />
            <meshStandardMaterial color={random(`sc${i}`) > 0.5 ? "#2F4A7A" : "#6B2D3A"} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.78, 0]}>
            <boxGeometry args={[0.2, 0.3, 0.02]} />
            <Mat c="#2B2B2B" />
          </mesh>
        </group>
      )}
      {d.pose === "backpack" && (
        <mesh position={[0, hipY + 0.32, -0.17]}>
          <boxGeometry args={[0.3, 0.42, 0.16]} />
          <meshStandardMaterial color="#3E4A3D" roughness={0.7} />
        </mesh>
      )}
    </group>
  );
};

/* People stay clear of |x| < 3.6 so they never block the floating clip cards. */
const PEOPLE: PersonDef[] = [
  { p: [-4.6, 0, 2.3], r: 0.5, pose: "phone", top: "#B03A2E", bottom: "#2C3E50" },
  { p: [-5.9, 0, 2.8], r: -0.3, pose: "suitcase", top: "#2E86AB", bottom: "#3B3B3B", h: 1.78 },
  { p: [-7.4, 0, 4.1], r: 1.2, pose: "stand", top: "#E1B12C", bottom: "#ECE6D8" },
  { p: [-9.0, 0, 2.1], r: 2.9, pose: "saree", top: "#F2C6A0", bottom: "#8E3B8E", h: 1.6 },
  { p: [-9.55, 0, 2.25], r: 2.7, pose: "child", top: "#27AE60", bottom: "#34495E" },
  { p: [-13.4, 0, 5.0], r: -0.8, pose: "backpack", top: "#D35400", bottom: "#34495E" },
  { p: [-14.6, 0, 2.6], r: 0.2, pose: "phone", top: "#5D6D7E", bottom: "#1C2833", h: 1.74 },
  { p: [4.2, 0, 2.4], r: -0.4, pose: "phone", top: "#16A085", bottom: "#2D2D2D" },
  { p: [5.5, 0, 3.2], r: 0.6, pose: "saree", top: "#F5D5B5", bottom: "#C2185B", h: 1.58 },
  { p: [6.9, 0, 2.2], r: 3.0, pose: "suitcase", top: "#ECF0F1", bottom: "#1C2833", h: 1.8 },
  { p: [9.4, 0, 5.1], r: -Math.PI / 2, pose: "stand", top: "#7B4B2A", bottom: "#D9CBB0" },
  { p: [10.6, 0, 2.5], r: 0.1, pose: "backpack", top: "#2874A6", bottom: "#424949" },
  { p: [13.0, 0, 3.4], r: -1.0, pose: "stand", top: "#7D3C98", bottom: "#212F3D", h: 1.66 },
  { p: [11.6, 0, 6.62], r: Math.PI, pose: "sit", top: "#A93226", bottom: "#2E4053" },
  { p: [12.5, 0, 6.62], r: Math.PI, pose: "sit", top: "#F4D03F", bottom: "#5D4037", h: 1.6 },
  { p: [-28.5, 0, 3.0], r: 0.3, pose: "stand", top: "#1F618D", bottom: "#2C2C2C" },
  { p: [-31.0, 0, 2.4], r: -0.5, pose: "phone", top: "#CB4335", bottom: "#212121" },
  { p: [26.0, 0, 2.6], r: 2.8, pose: "suitcase", top: "#839192", bottom: "#1B2631" },
  { p: [29.0, 0, 3.6], r: 0.4, pose: "saree", top: "#F0C9A8", bottom: "#117A65", h: 1.6 },
];

const Bench: React.FC<{ x: number; z: number }> = ({ x, z }) => (
  <group position={[x, PLAT, z]}>
    <mesh position={[0, 0.45, 0]}>
      <boxGeometry args={[2.2, 0.06, 0.5]} />
      <Mat c="#6E7B86" rough={0.5} />
    </mesh>
    <mesh position={[0, 0.75, 0.24]}>
      <boxGeometry args={[2.2, 0.5, 0.05]} />
      <Mat c="#6E7B86" rough={0.5} />
    </mesh>
    {[-1, 1].map((s) => (
      <mesh key={s} position={[s * 0.95, 0.22, 0]}>
        <boxGeometry args={[0.06, 0.45, 0.45]} />
        <Mat c="#3A3F45" />
      </mesh>
    ))}
  </group>
);

/* ------------------------------------------------------------------ stalls */
/** Island kiosks in the middle of the platform, open on the two long (±x) sides. */
type ShopDef = { x: number; z: number; hi: string; en: string; signBg: string; signFg: string; awnA: string; awnB: string; goods: string[]; kind: "tea" | "books" | "snacks" | "cold" };
const SHOPS: ShopDef[] = [
  { x: -10.6, z: 4.35, hi: "चाय", en: "TEA STALL", signBg: "#B71C1C", signFg: "#FFF3D6", awnA: "#C62828", awnB: "#FFF3E0", goods: ["#D7CCC8", "#BCAAA4", "#8D6E63", "#F5F0E6"], kind: "tea" },
  { x: 7.5, z: 5.2, hi: "पुस्तकें", en: "BOOK STALL", signBg: "#1A3A8A", signFg: "#FFFFFF", awnA: "#1A3A8A", awnB: "#E3F2FD", goods: ["#C62828", "#283593", "#00897B", "#F57F17", "#6A1B9A", "#2E7D32"], kind: "books" },
  { x: 16.5, z: 5.0, hi: "नाश्ता", en: "SNACKS", signBg: "#F9A825", signFg: "#3E2723", awnA: "#F9A825", awnB: "#2E7D32", goods: ["#E53935", "#FDD835", "#43A047", "#1E88E5", "#FB8C00"], kind: "snacks" },
  { x: -37.0, z: 4.8, hi: "ठंडा पानी", en: "COLD DRINKS", signBg: "#00838F", signFg: "#FFFFFF", awnA: "#00838F", awnB: "#E0F7FA", goods: ["#E53935", "#43A047", "#FFB300", "#1E88E5"], kind: "cold" },
];

const Goods: React.FC<{ s: ShopDef; i: number; side: 1 | -1 }> = ({ s, i, side }) => (
  <>
    {[1.35, 1.8, 2.25].map((y, r) =>
      new Array(6).fill(0).map((_, k) => {
        const col = s.goods[(k + r * 2 + (side > 0 ? 1 : 0)) % s.goods.length];
        const zz = -0.62 + k * 0.25;
        const x = side * 0.36;
        if (s.kind === "cold")
          return (
            <mesh key={`${r}${k}`} position={[x, y + 0.14, zz]}>
              <cylinderGeometry args={[0.05, 0.05, 0.26, 10]} />
              <meshStandardMaterial color={col} roughness={0.3} />
            </mesh>
          );
        const h = s.kind === "books" ? 0.3 : 0.16 + random(`g${i}${r}${k}${side}`) * 0.12;
        return (
          <mesh key={`${r}${k}`} position={[x, y + h / 2 + 0.02, zz]} rotation={[s.kind === "books" ? (random(`bk${r}${k}${side}`) - 0.5) * 0.25 : 0, 0, 0]}>
            <boxGeometry args={[0.18, h, s.kind === "books" ? 0.17 : 0.2]} />
            <Mat c={col} rough={0.6} />
          </mesh>
        );
      })
    )}
  </>
);

const Stall: React.FC<{ s: ShopDef; i: number; f: number }> = ({ s, i, f }) => {
  const sign = shopSignTex(s.hi, s.en, s.signBg, s.signFg);
  const awn = awningTex(s.awnA, s.awnB);
  const W = 2.4; // along x (open sides)
  const D = 1.8; // along z
  const body = TH().frame;
  return (
    <group position={[s.x, PLAT, s.z]}>
      {/* corner posts */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[(sx * W) / 2, 1.35, (sz * D) / 2]}>
            <boxGeometry args={[0.08, 2.7, 0.08]} />
            <Mat c="#8A8F98" rough={0.5} />
          </mesh>
        ))
      )}
      {/* closed short sides */}
      {[-1, 1].map((sz) => (
        <mesh key={sz} position={[0, 1.2, (sz * D) / 2]}>
          <boxGeometry args={[W, 2.4, 0.06]} />
          <Mat c={body} />
        </mesh>
      ))}
      {/* counters on both open sides */}
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <mesh position={[(sx * W) / 2 - sx * 0.2, 0.5, 0]}>
            <boxGeometry args={[0.4, 1.0, D - 0.1]} />
            <Mat c={s.signBg} rough={0.6} />
          </mesh>
          <mesh position={[(sx * W) / 2 - sx * 0.2, 1.02, 0]}>
            <boxGeometry args={[0.5, 0.05, D]} />
            <Mat c="#EDE6D6" rough={0.5} />
          </mesh>
        </group>
      ))}
      {/* central back-to-back shelf unit */}
      <mesh position={[0, 1.4, 0]}>
        <boxGeometry args={[0.5, 2.6, D - 0.2]} />
        <Mat c="#9E8B73" />
      </mesh>
      {[1.35, 1.8, 2.25].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[0.95, 0.04, D - 0.25]} />
          <Mat c="#7E6C56" />
        </mesh>
      ))}
      <Goods s={s} i={i} side={1} />
      <Goods s={s} i={i} side={-1} />
      {/* counter props */}
      {s.kind === "tea" &&
        [-1, 1].map((sx) => (
          <group key={sx} position={[(sx * W) / 2 - sx * 0.2, 1.05, -0.35]}>
            <mesh position={[0, 0.17, 0]}>
              <cylinderGeometry args={[0.14, 0.18, 0.34, 20]} />
              <meshStandardMaterial color="#B0B6BD" metalness={0.6} roughness={0.3} />
            </mesh>
            {[0.3, 0.45, 0.6].map((z) => (
              <mesh key={z} position={[0, 0.05, z]}>
                <cylinderGeometry args={[0.035, 0.028, 0.09, 12]} />
                <Mat c="#F3E9DC" />
              </mesh>
            ))}
            {[0, 1, 2].map((k) => {
              const t = ((f / 40 + k / 3 + (sx > 0 ? 0.5 : 0)) % 1 + 1) % 1;
              return (
                <mesh key={k} position={[Math.sin(t * 6 + k) * 0.05, 0.42 + t * 0.6, 0]} scale={0.6 + t}>
                  <sphereGeometry args={[0.07, 10, 8]} />
                  <meshStandardMaterial color="#FFFFFF" transparent opacity={(1 - t) * 0.5} />
                </mesh>
              );
            })}
          </group>
        ))}
      {s.kind === "books" &&
        [-1, 1].map((sx) =>
          [-0.6, -0.2, 0.2, 0.6].map((z, k) => (
            <mesh key={`${sx}${z}`} position={[(sx * W) / 2 - sx * 0.2, 1.07, z]} rotation={[0, sx > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
              <planeGeometry args={[0.3, 0.4]} />
              <Mat c={s.goods[(k + (sx > 0 ? 2 : 0)) % s.goods.length]} rough={0.5} />
            </mesh>
          ))
        )}
      {s.kind === "snacks" &&
        [-1, 1].map((sx) =>
          new Array(5).fill(0).map((_, k) => (
            <mesh key={`${sx}${k}`} position={[(sx * W) / 2 + sx * 0.02, 2.35, -0.7 + k * 0.35]} rotation={[Math.sin(f / 15 + k) * 0.08, 0, 0]}>
              <boxGeometry args={[0.04, 0.3, 0.22]} />
              <Mat c={s.goods[k % s.goods.length]} rough={0.4} />
            </mesh>
          ))
        )}
      {/* roof + awnings sloping out over both counters */}
      <mesh position={[0, 2.74, 0]}>
        <boxGeometry args={[W + 0.1, 0.1, D + 0.1]} />
        <Mat c={body} />
      </mesh>
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * (W / 2 + 0.28), 2.58, 0]} rotation={[0, 0, sx * -0.45]}>
          <boxGeometry args={[0.65, 0.04, D + 0.3]} />
          <meshStandardMaterial attach="material-0" color={s.awnA} />
          <meshStandardMaterial attach="material-1" color={s.awnA} />
          <meshStandardMaterial attach="material-2" map={awn} />
          <meshStandardMaterial attach="material-3" map={awn} />
          <meshStandardMaterial attach="material-4" color={s.awnA} />
          <meshStandardMaterial attach="material-5" color={s.awnA} />
        </mesh>
      ))}
      {/* four-sided signboard on the roof */}
      <mesh position={[0, 3.2, 0]}>
        <boxGeometry args={[W, 0.82, D]} />
        <meshBasicMaterial attach="material-0" map={sign} toneMapped={false} />
        <meshBasicMaterial attach="material-1" map={sign} toneMapped={false} />
        <meshStandardMaterial attach="material-2" color={s.signBg} />
        <meshStandardMaterial attach="material-3" color={s.signBg} />
        <meshBasicMaterial attach="material-4" map={sign} toneMapped={false} />
        <meshBasicMaterial attach="material-5" map={sign} toneMapped={false} />
      </mesh>
      {/* shopkeepers behind both counters */}
      <Person d={{ p: [-0.62, 0, 0.1], r: -Math.PI / 2, pose: "stand", top: i % 2 ? "#F5F5F5" : "#5D4037", bottom: "#3E3E3E" }} i={i + 40} f={f} y={0} />
      <Person d={{ p: [0.62, 0, -0.3], r: Math.PI / 2, pose: "stand", top: i % 2 ? "#6D4C41" : "#ECEFF1", bottom: "#37474F", h: 1.62 }} i={i + 50} f={f} y={0} />
    </group>
  );
};

export const Crowd: React.FC = () => {
  const f = useCurrentFrame();
  return (
  <group>
    {PEOPLE.map((d, i) => (
      <Person key={i} d={d} i={i} f={f} />
    ))}
    <Bench x={12.05} z={6.6} />
    {SHOPS.map((s, i) => (
      <Stall key={i} s={s} i={i} f={f} />
    ))}
  </group>
  );
};
