import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile } from "remotion";
import { Fade, FontGate } from "./Overlay";
import { S1Aerial, S2Plates, S3Ping, S4Dhaba, S5Phones, S6bBerlin, S6Fight, S7Map, S8LookAround } from "./Scenes";
import { Counter, FollowCTA, IconPop, ProgressBar, PunchZoom, RedFlash, SlidePill, Stamp, VOCaptions, VOPhrase, Whoosh } from "./MotionGraphics";

// Hinglish voiceover (ElevenLabs). Phrase times were measured from the audio's pauses.
// After "Free ka drama!" the VO is paused for FIGHT_GAP seconds so the roadside fight plays with horns.
const FPS = 30;
const GAP_AT = 36.95; // seconds into the VO file
const FIGHT_GAP = 4.0; // seconds of drama with no voice
const F = (t: number) => Math.round((t < GAP_AT ? t : t + FIGHT_GAP) * FPS);

const RAW: [number, number, string, string[]?][] = [
  [0.0, 0.92, "Kabhi socha hai..."],
  [1.33, 3.23, "Google Maps ko traffic ka pata,", ["Maps"]],
  [3.48, 5.83, "aapke wahan pahunchne se pehle kaise chal jaata hai?", ["pehle"]],
  [6.39, 7.35, "Simple hai boss."],
  [7.81, 9.29, "Maps aapka phone dekh raha hai.", ["phone"]],
  [9.75, 12.06, "Jab bhi aapka Maps on hota hai,"],
  [12.21, 14.2, "aapka phone chupke se batata rehta hai:", ["chupke"]],
  [14.5, 16.84, "aap kahan ho, aur kitni speed se chal rahe ho.", ["kahan", "speed"]],
  [17.34, 20.03, "Ab ek phone 8 km/h pe reng raha hai?", ["8"]],
  [20.45, 21.63, "Usse kuch pata nahi chalta."],
  [22.16, 24.39, "Ho sakta hai bhai dhabe pe chai peene ruk gaya ho.", ["dhabe", "chai"]],
  [24.87, 27.39, "Lekin jab ek hi stretch pe sainkdon phones...", ["sainkdon"]],
  [27.62, 30.95, "ek saath 105 se seedha 24 pe aa jaate hain...", ["105", "24"]],
  [31.35, 33.0, "toh samajh lo, jam lag gaya hai.", ["jam"]],
  [33.34, 35.5, "Aur Indian jam ka bonus?", ["bonus"]],
  [35.75, 36.73, "Free ka drama!", ["drama"]],
  [37.19, 38.66, "Ab yahan suno crazy part.", ["crazy"]],
  [39.12, 41.85, "Berlin mein ek artist ne 99 phones", ["Berlin", "99"]],
  [42.0, 43.11, "ek chhoti si gaadi mein daale..."],
  [43.69, 45.93, "aur dheere-dheere ek khaali sadak pe chal pada.", ["khaali"]],
  [46.47, 48.33, "Google Maps ne woh sadak laal kar di.", ["laal"]],
  [48.7, 51.07, "Aur gaadiyan aise jam se bachke nikalne lagi..."],
  [51.32, 52.61, "jo exist hi nahi karta tha!", ["exist"]],
  [53.14, 55.28, "Toh agli baar jab aapka route laal dikhe...", ["laal"]],
  [55.6, 56.66, "zara aas-paas dekhna."],
  [57.14, 58.38, "Aap bhi ek sensor ho.", ["sensor"]],
  [58.85, 60.43, "Aise hi aur explainers ke liye,"],
  [60.67, 62.13, "follow karo Mindset Mode!", ["Mindset", "Mode"]],
];
const PHRASES: VOPhrase[] = RAW.map(([a, b, text, hl]) => ({ from: F(a), to: F(b), text, hl }));

// Shot cut points (frames), each cut lands on a VO pause.
const CUTS = [0, 183, 287, 513, 740, 996, 1229, 1508, 1709, 1883, 2010];
export const VO_REEL_FRAMES = CUTS[CUTS.length - 1];

const SHOTS: React.FC<{ dur: number }>[] = [
  ({ dur }) => <S1Aerial dur={dur} titleTo={dur} />,
  S2Plates,
  S3Ping,
  S4Dhaba,
  ({ dur }) => <S5Phones dur={dur} drop={118} jamAt={229} />,
  S6Fight,
  S6bBerlin,
  S7Map,
  ({ dur }) => <S8LookAround dur={dur} switchAt={125} />,
  ({ dur }) => <S1Aerial dur={dur} noTitle />,
];

const BEATS = [138, 250, 387, 702, 894, 969, 1073, 1266, 1350, 1668, 1836, 1966];

const speech = PHRASES.map((p) => [p.from, p.to] as const);
const bedVolume = (f: number) => {
  let d = Infinity;
  for (const [a, b] of speech) {
    if (f >= a && f <= b) {
      d = 0;
      break;
    }
    d = Math.min(d, Math.abs(f - a), Math.abs(f - b));
  }
  const v = 0.16 + (0.6 - 0.16) * Math.min(1, d / 8);
  const fade = interpolate(f, [0, 8, VO_REEL_FRAMES - 40, VO_REEL_FRAMES], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return v * fade;
};

export const VOReel: React.FC = () => {
  const gapF = Math.round(GAP_AT * FPS);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <FontGate>
        <PunchZoom beats={BEATS}>
          {SHOTS.map((C, i) => (
            <Sequence key={i} from={CUTS[i]} durationInFrames={CUTS[i + 1] - CUTS[i]}>
              <Fade dur={CUTS[i + 1] - CUTS[i]}>
                <C dur={CUTS[i + 1] - CUTS[i]} />
              </Fade>
            </Sequence>
          ))}
        </PunchZoom>

        {/* ---- motion graphics on the VO beats ---- */}
        <Stamp at={138} text="PEHLE?!" y={800} color="#FFD400" />
        <IconPop at={248} dur={38} kind="phone" x={540} y={780} label="WATCHING YOU" />
        <IconPop at={387} dur={56} kind="pin" x={300} y={860} label="LOCATION ON" labelColor="#FF6B5E" />
        <SlidePill at={443} dur={68} text="KAHAN HO?" y={1150} from="left" color="#FF3B30" icon="pin" />
        <SlidePill at={477} dur={34} text="KITNI SPEED?" y={1268} from="right" color="#3DDC97" icon="dot" />
        <IconPop at={700} dur={40} kind="chai" x={800} y={820} label="CHAI BREAK" />
        <Counter at={765} dur={70} fromN={1} toN={347} tick={34} label="PHONES" x={540} y={720} />
        <Stamp at={894} dur={44} text="24 KM/H" sub="105 → 24" y={760} color="#FF3B30" ink="#111" rot={-4} />
        <Stamp at={969} dur={26} text="JAM!" y={760} size={190} color="#FF3B30" burst />
        <RedFlash at={969} />
        <Stamp at={1073} dur={36} text="FREE KA DRAMA" y={1180} size={96} color="#FFD400" burst rot={5} />
        <Stamp at={1266} dur={34} text="CRAZY PART" y={760} size={110} color="#5AB8FF" rot={-5} />
        <Counter at={1340} dur={70} fromN={1} toN={99} tick={24} label="PHONES · 1 WAGON" x={620} y={820} color="#8FE3FF" />
        <Stamp at={1668} dur={40} text="FAKE JAM!" sub="EXIST HI NAHI KARTA" y={980} size={120} color="#FF3B30" burst />
        <IconPop at={1836} dur={46} kind="radar" x={540} y={820} label="YOU = SENSOR" labelColor="#3DDC97" />
        <FollowCTA at={1938} />

        {CUTS.slice(1, -1).map((c) => (
          <Whoosh key={c} at={c} />
        ))}
        <VOCaptions phrases={PHRASES} />
        <ProgressBar total={VO_REEL_FRAMES} />
      </FontGate>

      {/* voice: part 1, then part 2 after the fight gap */}
      <Sequence from={0} durationInFrames={gapF}>
        <Audio src={staticFile("vo-hinglish.mp3")} trimAfter={gapF} />
      </Sequence>
      <Sequence from={gapF + Math.round(FIGHT_GAP * FPS)}>
        <Audio src={staticFile("vo-hinglish.mp3")} trimBefore={gapF} />
      </Sequence>
      {/* traffic + horn bed, ducked under the voice */}
      <Audio src={staticFile("indian-traffic.mp3")} volume={bedVolume} />
    </AbsoluteFill>
  );
};
