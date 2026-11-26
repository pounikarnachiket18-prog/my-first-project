"""FINAL 60 s: Rudra ElevenLabs recording fitted to the reel. Lines/scenes = navy_script_h8 (Mumbai->Karachi, JustKnow It).
Chunks from Whisper (voiceover/elevenlabs_rudra_final_segments.json) -> script lines."""
from navy_script_h8 import LINES, SCENES  # noqa: F401
SKIP = set()
SEG_MAP = {
    0: [0, 1, 2], 1: [3, 4], 2: [5, 6], 3: [7, 8], 4: [9, 10, 11], 5: [12, 13], 6: [14, 15, 16, 17], 7: [18, 19],
    8: [20, 21, 22, 23], 9: [24, 25, 26, 27], 10: [28, 29, 30], 11: [31, 32], 12: [33, 34], 13: [35],
}
GAP_IN, GAP_LINE = 0.08, 0.17
GAP_KEEP = {4: 0.32, 5: 0.2, 30: 0.2}   # beat before "Ruko!", after "Ruko!", before "Target, HIT!"
LEAD, TAIL = 0.15, 0.25
TARGET = 55.38   # last-line start + 150-frame end card + 2.7 s hook = 60.0 s
