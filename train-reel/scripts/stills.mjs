import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "path";
const out = process.argv[2];
const frames = process.argv.slice(3).map(Number);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const composition = await selectComposition({ serveUrl, id: "Reel", browserExecutable });
for (const f of frames) {
  await renderStill({ composition, serveUrl, frame: f, output: `${out}/f${String(f).padStart(4, "0")}.png`, browserExecutable, scale: 0.5 });
  console.log("frame", f);
}
