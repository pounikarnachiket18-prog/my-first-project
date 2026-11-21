// Stand-alone entry for the Bharatiya Rail video (no network fonts needed).
// Studio:  npx remotion studio src/rail/index.ts
// Render:  npm run render:rail
import { registerRoot } from "remotion";
import { RailRoot } from "./RailRoot";

registerRoot(RailRoot);
