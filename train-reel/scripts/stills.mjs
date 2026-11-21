// Usage: node scripts/stills.mjs <outDir> <frames...>   (THEMES=night,sunset env for theme variants)
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "path";
const out = process.argv[2];
const frames = process.argv.slice(3).map(Number);
const themes = (process.env.THEMES ?? "default").split(",");
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const chromiumOptions = { gl: "swangle" };
for (const theme of themes) {
  const inputProps = { theme, audio: false };
  const composition = await selectComposition({ serveUrl, id: process.env.COMP ?? "Reel", browserExecutable, chromiumOptions, inputProps });
  for (const f of frames) {
    const name = themes.length > 1 ? `${theme}_f${String(f).padStart(4, "0")}` : `f${String(f).padStart(4, "0")}`;
    await renderStill({ composition, serveUrl, frame: f, output: `${out}/${name}.png`, browserExecutable, chromiumOptions, inputProps, scale: 0.5, timeoutInMilliseconds: 120000 });
    console.log("frame", theme, f);
  }
}
