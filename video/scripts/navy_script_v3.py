"""v3 (day, 90 s): same narration as v2 (all 36 original lines + cold open + closing line),
re-voiced with tighter pacing to land at ~90 s."""
from navy_script_v2 import LINES, SCENES

VOICE_FILE = "voice_v3.wav"
PACE = {"lead": 0.2, "clause": 0.05, "line": 0.1, "scene": 0.22, "tail": 1.9, "length_scale": 0.665}
SCENE_GAP_AFTER = {"cold": 0.45, "skijump": 0.5}
