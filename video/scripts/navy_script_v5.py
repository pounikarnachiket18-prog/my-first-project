"""v5 (day, branded, 60 s) narrated by the user's ElevenLabs recording (voiceover/elevenlabs_adam_v5.mp3).
Same line numbering as v2 (scenes reference lines by index). Lines 0-3 follow the new script; SKIP = the v4 cut."""
from navy_script_v2 import LINES as _L2, SCENES

LINES = list(_L2)
LINES[0] = ("cold", "क्या आपको पता है, तेजस हमारे एयरक्राफ्ट कैरियर INS विक्रांत पे कैसे उतरता है? चलिए जानते हैं!",
            "kya aapko pata hai, Tejas hamare aircraft carrier INS Vikrant pe kaise utarta hai? chaliye jaante hain!")
LINES[1] = ("hook", "इसका runway,", "iska runway,")
LINES[3] = ("hook", "तो Tejas जैसे fighter jet, इस पर उड़ान कैसे भरते हैं?", "toh Tejas jaise fighter jet, is par udaan kaise bharte hain?")
SKIP = {4, 5, 6, 7, 8, 15, 16, 17, 27, 34, 35, 36}
COLD_KEYWORD = "HOW DOES\nIT LAND?"

# which speech chunks (from voiceover/elevenlabs_adam_v5_segments.json) belong to each spoken line
SEG_MAP = {
    0: [0, 1, 2], 1: [3], 2: [4], 3: [5, 6, 7], 9: [8, 9], 10: [10, 11], 11: [12, 13], 12: [14, 15], 13: [16, 17, 18],
    14: [19], 18: [20], 19: [21, 22], 20: [23, 24], 21: [25, 26], 22: [27], 23: [28, 29], 24: [30], 25: [31], 26: [32],
    28: [33, 34], 29: [35, 36], 30: [37], 31: [38], 32: [39], 33: [40, 41], 37: [42, 43],
}
# pause after a chunk, in seconds, before speeding up (default: inside a line / between lines)
GAP_IN, GAP_LINE = 0.10, 0.16
GAP_KEEP = {2: 0.55, 8: 0.24}  # beat after "chaliye jaante hain" (freeze-frame); comedic pause after "itni"
TARGET = 60.0
LEAD, TAIL = 0.2, 2.2
