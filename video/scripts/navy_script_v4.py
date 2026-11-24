"""v4 (day, branded, ~60 s): v2/v3 narration with lines cut for length.
Line numbering is kept (scenes reference lines by index); SKIP lines are not voiced or captioned and take no time.
Scenes left with no spoken line (imagine, catapult) are dropped from the timeline."""
from navy_script_v2 import LINES, SCENES

VOICE_FILE = "voice_v4.wav"
PACE = {"lead": 0.2, "clause": 0.05, "line": 0.08, "scene": 0.18, "tail": 2.6, "length_scale": 0.65}
SCENE_GAP_AFTER = {"cold": 0.35}
SKIP = {4, 5, 6, 7, 8, 15, 16, 17, 27, 34, 35, 36}
