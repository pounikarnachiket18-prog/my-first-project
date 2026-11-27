# How a bullet is fired: kinetic-text explainer (5 s)

Made from the **@IncognitoPrince** prompt in
[awesome-opus5-5-videos](https://github.com/yihui-dev/awesome-opus5-5-videos/blob/main/prompts/incognitoprince-849212.md):

> Create a 1-minute explainer video about [Topic] featuring After Effects style kinetic text animations.
> Use HTML/CSS/JS to render the animation with smooth transitions, bold typography, and timed reveals.
> The final output should be a standalone web-based animation file that can be recorded or exported as a video.

Topic: how a bullet is fired. Length: 5 s instead of 1 minute.
Beats: title → 01 STRIKE → 02 SPARK → 03 PRESSURE → 04 FIRE!, with Hindi lines and English captions.

- `bullet_kinetic.html`: the standalone animation file (fonts inlined). Open it in a browser; it loops.
- `src/bullet_kinetic.src.html`: the editable source; `build.py` inlines the fonts into the standalone file.
- `render.js`: records 300 frames (60 fps) with Playwright, adds the audio from `sfx.py`, and writes `out/bullet_kinetic_5s.mp4`.
- `fonts/`: Inter and Noto Sans Devanagari (SIL Open Font License).
