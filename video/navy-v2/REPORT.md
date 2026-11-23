# Indian Navy reel — v2 cinematic upgrade: report

**Output:** `out/indian_navy_cinematic_v2.mp4`: 1080×1920 (9:16), 30 fps, H.264 High (yuv420p, TV range, faststart), AAC 256 kb/s stereo 48 kHz, −14 LUFS integrated, duration ≈105 s.
**Original kept untouched:** `out/indian-navy-hindi.mp4`. v1 still renders from composition `IndianNavy`.
**v2 source:** composition `IndianNavyV2` in `src/navy/v2/`. It reuses the v1 engine and models through opt-in props, so v1 output does not change.

Rebuild:
1. `python3 scripts/build_voice.py <hi_IN-rohan-medium.onnx> public/navy navy_script_v2 src/navy/v2/timeline.json`
2. `python3 scripts/build_mix_v2.py`, then `ffmpeg -i public/navy/mix_v2.wav -af loudnorm=I=-14:TP=-1.5:LRA=11 …`
3. `npx remotion render src/navy/index.ts IndianNavyV2 …`, then the yuv420p/faststart encode shown in the "Export" section.

The analysis and plan written before implementation are in `PLAN.md`.

## 1. Scene-by-scene changes

| Scene | Status | What changed |
|---|---|---|
| Opening hook (live-action clips) | **Removed** (as requested) | Replaced by a new animated cold open. |
| Cold open | **Regenerated** | Extreme close-up of the landing gear with the deck and sea rushing past. A fast pull-back keeps the jet in frame and reveals the ocean and carrier. The jet then rushes in from behind. Freeze-frame just before touchdown (white flash, desaturation, shake, sub-bass impact), "SECONDS TO LAND", then 0.5 s of real silence. New narration line. |
| Hook (runway vs deck) | **Improved** | New top-down drone view. A highlighted section of the runway the same length as Vikrant's deck, plus "SUPER SHORT RUNWAY". The camera then tilts and pushes into a 3/4 view where a Tejas launches on "udaan" and a second jet approaches on "utarte". On-screen prototype tag. |
| Imagine | **Improved** | A 90° orbit around Vikrant at sea (wake, ocean, light rays) replaces the static zoom-out. Low-angle deck-level tracking shot as the Tejas taxis toward the camera, with the horizon visible. Side view from the port deck edge for the launch, with motion blur and shake. |
| Runway + humour | **Improved** | Side-tracking shot of a jet on a long airport runway (edge lights streaming), then a crane up to a top-down view of the long roll. **Humour beat:** a tiny carrier, a crash-zoom with a whoosh, a music dip and pause, a ruler drawn along the deck, a ratchet click and "ITNI SI JAGAH?!" (wobble pop). Fast push-in to the ski-jump ("SKI-JUMP"). |
| Ski-jump | **Improved** | Rear low angle at full power (heat haze, shake). **Extreme close-up of the main wheels against the restraining blocks**, with a lock clunk. The blocks retract and a side-tracking shot follows the run. The camera parks at the ramp so the curve is seen in profile, with a 3D trajectory arc, then cranes up as the jet climbs over the ocean. The 2D side card was removed. |
| Catapult vs ski-jump | **Regenerated** | 1.1 s of silent build-up, then a **3D cutaway of a generic, unmarked CATOBAR carrier**: steam cylinders filling, shuttle in the deck slot, release, and a water brake with a steam burst ("CATAPULT"). Tag: "GENERIC CATOBAR CARRIER · NOT INS VIKRANT". **Match cut** with the same framing to Vikrant's ski-jump launch, tagged "SKI-JUMP (STOBAR) · NO CATAPULT". |
| Landing | **Regenerated / improved** | **First-person final approach** with HUD symbology. **Underside close-up as the hook drops** ("ARRESTING HOOK"). Top-down view of the **3 numbered arrester wires**. **Slow-motion low-angle engagement** (sparks, the wire stretching into a V, impact shake). Pull-back with a **deck cutaway showing the cables running to the arresting engines** ("WIRE ABSORBS THE ENERGY") and the 2 s stop timer. |
| Twist | **Improved** | Low-angle chase shot; touchdown with tyre smoke and impact; "FULL POWER" with roar and shake; slow-motion orbit on "sunne mein ulta lagta hai"; **close-up of the hook skipping every wire** (sparks, red "MISSED!"); side-tracking bolter climb; the "not enough speed" ghost jet falls into the sea. |
| Backup | **Preserved + improved** | Low hero angle of the hooked jet at full power, with a depth-of-field ocean and the "Controlled crash." title. |
| Finale | **Regenerated** | A clean arrested landing in slow motion, a pull-back orbit reveal of Vikrant, then a horizon shot with the **tricolour rising**, warm horizon light, light rays and an "INS VIKRANT / BHARATIYA NAUSENA" title. Orchestral swell and a hit on the **new closing line**. |

Shared engine upgrades (all opt-in):
- Sky and horizon for low camera angles.
- A world-anchored ocean surface: it stays fixed in the world when the camera orbits.
- Depth-sorted, gradient-shaded hull, plus a cast shadow and waterline foam.
- Landing gear and fuselage volume on the jets.
- MiG-29K silhouettes for the jets parked on deck.
- An arresting-gear cutaway.
- Motion-blur ghosts.
- Light rays.
- Zoom-through transitions, plus cuts and match cuts used deliberately.
- Keyword typography.
- Upgraded captions:
  - the whole caption pops in with scale and opacity;
  - the active word springs;
  - key words keep a cyan accent;
  - the captions sit higher (y≈1300–1390) and narrower (920 px), inside Instagram's safe area.

Sound design (all synthesized, no third-party audio):
- Ocean and wind ambience in stereo.
- Jet rumbles, afterburner spool-ups and Doppler flybys.
- Lock clunks, cable-tension creak, sparks crackle, tyre chirps, steam hiss and burst, a servo whir, a splash.
- Cinematic impacts, a ratchet for the humour beat, and silence after the freeze-frame.
- An orchestral-style rise (layered string pads, timpani build, final hit).
- The music is ducked about 8 dB under the voice and the effects about 4 dB. Narration intelligibility was checked by transcribing it back from the busiest sections of the final mix.

## 2. Regenerated scenes
1. Cold open (new).
2. Catapult 3D cutaway + match cut.
3. Landing: first-person approach, hook close-up, slow-motion engagement, arresting-gear cutaway.
4. Finale.

The other scenes were improved in place (camera, compositing, timing); none were rebuilt from scratch.

## 3. Narration changes
- **Preserved:** all 36 original lines, word for word, re-voiced at a slightly faster pace (Piper `hi_IN-rohan-medium`, length scale 0.76).
- **Added, per the brief:**
  - line 0, "is ladaaku vimaan ko, utarne ke liye milte hain, sirf kuch second!" (0.3–3.8 s);
  - closing line, "samandar ke beech bhi, Bharat ki taaqat nahi rukti!" (99.8–102.7 s).
- **Humour:** the humour beat uses the existing line "Vikrant ke paas itni jagah nahi hai" rather than new dialogue, so the narration stays as it was.

## 4. Final timeline
| Time | Scene | Narration lines (Hinglish) | Shots |
|---|---|---|---|
| 0.0–4.2 s | cold | is ladaaku vimaan ko, utarne ke liye milte hain, sirf kuch second! | Extreme close-up of landing gear + deck rushing past → fast pull-back reveals ocean and carrier → jet rushes in from behind → freeze-frame before touchdown (flash, shake, impact) → 0.5 s silence. Keyword: SECONDS TO LAND |
| 4.2–14.7 s | hook | INS Vikrant ka runway / kisi aam airport ke runway ka, bas chhota sa hissa hai. / toh Tejas jaise fighter jet, is par udaan kaise bharte hain, aur utarte kaise hain? | Top-down drone: airport runway vs tiny deck, runway section the length of Vikrant highlighted (SUPER SHORT RUNWAY) → tilt/push to 3/4: Tejas launches on “udaan”, a second jet approaches on “utarte”. Prototype tag. |
| 14.7–24.8 s | imagine | sochiye, aap beech samandar mein, INS Vikrant ke deck par khade hain. / ek Tejas, sabse aage aakar taiyaar hota hai. / kuch hi second baad, woh hawa mein hai. / dekhiye kaise. | 90° orbit around Vikrant at sea (wake, light rays) → low-angle deck-level tracking as Tejas taxis to the take-off spot → side view from the port deck edge: launch up the ski-jump with motion blur |
| 24.8–33.7 s | runway | ek aam jet ko, raftaar pakadne ke liye, lamba runway chahiye. / Vikrant ke paas itni jagah nahi hai / isliye uske aage bana hai, ek ski-jump. | Side-tracking jet on a long airport runway (edge lights streaming) → crane up to top-down showing the long roll → humour beat: tiny carrier, crash-zoom, pause, ruler, ITNI SI JAGAH?! → fast push-in to the ski-jump (SKI-JUMP) |
| 33.7–47.4 s | skijump | Tejas engine ko poori taaqat par chalata hai / aur deck par lage block, use thaame rakhte hain. / block hatte hi, jet aage bhaagta hai / aur ramp use, upar ki or uchhaal deta hai. / khade-khade se seedha udaan tak, bas kuch hi second mein. | Rear low angle, engine spools to full power (heat haze, shake) → extreme close-up of wheels against restraining blocks → blocks retract, side-tracking run → camera parks at the ramp, 3D trajectory arc → crane up as the jet climbs |
| 47.4–54.9 s | catapult | duniya ke kai carrier, jet ko catapult se phenkte hain. / lekin Vikrant, ski-jump ke sahaare udaan bharwata hai. | Silent build, then 3D cutaway of a generic unmarked CATOBAR deck: steam cylinders fill, shuttle, release, water brake + steam burst (CATAPULT) → match cut, same framing, to Vikrant's ski-jump launch (STOBAR tag) |
| 54.9–70.3 s | landing | utarna, isse bhi mushkil hai. / Tejas ke neeche, ek hook latka hota hai. / touchdown ke waqt, pilot ka nishana hota hai / deck par bichhi moti steel ki taaron mein se, kisi ek ko pakadna. / hook jaise hi taar pakadta hai / jet lagbhag do second mein, poori tarah ruk jaata hai. | First-person final approach with HUD → underside close-up, hook drops (ARRESTING HOOK) → top-down over the 3 numbered wires → slow-motion low-angle engagement (sparks, V-stretch, shake) → pull-back with deck cutaway: arresting engines absorb the energy, 2 s timer |
| 70.3–86.3 s | twist | lekin asli twist yahan hai. / jaise hi pahiye deck ko chhoote hain / pilot engine ko full power par kar deta hai. / sunne mein ulta lagta hai. / lekin agar hook, har taar se chook jaaye / toh jet ke paas, phir se udne ki raftaar honi chahiye / warna woh seedha samandar mein girega. | Low-angle chase of the approaching jet → touchdown (tyre smoke, impact) → FULL POWER, slow orbit in slow motion → close-up: hook skips every wire (sparks, red MISSED) → side tracking bolter climb → ghost jet off the edge into the sea (NOT ENOUGH SPEED) |
| 86.3–92.0 s | backup | toh carrier par landing? / yeh ek controlled crash hai / jismein backup plan, pehle se taiyaar hai. | Low hero angle: hooked jet straining at full power, depth-of-field ocean, “Controlled crash.” title |
| 92.0–105.3 s | finale | kya aap chalte jahaaz par, jet utaarne ki himmat karenge? / yeh video us dost ko bhejiye / jise Bhartiya Nausena se pyaar hai. / samandar ke beech bhi, Bharat ki taaqat nahi rukti! | Clean arrested landing with slow-motion catch → pull-back orbit reveal of Vikrant at sea → horizon shot: tricolour rises, warm horizon, light rays, INS VIKRANT / BHARATIYA NAUSENA title, orchestral swell |

## 5. Unresolved factual and production issues

### Factual (narration not rewritten; flagged here)
- **Tejas as an INS Vikrant fighter.** The naval LCA (Tejas) is a developmental prototype. It made its first landing on INS Vikrant on 6 Feb 2023 during trials. The fighter that operates from Vikrant is the MiG-29K, and the Navy has not ordered a naval Tejas. The narration presents Tejas as the jet doing these operations at:
  - 10.1 s, "toh Tejas jaise fighter jet…";
  - 19.0 s, "ek Tejas, sabse aage aakar taiyaar hota hai";
  - 33.9 s, "Tejas engine ko poori taaqat par chalata hai";
  - 56.9 s, "Tejas ke neeche, ek hook latka hota hai".

  Mitigation in v2: an on-screen tag at 10 s ("NAVAL LCA TEJAS · PROTOTYPE · DECK TRIALS 2023"), and the jets parked on deck are shown as MiG-29K silhouettes.

  To fix this fully, say "MiG-29K" or "fighter jet" in those lines, or add a spoken note. That is your call.
- **"lagbhag do second mein… ruk jaata hai"** (67.4 s) is the commonly cited approximate figure for arrested landings in general, not a Vikrant-specific measurement. It is kept as narrated, and no other speeds, distances or landing statistics were added.
- **Restraining blocks** (36.3 s) are drawn as generic retractable chocks. This illustrates the STOBAR practice of holding the jet at full power and then releasing it; the exact hardware on Vikrant is not modelled.
- **Verified details shown on screen:**
  - Vikrant is about 262 m long and has 3 arrester wires.
  - Ski-jump: about 14° (the ramp is modelled at roughly 14.5°).
  - Vikrant launches jets from the ski-jump (STOBAR) and has no catapult.
  - The catapult scene uses a generic carrier, so Vikrant is never shown with a catapult.

### Production
- **Duration ≈105 s, above the 65–80 s target.** All 36 original lines are kept because the brief says not to cut explanations. To reach about 80–85 s, candidate trims are:
  - "dekhiye kaise" (0.9 s);
  - "sunne mein ulta lagta hai" (1.3 s);
  - "kya aap chalte jahaaz par, jet utaarne ki himmat karenge?" (3.4 s);
  - "yeh video us dost ko bhejiye, jise Bhartiya Nausena se pyaar hai" (3.7 s);
  - tightening the hook to "INS Vikrant ka runway, kisi aam airport ke runway ka bas chhota sa hissa hai" plus the question (about 2 s);
  - the 1.1 s catapult build-up.

  Together these give about 12–13 s. Getting lower needs a script decision from you.
- **Channel identity** is not added because no channel name or logo was provided. The end card has room under the title.
- **Rendering technology:** the project's 2.5D projection engine (SVG in Remotion), not a full 3D renderer. Depth of field, motion blur, volumetric light and reflections are approximated:
  - blurred ocean layers;
  - ghost frames;
  - screen-space light shafts;
  - shading gradients.

  There are no real-time reflections or ray-traced shadows. At extreme angles, painter's ordering can rarely cause small overlaps (for example, the island against a jet).
- **Stylisation choices:**
  - jets are drawn about 2× real scale for readability;
  - take-off rolls and approaches are time-compressed;
  - the airport runway is shortened.
- **Voice:** offline Hindi TTS, a male voice. It is clear when transcribed back, but less natural than a human narrator. If you record a voiceover, the timeline can be regenerated from it.

## 6. QA performed
- Full render inspected at 2.5 s intervals plus targeted frames around every scene change. Fixed during QA:
  - the jet leaving the frame during the cold-open pull-back;
  - a small runway shot;
  - the catapult framing;
  - the arresting-engine readability;
  - the finale flag overlapping the top bar;
  - the keyword letter spacing;
  - the ski-jump push-in framing;
  - the bolter tracking.
- `blackdetect` / `freezedetect`: no unintended black or frozen segments. The intentional freeze-frame is about 1 s and includes camera shake.
- Audio: −14.0 LUFS integrated; peaks below −1.5 dBTP; a true-silence beat at 3.9–4.15 s; narration back-transcribed from the busiest sections.
- Captions: word timings come from the same timeline that drives the animation. Captions stay inside y 1300–1390 and x 60–1020 on every frame.

---

# v3: daytime, faster motion graphics, 90 s

**Output:** `out/indian_navy_cinematic_v3_day_90s.mp4`
- 1080×1920, 30 fps, H.264 yuv420p, AAC 256 kb/s, about 90 s.
- Composition `IndianNavyV3Day`; v2 (night) and v1 are unchanged.

**Daylight.** A theme context (`src/navy/theme.ts`, `NIGHT` / `DAY`) recolours everything:
- blue sky with a sun glow and a sun-glint column on the sea;
- sunlit blue sea with white wave glints;
- naval-grey hull and island, a dark non-skid deck and crisp sea shadows;
- white wake and foam;
- green airport ground and a lighter vignette.

`NIGHT` reproduces the v1/v2 colours exactly.

**90 seconds without cutting any line.** All 38 lines are kept. I re-voiced them faster (Piper length scale 0.665 instead of 0.76) with tighter pauses:

| Pause | v2 | v3 |
|---|---|---|
| between clauses | 0.08 s | 0.05 s |
| between lines | 0.18 s | 0.10 s |
| between scenes | 0.34 s | 0.22 s |
| catapult build-up | 1.1 s | 0.5 s |

Final length is 90.15 s. Intelligibility was re-checked by back-transcription. All scene and camera timing is driven by the timeline, so the animation tightened automatically.

**Faster motion graphics (v3 only):**
- Keyword letters pop about 1.7× faster with an overshoot settle; labels and tags draw about 1.8× faster; captions pop in about 1.8× faster.
- Scene zoom-through transitions are 6/5 frames instead of 9/7.
- **New: speed streaks** on the cold-open approach, the launch, the runway roll, the ski-jump run, the catapult shot, the first-person approach and the bolter.
- **New: viewfinder brackets** snap onto the restraining blocks, the dropping hook, the wire engagement, the hook skipping the wires, and the final catch.
- The cold-open freeze-frame is placed relative to the shorter scene, at 2.6 s, so "sirf kuch second!" lands on the freeze.

The factual notes from v2 still apply (Tejas prototype tag, generic catapult carrier, 3 wires).

## v3 branding
`out/indian_navy_cinematic_v3_day_90s_branded.mp4` is the v3 (day, 90 s) render with **"Mindset mode | Explainers"** painted on INS Vikrant:
- **Flight deck:** "MINDSET MODE" in large deck lettering forward of the island, with "EXPLAINERS" below it. It reads from the stern, like real deck markings.
- **Port-side hull, midships:** "MINDSET MODE | EXPLAINERS". It is only drawn when that side faces the camera.

Both are projected onto the ship's surfaces, so they follow every camera move. Set via `BrandCtx` in `NavyV2.tsx` (v3 only); v1 and v2 have no branding.
