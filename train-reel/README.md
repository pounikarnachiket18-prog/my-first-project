# Reel: Why Indian train announcements come in pauses

A 1080×1920, 88-second vertical reel made entirely of code-drawn motion graphics
(Remotion + React/SVG) with a soundtrack synthesised from scratch in Python.

## 14 scenes
| # | Scene | What animates |
|---|-------|---------------|
| 1 | Hook | Train pulls into a night platform, chime rings from a loudspeaker, LED board: "यात्रीगण कृपया ध्यान दें…" |
| 2 | Title | Train crosses behind "come in PAUSES?" |
| 3 | Listen closely | "Gaadi sankhya… 1… 2… 9… 5… 1" with a waveform that has real silent gaps |
| 4 | The secret | Mic crossed out → announcement computer sends out a library of clips |
| 5 | Recorded once | Tape machine records, the audio ribbon is cut into clips that drop into a library |
| 6 | How does it know? | Live train data flies into the announcement template |
| 7 | How it's built | Clips are stitched into a sentence and a playhead plays it back, gaps included |
| 8 | Why not full sentences? | Combinations add up to "MILLIONS" vs a few thousand clips |
| 9 | Digit by digit | 10 digit clips cover every train number; short digits are easier to hear over noise |
| 10 | Why it sounds robotic | Pitch contour: one smooth line vs jumps at every joint |
| 11 | Languages | Split-flap board and cards for Hindi, English, Marathi, Tamil, Bengali, Telugu |
| 12 | Every station | Network of stations pulsing from a central clip library |
| 13 | It works | 24×7, the same clear voice, easy updates, low cost |
| 14 | Outro | Horn, train departs, CTA |

## Commands
```bash
npm i
pip install numpy scipy
npm run audio    # writes public/soundtrack.wav (synced to src/timeline.json)
npm start        # Remotion Studio preview
npm run render   # out/train-announcement-reel.mp4
```
All timings live in `src/timeline.json`. Both the scenes and the audio script read from it,
so changing a timing there moves the picture and the sound together (re-run `npm run audio`).
