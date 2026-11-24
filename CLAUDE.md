# Mindset Mode Explainers: reel production repo

Hinglish 1-minute explainer reels (9:16, 1080×1920, 30 fps) built with **Remotion** in `video/`.
Full human-facing requirements: `video/REEL-PRODUCTION-GUIDE.md`.

## Projects (each has its own entry point)

| Entry | Composition | What |
|---|---|---|
| `src/explainer/index.ts` | `Explainer` | "5 cheezein, 1 raaz" kambal explainer, **the template for new episodes** |
| `src/story/index.ts` | `Story` | Kambal re-cut (storyline version) |
| `src/rail/index.ts` | `RailKambal` | First rebuild (do not reuse its layouts: they mirror another creator's reel) |
| `src/remix/index.ts` | `Remix` | Remix of third-party footage: **not for publishing** |

Shared building blocks:
- `src/rail/theme.ts`: palette `C` (maroon brand), embedded fonts (Baloo 2 + Mukta, Devanagari), `s()` seconds→frames
- `src/rail/parts.tsx`: pseudo-3D `World`/`Slab`/`useCam`, `CheckPattern`, `ChadarTop`, `PacketTop`, `PrintedCover`, `Title` (wrap in `TitleStyle.Provider value="spot"` for the channel's spotlight titles), `Pill`
- `src/story/Recut.tsx`: channel style: `Swoosh` (red/blue wipe), `TrainProgress`, `Ring` callouts, `Clip` (own train clips), `FollowSlate`
- `src/remix/fx.tsx`: `BrandBadge`, stickers, stamps, sparkles, bubbles
- `public/sfx/*.wav`: original synthesized SFX (safe to use)

## New episode workflow
1. Copy `src/explainer/` to `src/<episode>/`; rename composition; add `studio:`/`render:` npm scripts.
2. Put script lines, scene times and SFX cues in `script.ts`.
3. Voiceover from the user goes to `public/audio/<episode>-voiceover.mp3` (gitignored); retime `script.ts` to it.
4. Keep subtitles inside the safe zone (≥ ~450 px from the bottom), mix to about −14 LUFS.

## Rendering in a Claude Code cloud session
- Run `npm install` in `video/` if `node_modules` is missing.
- Chrome download is blocked; use the preinstalled headless shell:
  `--browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`
- Bundle first, then render from the bundle: `npx remotion bundle src/<x>/index.ts --out-dir <tmp>`, then `npx remotion render <tmp> <Comp> out/<name>.mp4 --timeout=90000 --browser-executable=...`
- Fonts are embedded as data URLs and awaited in the root component (`useFonts`). Do not use module-level `delayRender` or `@remotion/google-fonts` (they stall in headless Chromium here).
- Check a few `remotion still` frames before a full render (about 10 min per 50 s reel). Run long renders in the background.
- `out/`, `public/audio/*.mp3`, `public/video/` are gitignored (third-party or licensed media must not go into this public repo).

## Content rules
- Own script and own voice only; facts may be reused, wording and scene layouts may not.
- Never reuse the reference reel (@oneminexplains) footage, voice, script or its scene compositions.
- Own clips from the user's earlier Mindset Mode reels are fine.
- No official Indian Railways logo; fact-check claims (fines, frequencies) and say so to the user.
