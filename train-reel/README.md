# Reel: Why Indian train announcements come in pauses (3D)

A 1080×1920, 32.5-second vertical reel built as a real 3D scene with Remotion,
three.js and React Three Fiber. Its visual style follows the reference reel: a clean white
station, a red train with motion blur, horn speakers, a hanging LED board, the
announcement room and floating Hindi clip cards. The reference reel's audio is used unchanged
(`public/reference-audio.m4a`). Shots are timed to the reference's beats.

## 14 shots
| # | Time | Shot |
|---|------|------|
| 1 | 0–3.0s | Horn speakers and LED board, train rushing past, title "Announcement ruk-ruk ke kyun?" |
| 2 | 3.0–4.8s | Clip cards pop out of the speaker: गाड़ी संख्या · एक · दो |
| 3 | 4.8–6.0s | Camera flies down the platform |
| 4 | 6.0–7.0s | उद्घोषणा कक्ष / ANNOUNCEMENT cabin, push through the glass |
| 5 | 7.0–8.0s | Inside the control room: desk, gooseneck mic, monitor, hands |
| 6 | 8.0–10.0s | Operator screen: train list, row 12846 selected, fingers typing |
| 7 | 10.0–13.0s | Values pop up: 12846 → PF 3 → 18:40 |
| 8 | 13.0–16.0s | Time typed into the form, ANNOUNCE pressed, status "Playing" |
| 9 | 16.0–18.0s | Media tab: the library of 24 pre-recorded Hindi clips |
| 10 | 18.0–22.2s | Clips picked into the announcement sequence and played with gaps |
| 11 | 22.2–24.5s | Back on the platform, the Vande Bharat-style nose glides in, cards emerge from the speaker |
| 12 | 24.5–28.5s | Wall of clip cards over the moving train, played in order, with timers in the gaps |
| 13 | 28.5–31.5s | Close-up, blue PAUSE marker in the gap between two clips |
| 14 | 31.5–32.5s | Horns, board and title again |

Train *12846 Suraj Nagar Exp* and every name on the operator screen are fictional.

## Files
- `src/Reel.tsx`: shot list, camera moves, card and train timing
- `src/three/Parts.tsx`: 3D models (station, endless train, horns, board, cabin, room, hands, cards)
- `src/three/textures.ts`: canvas-drawn textures (train livery and blur, tiles, LED board, cards)
- `src/three/screenUI.ts`: operator software drawn live onto the monitor
- `src/timeline.json`: shot start frames and lengths

## Commands
```bash
npm i
npm start        # Remotion Studio preview
npm run render   # out/train-announcement-reel.mp4
```
Rendering uses WebGL through SwiftShader (`--gl=swangle`, set in `remotion.config.ts`), so it works without a GPU.

---

# Reel 2: How does a jammer work? (`Jammer` composition)

A 45 s, 1080×1920 reel in the same 3D style. It's set in an exam-hall diorama with a phone, a cell tower,
an RF jammer, signal and noise waves, and a range dome. Captions are in Hinglish, and the music and sound effects are synthesised in Python.

| # | Time | Shot |
|---|------|------|
| 1 | 0–3s | Phone on an exam desk: full bars → **No Service** |
| 2 | 3–5.5s | Title "Jammer kaam kaise karta hai?" over the jammer |
| 3 | 5.5–10.5s | Tower ↔ phone radio link on a fixed frequency band |
| 4 | 10.5–14.5s | Jammer switches ON and floods the same band with noise |
| 5 | 14.5–19.5s | Panel: tower signal + jammer noise = garbage at the phone |
| 6 | 19.5–23.5s | Signal vs noise meter; ✕ Calls ✕ Internet ✕ SMS |
| 7 | 23.5–28.5s | Range dome: no signal inside, normal outside |
| 8 | 28.5–33s | Jammer switched OFF → bars climb back, ✓ Calls · Internet · SMS |
| 9 | 33–37.5s | "Kahan use hota hai?": exam centre, jail, VIP/security |
| 10 | 37.5–41.5s | "India mein bina permission jammer = illegal" stamp |
| 11 | 41.5–45s | Outro: Mindset mode \| Explainers |

```bash
npm run jammer:audio    # public/jammer-audio.wav
npm run jammer:render   # out/jammer-reel.mp4
```
