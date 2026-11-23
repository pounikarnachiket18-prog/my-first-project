// Entry for the motion-graphics remix of the original reel.
// Needs public/video/remix-base.mp4 (made by original-edit/ scripts, not committed).
// Studio:  npx remotion studio src/remix/index.ts
// Render:  npm run render:remix
import { registerRoot } from "remotion";
import { RemixRoot } from "./RemixRoot";

registerRoot(RemixRoot);
