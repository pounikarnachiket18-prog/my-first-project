# Mindset Mode | Explainers – VCD (dead-man switch) remaster

Pipeline used to remaster the "train driver must press a button every minute" short:

1. **Colour + character/livery recolour** – `run_grade.py` (uses `grade.py`)
   - ABHI's shirt: light blue → saffron (with white-balance compensation during the red alarm shot)
   - Loco livery: blue → crimson & cream
   - New grade: violet/indigo nights, warm cream cab interior
   ```
   python3 run_grade.py tools/mindset source.mp4 public/mindset/graded.mp4
   ```
2. **Tracking** – `track2.py` produced the headlight / loco-decal tracks now baked into `src/mindset/tracks.ts`.
3. **Motion graphics** – Remotion composition `MindsetVCD` (`src/mindset/`, own entry point, offline fonts):
   headlight glows + beams, ABHI / NACHI name tags (cover the old LP / ALP labels), brand bar, brand end plate
   (replaces the old channel name), loco-side brand decal, speed lines, cut flashes, Zzz, alarm edges, dust/stars, grain.
   ```
   npm run render:mindset
   ```
4. **Audio** – `mix_audio.sh` layers the train SFX (passing train, horn/arrival, inside-train ambience, synthetic brake
   squeal) under the narration with side-chain ducking, normalised to −14 LUFS. Then mux:
   ```
   ffmpeg -i out/mindset-vcd-silent.mp4 -i mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest out/mindset-vcd.mp4
   ```

Source media (input video, graded video, SFX) are not committed.
