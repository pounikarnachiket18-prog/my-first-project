// Standalone entry for the Indian-roads reel:
//   npx remotion render src/india/index.ts IndiaRoadReel out/indian-roads-reel.mp4
import { registerRoot } from "remotion";
import { IndiaRoot } from "./IndiaRoot";

registerRoot(IndiaRoot);
