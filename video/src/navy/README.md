# INS Vikrant / Tejas explainer (Hindi, Indian Navy)

Vertical 1080x1920 explainer: how a Tejas takes off from INS Vikrant's ski-jump and
lands with arresting wires. Hindi voiceover, Hinglish word-highlight captions.

Pipeline
1. `scripts/navy_script.py` – the narration (Hindi for the voice, Hinglish for captions).
2. `python3 scripts/build_voice.py <hi_IN-rohan-medium.onnx> public/navy` – Piper TTS
   voiceover + `src/navy/timeline.json` (scene/word timings that drive the animation).
   Voice model: Piper `hi_IN-rohan-medium` (e.g. from the sherpa-onnx `tts-models` release).
3. `python3 scripts/build_mix.py` – synthesized music bed + SFX mixed under the voice
   -> `public/navy/mix.wav` (then loudness-normalised to -14 LUFS with ffmpeg `loudnorm`).
4. `python3 scripts/add_hook_offset.py` – delays the narration so it starts over the
   live-action hook clips (`public/navy/hookA.mp4`, `hookB.mp4`), then re-run step 3.
5. `npm run render:navy` (set `REMOTION_CHROME` to a chrome-headless-shell binary if needed).
