# Indian Navy reel — v2 cinematic upgrade: analysis & plan

## 1. What exists today (v1)

| Item | Finding |
|---|---|
| Original render | `out/indian-navy-hindi.mp4` — 1080×1920, 30 fps, H.264 + AAC, 105.0 s, ~3.3 Mbit/s. **Left untouched.** |
| Framework | Remotion 4.0.469 (React). Separate entry `src/navy/index.ts` → composition `IndianNavy`. |
| "3D" | Custom 2.5D projection engine (`src/navy/engine.ts`): metre-based world, perspective camera (target, yaw, pitch, zoom, focal F), painter's-order SVG. Models in `src/navy/world.tsx`: INS Vikrant hull (ski-jump bow, angled deck, 3 arrester wires, island, mast tricolour), Tejas (top-down silhouette + fin + canopy + roundels), runway, labels, trails. |
| Narration | Piper TTS `hi_IN-rohan-medium`, 36 lines (`scripts/navy_script.py`), Hindi for the voice + 1:1 Hinglish words for captions. `scripts/build_voice.py` → `voice.wav` + `timeline.json` (scene + per-word timings drive everything). |
| Captions | Hinglish, ≤4 words per chunk, active word cyan with underline, box at y≈1440–1540. |
| Audio | `scripts/build_mix.py`: synthesized pad/pulse music, a few SFX, the two hook clips' audio; loudness-normalised to −14 LUFS. |
| Fonts | @fontsource Inter, JetBrains Mono, Unbounded (bundled, offline). |
| Hook | Two live-action clips (`hookA/hookB.mp4`) — **removed in v2 as requested**. |

## 2. Scene-by-scene analysis of v1

| # | Scene (time in v1) | What works | Problems |
|---|---|---|---|
| 1 | Hook clips (0–13 s) | Cinematic | Removed per request; v2 needs a new animated hook that creates curiosity in < 2 s. |
| 2 | Imagine (13–24 s) | Carrier model, wake, ski-jump launch with trail | Opens with a slow zoom-out (static feel); same ¾ aerial angle as almost every other scene; launch seen only from above. |
| 3 | Runway vs deck (24–33 s) | Clear size comparison, runway highlight | Wide shot is small/flat; no payoff moment; the "itni jagah nahi" line is a natural humour beat that is wasted. |
| 4 | Ski-jump (33–47 s) | Good idea: full power, blocks, ramp glow, side-view card | Blocks are tiny; launch is again top-down; no low/side angle showing the ramp curve; side card is a flat 2D inset. |
| 5 | Catapult vs ski-jump (47–55 s) | Correctly separates the two systems | Weakest scene: two small panels + 2D cards; catapult mechanism (shuttle, cylinders, holdback, water brake) not shown at all. |
| 6 | Landing (55–72 s) | Hook label, wires, V-catch, 2 s timer | Approach is seen from far above; hook engagement happens at normal speed and small; no explanation of where the wire's energy goes. |
| 7 | Twist (72–89 s) | Strong idea, red "missed" wires, ghost jet into sea | Same aerial angle again; touchdown/full-power lacks impact (no shake/sound accent). |
| 8 | Backup + outro (89–105 s) | "Controlled crash." title, zoom-out, flag | Ending is soft: flag appears over a small ship, no final landing beat, no emotional rise. |

Repetition: 7 of 8 scenes use yaw ≈ −28°, pitch ≈ 40° (the same 3/4 aerial view). There are no low angles, side tracking, first-person or orbit shots, and every transition is a 6-frame fade.

## 3. Decisions

**Preserve (reuse the code as is or with small changes):** projection engine; Vikrant model; Tejas model; ski-jump launch physics; V-catch wire; 2 s timer; ghost-jet-into-sea gag; "Controlled crash." title; Hinglish caption timing system; HUD.

**Improve (same scene, new camera, lighting, compositing or timing):**
- Imagine: orbit instead of the zoom-out; low-angle tracking taxi; launch seen from deck level.
- Runway: side-tracking jet on the long runway; humour beat on "itni jagah nahi hai".
- Ski-jump: extreme close-up of wheels against the blocks; side-tracking run up the ramp; 3D trajectory arc instead of the 2D card.
- Twist: low-angle touchdown, impact shake, slow-motion hook skip.
- Backup: keep, with depth of field and sound accents.

**Regenerate (new scenes):**
- Cold-open hook (0–4 s).
- Catapult 3D cutaway.
- Landing engagement close-up + arresting-gear cutaway.
- Finale.

**Engine upgrades (shared, opt-in so v1 still renders identically):**
- Horizon and sky for low camera angles.
- Animated ocean surface with sun glint.
- Carrier deck and hull shading gradients, plus a cast shadow on the sea.
- Depth-sorted hull faces (needed for low angles).
- Jet fuselage volume (side profile) and landing gear.
- MiG-29K silhouettes for the jets parked on deck.
- Motion-blur ghosts for fast jets.
- Soft light rays.
- Zoom-through transitions.
- Big keyword typography.
- Caption pop-in, kept inside the Instagram safe area.

## 4. Revised timeline (target; final numbers are in REPORT.md)

| Time | Scene | Narration | Camera / visual |
|---|---|---|---|
| 0–4 s | COLD OPEN (new) | **New:** "is ladaaku vimaan ko, utarne ke liye milte hain, sirf kuch second!" | Extreme close-up of wheels + hook over the deck → fast pull-back reveals the ocean and carrier → jet rushes in → freeze-frame before touchdown, impact + shake, "SECONDS TO LAND", 0.5 s of silence |
| 4–15 s | HOOK | L0–L2 (original) | Top-down drone shot: runway vs tiny deck, "SUPER SHORT RUNWAY"; tilt down as the jet launches on "udaan" |
| 15–26 s | IMAGINE | L3–L6 | Orbit around Vikrant at sea → low-angle tracking taxi → launch from deck level → fly-through transition |
| 26–35 s | RUNWAY | L7–L9 | Side-tracking long runway roll → crash-zoom to tiny deck + comedic pause ("ITNI SI JAGAH?") → push-in to ski-jump |
| 35–49 s | SKI-JUMP | L10–L14 | Engine glow + shake → extreme close-up of blocks (mechanical clunk) → side-tracking run up the ramp → 3D arc, climb over the ocean |
| 49–57 s | CATAPULT | L15–L16 | Match-cut to a **generic unmarked flat-deck carrier** cutaway: steam cylinders, piston, shuttle in deck slot, holdback, water brake → match-cut back to Vikrant's ski-jump ("STOBAR") |
| 57–75 s | LANDING | L17–L22 | First-person approach → close-up of gear + hook ("ARRESTING HOOK") → top-down on 3 wires → slow-motion engagement close-up, wire stretches, energy runs to arresting engines below deck → 2 s stop |
| 75–92 s | TWIST | L23–L29 | Low-angle touchdown (impact) → full power (shake) → slow-motion hook skip with sparks → bolter climb → ghost jet into the sea |
| 92–98 s | BACKUP | L30–L32 | Caught jet with engine at full power, "Controlled crash." |
| 98–~107 s | FINALE | L33–L35 + **new closing line** "samandar ke beech bhi, Bharat ki taaqat nahi rukti!" | Successful arrested landing → mechanism close-up → pull-back orbit reveal of Vikrant → tricolour over the horizon with light rays, title card |

**Duration note:** keeping all 36 original lines, even at a slightly faster pace, gives roughly 95–105 s. Reaching 65–80 s would mean cutting explanation lines, which the brief says not to do. The report lists the lines that could be cut if a shorter cut is wanted.

## 5. Assets and sound effects

Everything is generated in code. There is no stock footage and no third-party audio.

- **Visual:** new procedural models (catapult cutaway: cylinders, pistons, shuttle, holdback, water brake; arresting-gear sheaves and engine; MiG-29K parked-jet silhouette; landing gear), ocean surface, sky/horizon, light rays, keyword typography.
- **SFX (synthesized):**
  - Cold-open impact plus a sub-bass drop.
  - Ocean and wind ambience bed.
  - Jet rumble beds.
  - Afterburner spool-ups.
  - Doppler flybys.
  - Mechanical lock clunks (blocks, holdback).
  - Steam hiss and water-brake thump.
  - Cable tension creak plus metallic impact.
  - Tyre chirp and spark crackle.
  - Splash.
  - Transition whooshes.
  - A comedic "tick-tick" pause.
  - Silence gaps before the reveals.
  - A final orchestral-style swell (layered saw "strings" + timpani-like hits).
- **Music:** original synth bed, ducked under the voice.

## 6. Factual review (narration is NOT rewritten; issues are flagged)

| Time (v2) | Line | Status |
|---|---|---|
| ~5–15 s, ~17 s | "Tejas jaise fighter jet…", "ek Tejas, sabse aage aakar taiyaar hota hai" | **Flag.** The naval LCA (Tejas) is a developmental prototype. It made its first landing on INS Vikrant on 6 Feb 2023 during trials. The fighter that operates from Vikrant is the MiG-29K. v2 adds an on-screen tag ("NAVAL LCA TEJAS · PROTOTYPE · DECK TRIALS 2023") and shows the parked jets as MiG-29K silhouettes, but keeps the narration. |
| ski-jump scene | "deck par lage block…" | OK: STOBAR launches hold the jet at full power with restraining gear, then release it. |
| catapult scene | "duniya ke kai carrier… catapult" | OK: CATOBAR carriers, for example in the US and French navies, use catapults. v2 shows a generic unmarked carrier and explicitly labels Vikrant as ski-jump (STOBAR). |
| landing | 3 steel cables | OK: Vikrant has 3 arrester wires. |
| landing | "lagbhag do second mein… ruk jaata hai" | Commonly cited approximate figure for arrested landings in general. It is kept as narrated, but no other speed or distance numbers are added. |
| cold open (new line) | "sirf kuch second" | Deliberately non-numeric; consistent with the line above. |
