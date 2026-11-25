// usage: COMP=... GL=swangle node scripts/stills_gl.mjs <outdir> <frame,frame,...> [scale]
import { bundle } from "@remotion/bundler";
import { selectComposition, renderStill } from "@remotion/renderer";
import path from "node:path";
const [outDir, list, sc] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve("src/navy/index.ts") });
const browserExecutable = process.env.REMOTION_CHROME;
const chromiumOptions = { gl: process.env.GL ?? "swangle" };
const composition = await selectComposition({ serveUrl, id: process.env.COMP, browserExecutable, chromiumOptions });
for (const fr of list.split(",").map(Number)) {
  const t0 = Date.now();
  await renderStill({ serveUrl, composition, frame: fr, output: `${outDir}/f${String(fr).padStart(5, "0")}.png`, browserExecutable, chromiumOptions, scale: Number(sc ?? 0.5), timeoutInMilliseconds: 120000 });
  console.log("frame", fr, (Date.now() - t0) + "ms");
}
console.log("done");
