# Mindset Mode Explainers: complete requirements for 3D explainer reels

Everything you need to make reels like the announcement reel and the kambal explainer, again and again.
Tick each box per episode.

---

## 1. Hardware

| Item | Minimum | Recommended | Why |
|---|---|---|---|
| Computer | 8 GB RAM, any recent CPU | **16–32 GB RAM, NVIDIA RTX 3060 or better**, 1 TB SSD | Blender 3D rendering needs a good GPU; editing needs RAM |
| Microphone | Phone + quiet room | USB mic or wireless lav mic | Clear voice is the #1 quality signal |
| Headphones | Any wired earphones | Closed-back studio headphones | Check voice and sound mix |
| Recording space | Quiet room, door closed | Room with curtains, carpet, cupboards full of clothes | Kills echo |
| Phone | Any smartphone | Latest one you have | Recording, previewing reels, posting |
| Storage / backup | Google Drive / external drive | 1 TB external SSD + cloud | Keep project files (proof of ownership) |
| Internet | Stable broadband | 50 Mbps+ | Uploads, AI tools, asset downloads |

---

## 2. Software

| Job | Free option | Paid / pro option |
|---|---|---|
| Script & research | Google Docs | Notion |
| Voice recording | Phone voice recorder, **Audacity** | Adobe Audition |
| Voice clean-up | Audacity noise reduction | Adobe Podcast Enhance, iZotope RX |
| **3D scenes** | **Blender** (Eevee renderer) | Cinema 4D |
| 3D characters & motion | **Mixamo** (free, Adobe account) | Character Creator |
| UI / screen designs | Figma, Canva | Adobe Illustrator |
| **Motion graphics** (titles, callouts, swooshes) | Canva, CapCut, **Remotion** (what Claude uses: code-based, Node.js) | Adobe After Effects |
| **Editing** | **DaVinci Resolve**, CapCut | Premiere Pro, Final Cut Pro |
| Thumbnails / covers | Canva | Photoshop |
| AI video B-roll (optional) | Free tiers of Google Flow/Veo, Kling, Runway | Paid plans of the same |
| AI voice (optional, licensed only) | (none) | ElevenLabs or similar (commercial plan) |
| Subtitles | CapCut auto-captions | Premiere auto-captions |
| File conversion | HandBrake, ffmpeg | (none) |

For Claude's Remotion setup (already done in this repo): Node.js 18+, the `video/` project, Chromium (bundled), ffmpeg.

---

## 3. Assets (only use licensed or self-made)

| Asset | Safe sources | Note |
|---|---|---|
| 3D models | **Poly Haven** (CC0), **Kenney** (CC0), Sketchfab (filter "Downloadable" + check licence: CC0 / CC-BY needs credit) | Low-poly + flat colours = the channel look |
| Textures / HDRI lights | Poly Haven (CC0) | (none) |
| Character animations | Mixamo | Free for commercial use with Adobe account |
| Fonts (Hindi + English) | Google Fonts (OFL): **Baloo 2, Mukta**, Hind, Poppins, Noto Sans Devanagari | Already embedded in this project |
| Icons | Google Material Symbols, Lucide (open licences) | Avoid copying other brands' icons |
| Emoji | Platform emoji / Noto Color Emoji | (none) |
| Sound effects | **Original kit in `video/public/sfx/`** (made by Claude), Freesound (check CC0 vs CC-BY), YouTube Audio Library, Pixabay (read the licence) | Keep a licence log |
| Music | YouTube Audio Library, Pixabay Music, or a paid library (Epidemic Sound / Artlist) | Never trending film songs (copyright claims) |
| Stock footage | Pexels, Pixabay (check licence) | (none) |
| Your own clips | Your earlier reels (e.g. the branded train) | Best: reuse your own work |

**Avoid:** the official Indian Railways logo/emblem, other creators' clips, voices, scripts or exact scene layouts, film/TV music.

---

## 4. Brand kit (make once, reuse forever)

- [ ] **Name & handle:** Mindset Mode Explainers (same on every platform)
- [ ] **Logo:** "M" in a circle (maroon), white pill badge
- [ ] **Colours:** maroon `#A3192E`, blue `#2F44E0`, yellow `#FFD23F`, ink `#15171C`, beige `#F4EBDC`, green `#1DB954`
- [ ] **Fonts:** Baloo 2 (titles), Mukta (labels / subtitles)
- [ ] **Title style:** white spotlight ellipse, line 1 dark, line 2 maroon, blue underline swoosh
- [ ] **Transition:** red + blue diagonal swoosh wipe
- [ ] **Callouts:** red rings + blue numbered circles, ticket-stub / pill labels
- [ ] **Progress line:** thin red line with small train at the top
- [ ] **Intro:** branded train clip (≤1.5 s). **Outro:** badge + "Follow karo 🔔"
- [ ] **Sound signature:** swoosh on cuts, pop on labels, ding on reveals, horn on outro
- [ ] Template project with all of the above (this repo already has them in `src/story/Recut.tsx`, `src/remix/fx.tsx`, `src/rail/parts.tsx`)

---

## 5. Skills to learn (in this order)

1. Hinglish script writing: hook in 3 seconds, one idea per line, 110–130 words for ~45 s
2. Voice delivery: energetic, clear, pauses before reveals
3. Basic editing: cut on voice, J/L cuts, keyframes, speed ramps
4. Sound mixing: voice loud and clear, music −20 to −25 dB under voice
5. Motion graphics: text animation, masks, easing
6. Blender basics: low-poly modelling, materials, lighting (Eevee), camera animation, rendering image sequences
7. Character animation with Mixamo + Blender
8. Colour consistency (same palette every episode)

Free learning: Blender Guru "Donut" series and low-poly tutorials on YouTube, DaVinci Resolve official training, Remotion docs (remotion.dev).

---

## 6. Pre-production checklist (per reel)

- [ ] **Topic** chosen (curious question + useful answer)
- [ ] **Fact check** with at least 2 reliable sources: Indian Railways official sites, PIB press releases, Ministry statements, reputable news, RTI replies. Save the links.
- [ ] **Script**: hook → 3–5 facts → tip → recap → CTA (110–130 words)
- [ ] **Originality check**: your own wording and structure, not copied from another reel
- [ ] **Storyboard**: table of line → visual → on-screen text → sound effect
- [ ] **Shot list**: which shots are 3D, which are motion graphics, which are reused clips
- [ ] **Asset list** with licence for each item

---

## 7. Production pipeline

| Step | What | Output | Time (approx.) |
|---|---|---|---|
| 1 | Record voiceover (3–4 takes, pick best) | `voiceover.wav` | 30 min |
| 2 | Clean voice (noise reduction, normalise) | clean VO | 15 min |
| 3 | Build / render 3D scenes | short clips per shot | 3–10 h (less as you reuse sets) |
| 4 | Motion graphics (titles, callouts, counters) | overlays / composited scenes | 1–3 h |
| 5 | Edit: cut to voice, add transitions | timeline | 1–2 h |
| 6 | Sound design: SFX + ambience + music | final mix | 30–60 min |
| 7 | Subtitles (inside safe zone) | burned-in or SRT | 20 min |
| 8 | Review on a phone (watch twice, muted and unmuted) | fix list | 15 min |
| 9 | Export (specs below) | `final.mp4` | 10 min |
| 10 | Cover/thumbnail, caption, hashtags | post-ready pack | 30 min |

**Reuse saves the most time:** build the station, coach, berth and characters once, then reuse them in every episode with new camera angles.

---

## 8. Technical specs

| Setting | Value |
|---|---|
| Resolution / ratio | **1080 × 1920 (9:16)** |
| Frame rate | 30 fps |
| Video codec | H.264 (MP4), high quality (CRF ~18 or 12–20 Mbps) |
| Audio | AAC, 48 kHz, 192–320 kbps |
| Loudness | about **−14 LUFS** integrated, peaks below −1 dB |
| Length | 30–60 s (sweet spot 40–50 s) |
| Safe zone | Keep text/faces away from the top ~250 px, bottom ~450 px and right ~120 px (platform buttons and captions cover these). Check with each platform's safe-zone overlay. |
| Subtitles | Large (40–50 px+), high contrast, 1–2 lines, above the bottom safe margin |
| Cover frame | Clear title + key visual in the centre 1080 × 1350 area (grid crop) |

---

## 9. Legal & copyright checklist

- [ ] Script written by you, in your own words (facts are free; wording is not)
- [ ] Voice is yours, or a licensed AI voice with commercial rights
- [ ] No footage, audio or exact scene layouts from other creators
- [ ] Every 3D model, sound, music and font has a licence you saved (CC0 / CC-BY credited / paid licence)
- [ ] No official logos or trademarks used as if you are that organisation (e.g., Indian Railways emblem)
- [ ] AI-generated content disclosed where the platform's rules ask for it (check YouTube / Instagram policy at the time of posting)
- [ ] No real person's likeness or voice without permission
- [ ] Facts checked; claims like fines or penalties double-checked
- [ ] Project files, recordings and licence log backed up (your proof of authorship)

No edit can make a video "copyright-proof"; original work + licences + records keep the risk low.

---

## 10. Publishing checklist

- [ ] Platforms: Instagram Reels, YouTube Shorts, Facebook Reels (same file)
- [ ] Hook-style caption + 3–5 bullet facts + CTA (see earlier caption template)
- [ ] 8–15 relevant hashtags (topic + niche + brand `#MindsetModeExplainers`)
- [ ] YouTube Shorts title (under 60 characters) + description + `#Shorts`
- [ ] Custom cover image / first frame
- [ ] Pinned comment with a question (boosts comments)
- [ ] Post at your audience's active time (check Insights)
- [ ] After 48 h: check retention, shares, saves; note what to improve

---

## 11. Budget overview

| Level | What you pay for | Rough monthly cost |
|---|---|---|
| Free | Nothing: Blender, DaVinci Resolve, Audacity, Canva free, CapCut, free asset sites, Claude for graphics/editing | ₹0 (plus your time) |
| Starter | A good mic (one-time) + Canva Pro or CapCut Pro | Low (check current prices) |
| Pro | Adobe apps, music library, AI video/voice credits | Medium–high (check current prices) |

Start free; upgrade the mic first.

---

## 12. What to give Claude for each new reel

1. Topic (or ask for topic ideas)
2. Approved script, or ask Claude to write one
3. **Your voiceover file** (WAV or MP3)
4. Any of your own clips to reuse (e.g., branded train)
5. Any extra licensed music or sound effects
6. Changes to the brand kit (if any)

Claude then: storyboard → motion graphics in the channel style → timing to your voice → sound effects → 1080 × 1920 render → caption + hashtags.

---

## 13. Folder structure (keep every project the same)

```
MindsetMode/
  00_brand-kit/        logo, colours, fonts, templates, intro/outro clips
  01_assets/           3D models, sfx, music, icons (+ licences.txt)
  episodes/
    2026-11_kambal/
      01_script/       script.docx, sources.txt
      02_voice/        raw takes, voiceover-final.wav
      03_3d/           blender files, renders
      04_graphics/     overlays, remotion project
      05_edit/         edit project, final.mp4
      06_publish/      cover.png, caption.txt
```
