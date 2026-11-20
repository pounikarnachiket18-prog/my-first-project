// Renders clean Google Flow ingredient images: node scripts/ingredients.mjs <outDir>
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "path";
const out = process.argv[2] ?? "out/flow-ingredients";
const views = ["train-nose", "train-side", "loudspeaker", "departure-board", "station-platform", "announcement-cabin", "control-room", "operator-screen", "clip-library-screen", "clip-cards"];
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const chromiumOptions = { gl: "swangle" };
for (const [i, view] of views.entries()) {
  const inputProps = { view, theme: "classic" };
  const composition = await selectComposition({ serveUrl, id: "Ingredient", browserExecutable, chromiumOptions, inputProps });
  await renderStill({ composition, serveUrl, frame: 0, output: `${out}/${String(i + 1).padStart(2, "0")}-${view}.png`, browserExecutable, chromiumOptions, inputProps, timeoutInMilliseconds: 120000 });
  console.log("rendered", view);
}
