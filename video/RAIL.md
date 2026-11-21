# Kambal kab dhula? — Bharatiya Rail edition

9:16, 49.4s, 30fps. Code in `src/rail/`, its own entry point (`src/rail/index.ts`).

- `theme.ts` — palette, branding text (भारतीय रेल), beat timings
- `parts.tsx` — 3D camera/berth, blanket, branded chadar, packet, printed cover, titles, pills
- `scenes.tsx` — hook/packet, attendant, laundry, "toh kambal bhi", calendar, berth story + end card
- `audio.tsx` — voiceover / train ambience / SFX slots (see `public/audio/README.md`)

```bash
npm run studio:rail     # preview
npm run render:rail     # → out/bharatiya-rail-kambal.mp4
```

In a sandbox without Chrome downloads, add
`--browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell --concurrency=1`.
