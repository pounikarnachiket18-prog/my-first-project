// Entry for the new-storyline video (sleeping passenger version).
// Studio:  npm run studio:story     Render:  npm run render:story
// Put your recorded voiceover at public/audio/story-voiceover.mp3,
// then retime src/story/timeline.ts to match it.
import { registerRoot } from "remotion";
import { StoryRoot } from "./StoryRoot";

registerRoot(StoryRoot);
