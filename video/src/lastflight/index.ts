// Separate Remotion entry for THE LAST FLIGHT.
//   npx remotion render src/lastflight/index.ts LastFlightSilent out/lf.mp4 --muted
import { registerRoot } from "remotion";
import { LFRoot } from "./LFRoot";

registerRoot(LFRoot);
