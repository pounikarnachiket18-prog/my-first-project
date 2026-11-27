"""Narration script: one entry per voiceover line.

Each line is a list of (display_word, spoken_word) tokens.
  display_word -> what appears in the Hinglish subtitle (Roman script)
  spoken_word  -> what the Hindi TTS voice reads (Devanagari, so the
                  Hindi voice pronounces English loan words naturally)
A token may set "emph" to highlight it in the accent colour, and "pause"
(seconds) to add a breath after it.

`start` is the target start time in seconds (from the user's storyboard),
`end` the hard deadline the line must finish by.
"""

LINES = [
    {
        "id": "hook", "start": 0.35, "end": 4.6, "accent": "#7fd4ff",
        "tokens": [
            ("Socho...", "सोचो", {"pause": 0.30}),
            ("agar", "अगर"), ("kal", "कल"), ("subah", "सुबह"),
            ("Earth", "अर्थ", {"emph": True}),
            ("ghoomna", "घूमना"), ("hi", "ही"), ("band", "बंद"), ("kar", "कर"), ("de", "दे"),
            ("toh?", "तो?"),
        ],
    },
    {
        "id": "speed", "start": 5.1, "end": 11.95, "accent": "#ffc24a",
        "tokens": [
            ("Actually,", "ऐक्चुअली,"), ("hum", "हम"), ("sab", "सब"), ("already", "ऑलरेडी"),
            ("ek", "एक"), ("invisible", "इनविज़िबल", {"emph": True}), ("speed", "स्पीड", {"emph": True}),
            ("par", "पर"), ("travel", "ट्रैवल"), ("kar", "कर"), ("rahe", "रहे"), ("hain...", "हैं", {"pause": 0.25}),
            ("Equator", "इक्वेटर"), ("par", "पर"), ("lagbhag", "लगभग"),
            ("1,670", "सोलह सौ सत्तर", {"emph": True}),
            ("kilometres", "किलोमीटर्स", {"emph": True}), ("per", "पर", {"emph": True}), ("hour!", "आवर!", {"emph": True}),
        ],
    },
    {
        "id": "inertia", "start": 12.2, "end": 19.85, "accent": "#ff7a3d",
        "tokens": [
            ("Aur", "और"), ("agar", "अगर"), ("Earth", "अर्थ"), ("achanak", "अचानक"),
            ("ruk", "रुक", {"emph": True}), ("gayi...", "गई", {"emph": True, "pause": 0.2}),
            ("toh", "तो"), ("zameen", "ज़मीन"), ("ruk", "रुक"), ("jaayegi,", "जाएगी,"),
            ("lekin", "लेकिन"), ("hum,", "हम,"), ("buildings", "बिल्डिंग्स"), ("aur", "और"),
            ("atmosphere", "एटमॉस्फ़ियर"), ("apni", "अपनी"), ("purani", "पुरानी"),
            ("speed", "स्पीड", {"emph": True}), ("se", "से"), ("aage", "आगे"),
            ("badhte", "बढ़ते"), ("rahenge!", "रहेंगे!"),
        ],
    },
    {
        "id": "destruction", "start": 20.25, "end": 27.8, "accent": "#ff4646",
        "tokens": [
            ("Imagine", "इमैजिन"), ("karo...", "करो", {"pause": 0.25}),
            ("superfast", "सुपरफ़ास्ट", {"emph": True}), ("winds,", "विंड्स,", {"emph": True}),
            ("samundar", "समुंदर"), ("ki", "की"), ("massive", "मैसिव", {"emph": True}), ("waves", "वेव्स", {"emph": True}),
            ("aur", "और"), ("duniya", "दुनिया"), ("bhar", "भर"), ("mein", "में"),
            ("unimaginable", "अनइमैजिनेबल"), ("destruction!", "डिस्ट्रक्शन!", {"emph": True}),
        ],
    },
    {
        "id": "yearday", "start": 28.3, "end": 36.8, "accent": "#ffd36b",
        "tokens": [
            ("Lekin", "लेकिन"), ("maan", "मान"), ("lo", "लो"), ("tum", "तुम"), ("kisi", "किसी"),
            ("tarah", "तरह"), ("bach", "बच"), ("gaye...", "गए", {"pause": 0.25}),
            ("toh", "तो"), ("ab", "अब"), ("ek", "एक"), ("din", "दिन"),
            ("24", "चौबीस"), ("ghante", "घंटे"), ("ka", "का"), ("nahi,", "नहीं,"),
            ("balki", "बल्कि"), ("poore", "पूरे"),
            ("ek", "एक", {"emph": True}), ("saal", "साल", {"emph": True}), ("ka", "का"), ("hoga!", "होगा!"),
        ],
    },
    {
        "id": "twist", "start": 37.1, "end": 43.85, "accent": "#ff9b3d",
        "tokens": [
            ("Matlab,", "मतलब,"), ("lagbhag", "लगभग"),
            ("6", "छह", {"emph": True}), ("mahine", "महीने", {"emph": True}),
            ("tak", "तक"), ("din...", "दिन", {"pause": 0.15}),
            ("aur", "और"), ("6", "छह", {"emph": True}), ("mahine", "महीने", {"emph": True}),
            ("tak", "तक"), ("raat!", "रात!", {"pause": 0.3}),
            ("Ek", "एक"), ("taraf", "तरफ़"), ("extreme", "एक्सट्रीम", {"emph": True}), ("heat,", "हीट,", {"emph": True}),
            ("doosri", "दूसरी"), ("taraf", "तरफ़"),
            ("freezing", "फ़्रीज़िंग", {"emph": True, "accent": "#8fd8ff"}),
            ("darkness.", "डार्कनेस", {"emph": True, "accent": "#8fd8ff"}),
        ],
    },
    {
        "id": "ending", "start": 44.1, "end": 49.6, "accent": "#ffe08a",
        "tokens": [
            ("Toh", "तो"), ("agli", "अगली"), ("baar", "बार"), ("sunrise", "सनराइज़", {"emph": True}),
            ("dekho...", "देखो", {"pause": 0.06}),
            ("yaad", "याद"), ("rakhna,", "रखना,"), ("Earth", "अर्थ", {"emph": True}), ("ka", "का"),
            ("ghoomna", "घूमना", {"emph": True}), ("hi", "ही"), ("life", "लाइफ़", {"emph": True}),
            ("ko", "को"), ("possible", "पॉसिबल"), ("banane", "बनाने"), ("wale", "वाले"),
            ("important", "इम्पॉर्टेंट"), ("factors", "फ़ैक्टर्स"), ("mein", "में"), ("se", "से"),
            ("ek", "एक"), ("hai!", "है!"),
        ],
    },
]
