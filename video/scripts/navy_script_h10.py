"""FINAL (50 s): Rudra ElevenLabs recording fitted to the reel. Lines/scenes = navy_script_h8 (Mumbai->Karachi, JustKnow It).
Chunks from Whisper (voiceover/elevenlabs_rudra_final_segments.json) -> script lines."""
from navy_script_h8 import LINES, SCENES  # noqa: F401
SKIP = set()
SEG_MAP = {
    0: [0, 1, 2], 1: [3, 4], 2: [5, 6], 3: [7, 8], 4: [9, 10, 11], 5: [12, 13], 6: [14, 15, 16, 17], 7: [18, 19],
    8: [20, 21, 22, 23], 9: [24, 25, 26, 27], 10: [28, 29, 30], 11: [31, 32], 12: [33, 34], 13: [35],
}
GAP_IN, GAP_LINE = 0.05, 0.10
GAP_KEEP = {4: 0.22, 5: 0.14, 30: 0.12}   # beat before "Ruko!", after "Ruko!", before "Target, HIT!"
LEAD, TAIL = 0.15, 0.25
TARGET = 46.4   # body = last-line start + 108-frame end card ~= 47.3 s; + 2.7 s dogfight hook = 50 s
