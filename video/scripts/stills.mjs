// usage: node scripts/stills.mjs <outdir> <frame,frame,...>
import { bundle } from "@remotion/bundler";
import { selectComposition, renderStill } from "@remotion/renderer";
import path from "node:path";
const [outDir, list] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve("src/navy/index.ts") });
const browserExecutable = process.env.REMOTION_CHROME;
const composition = await selectComposition({ serveUrl, id: "IndianNavy", browserExecutable });
for (const fr of list.split(",").map(Number)) {
  await renderStill({ serveUrl, composition, frame: fr, output: `${outDir}/f${String(fr).padStart(5, "0")}.png`, browserExecutable, scale: 0.5 });
}
console.log("done");
