# VCD (dead-man switch) explainer – remaster pipeline

1. **Colour + character recolour + logo paint-out** – `run_grade3.py` (uses `grade2.py`, `grade.py`, `tracks.json`)
   - ABHI's shirt: light blue → forest green, shading-preserving, per-shot spatial gates;
     during the red-alarm shot the mask comes from the untinted pulse frames.
   - Train keeps its original Bharatiya Rail livery; the old channel logo on the loco side and the
     channel name on the end card are painted out (inpainted).
   - Grade: violet/indigo nights, warm cream cab interior.
   ```
   python3 run_grade3.py tools/vcd source.mp4 public/vcd/graded.mp4
   ```
2. **Tracking** – `track2.py` produced the headlight tracks (`src/vcd/tracks.ts`) and the logo
   positions (`tracks.json`) used for the paint-out.
3. **Motion graphics** – Remotion composition `VCDExplainer` (`src/vcd/`, own entry point, offline fonts):
   headlight glows + beams, ABHI / NACHI name tags (cover the old LP / ALP labels), the lota-uncle gag
   by the tracks (`Uncle.tsx`), speed gauge, wheel sparks, button tap pulses, alertness meter,
   warning badge, comment bubble, speed lines, cut flashes, Zzz, alarm edges, dust/stars, grain.
   ```
   npm run render:vcd
   ```
4. **Audio** – `mix_audio.sh` layers the train SFX (passing train, horn/arrival, inside-train ambience,
   synthetic brake squeal, whoosh/slide-whistle for the uncle) under the narration with side-chain
   ducking, normalised to −14 LUFS. Then mux:
   ```
   ffmpeg -i out/vcd-explainer-silent.mp4 -i mix.wav -map 0:v -map 1:a -c:v libx264 -crf 19 -c:a aac -b:a 192k -shortest out/VCD_Explainer.mp4
   ```

Source media (input video, graded video, SFX) are not committed.
