// Entry for the "5 cheezein, 1 raaz" explainer reel.
// Studio: npm run studio:explainer    Render: npm run render:explainer
// Voiceover: public/audio/explainer-voiceover.mp3, then retime script.ts.
import { registerRoot } from "remotion";
import { ExplainerRoot } from "./ExplainerRoot";

registerRoot(ExplainerRoot);
