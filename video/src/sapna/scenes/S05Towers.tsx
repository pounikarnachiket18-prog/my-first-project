import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, SCENES } from "../theme";
import { Chip, Headline, TowerIcon, popStyle, usePop } from "../ui";
import { CoverageRing, Tower, World3D } from "../three/World3D";
import { poseAt } from "../three/track";

const COLORS = [C.stripe, C.pink, "#3B82F6"];
const IDS = ["21465", "21470", "21481"];
const TOWER_S = [1500, 1720, 1940];
const OFFSETS = [-75, 80, -70];
const R = 120;

const towerPos = TOWER_S.map((s, i) => {
  const p = poseAt(s);
  return p.p.clone().addScaledVector(p.side, OFFSETS[i]);
});
const CENTER = poseAt(1720).p;

const headAt = (f: number) => 1330 + f * 2.1;

const servingAt = (f: number) => {
  const h = poseAt(headAt(f)).p;
  let best = 0;
  let bd = Infinity;
  towerPos.forEach((t, i) => {
    const d = Math.hypot(t.x - h.x, t.z - h.z);
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  return best;
};

/** Scene 5: high tilted drone view, the train hands over from tower to tower. */
export const S05Towers: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const switches = useMemo(() => {
    const s: number[] = [0];
    let last = servingAt(0);
    for (let f = 1; f < SCENES.towers; f++) {
      const cur = servingAt(f);
      if (cur !== last) {
        s.push(f);
        last = cur;
      }
    }
    return s;
  }, []);
  const serving = servingAt(frame);
  const lastSwitch = switches.filter((s) => s <= frame).pop() ?? 0;
  const flip = spring({ frame: frame - lastSwitch, fps, config: { damping: 12 } });
  const head = headAt(frame);
  const headP = poseAt(head).p.clone().add(new THREE.Vector3(0, 4.6, 0));
  const linkTop = towerPos[serving].clone().add(new THREE.Vector3(0, 30, 0));
  const dataChip = usePop(40);
  const idChip = usePop(60);
  const c = CENTER;
  const cam = {
    pos: new THREE.Vector3(c.x + 260 - frame * 0.3, 480, c.z + 330),
    look: new THREE.Vector3(c.x - 10, 0, c.z - 40),
    fov: 50,
  };
  const linkMid = new THREE.Vector3().addVectors(headP, linkTop).multiplyScalar(0.5);
  const dir = new THREE.Vector3().subVectors(linkTop, headP);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());

  return (
    <AbsoluteFill>
      <World3D cam={cam} head={head} coaches={8} shadowFocus={c} shadowSize={420} fogFar={4200}>
        {towerPos.map((p, i) => (
          <React.Fragment key={i}>
            <Tower pos={p} scale={1.6} active={i === serving} />
            <CoverageRing pos={p} r={R} color={COLORS[i]} active={i === serving} />
          </React.Fragment>
        ))}
        <mesh position={linkMid} quaternion={q}>
          <cylinderGeometry args={[0.9, 0.9, dir.length(), 8]} />
          <meshBasicMaterial color={COLORS[serving]} toneMapped={false} transparent opacity={0.85 + Math.sin(frame / 3) * 0.15} />
        </mesh>
      </World3D>

      <Headline
        lines={[
          ["Har", "tower", "ki", "ek"],
          [{ t: "ID", c: C.stripe }, "hoti", "hai!"],
        ]}
        delay={6}
        top={190}
        size={96}
      />
      <div style={{ position: "absolute", top: 450, width: "100%", display: "flex", justifyContent: "center", gap: 20 }}>
        <div style={popStyle(dataChip)}>
          <Chip color={C.red} size={34}>
            DATA OFF
          </Chip>
        </div>
        <div style={popStyle(dataChip)}>
          <Chip color={C.green} size={34}>
            SIGNAL ON
          </Chip>
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 330, right: 60, ...popStyle(idChip), transformOrigin: "right center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            padding: "18px 30px",
            borderRadius: 30,
            background: "rgba(12,22,38,0.75)",
            backdropFilter: "blur(10px)",
            border: `3px solid ${COLORS[serving]}`,
            fontFamily: FONT,
            color: C.white,
            boxShadow: "0 16px 40px rgba(0,0,0,0.3)",
          }}
        >
          <TowerIcon size={54} color={COLORS[serving]} />
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 3, opacity: 0.8 }}>SERVING TOWER</div>
            <div style={{ fontSize: 54, fontWeight: 800, color: COLORS[serving], rotate: `x ${interpolate(flip, [0, 1], [90, 0])}deg` }}>
              ID {IDS[serving]}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
