# चींटी वीर · Cheenti Veer: a 20 s Hindi reel

An original Indian shrinking-hero micro-drama, vertical 1080×1920 at 30 fps.
Inspired by the "tiny hero" idea but with its own name, suit and story (no Marvel characters, names or designs).

**Story.** Dadi's ring rolls under the steel almirah. Arjun twists his copper *kada*, shrinks to ant size,
rides a red ant through mountains of dust, lifts the giant ring overhead, grows back, and returns it.
Dadi blesses him: "जीते रहो बेटा!" End card: *छोटा कद… बड़ा दिल* (small in size, big in heart).

Built in the style of the 3D-scene videos in
[awesome-opus5-5-videos](https://github.com/yihui-dev/awesome-opus5-5-videos): every character, set, light and
camera move is written in code with Three.js, then recorded frame by frame.

| Part | How |
|---|---|
| Characters, sets, ant | Procedural Three.js geometry (`scene.js`), no downloaded models |
| Look | ACES tone mapping, soft shadows, room-environment reflections, bloom |
| Voice | Hindi, offline Kokoro TTS (narrator `hm_omega`, Dadi `hf_beta`) |
| Music and sound | Synthesised in `tools/build_audio.py`: tanpura-style drone, tabla-like groove, bansuri-style melody, effects |
| Captions | Hindi with English underneath, timed from the generated voice (`subs.js`) |

## Rebuild

```bash
python3 -m venv audiovenv && audiovenv/bin/pip install kokoro-onnx soundfile scipy
# model files: kokoro-v1.0.onnx + voices-v1.0.bin from github.com/thewh1teagle/kokoro-onnx/releases (model-files-v1.0)
audiovenv/bin/python tools/build_audio.py /path/to/kokoro_models   # build/mix.wav + subs.js
node render.js                                                     # out/cheenti_veer_20s.mp4 (needs Playwright + ffmpeg)
node render.js --stills 4.4,13.9                                   # single check frames
```

Open `index.html` through any local web server to watch the animation loop live (without the audio).

Licences: Three.js (MIT, `vendor/three-LICENSE.txt`), Inter and Noto Sans Devanagari (SIL OFL, `fonts/`).
