import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "path";
const [,, root, outDir, ...frames] = process.argv;
const serveUrl = await bundle({ entryPoint: path.join(root, "src/mindset/index.ts"), publicDir: path.join(root, "public") });
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell";
const composition = await selectComposition({ serveUrl, id: "MindsetVCD", browserExecutable });
for (const f of frames) {
  await renderStill({ composition, serveUrl, frame: Number(f), output: path.join(outDir, `s${f}.jpg`), imageFormat: "jpeg", scale: 0.5, browserExecutable });
  console.log("ok", f);
}
