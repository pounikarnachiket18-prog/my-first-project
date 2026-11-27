// Separate Remotion entry for the "Earth stopped rotating" reel.
//   npx remotion render src/earth/index.ts EarthStopped out/earth_stopped_rotating_final.mp4
import { registerRoot } from "remotion";
import { EarthRoot } from "./EarthRoot";

registerRoot(EarthRoot);
