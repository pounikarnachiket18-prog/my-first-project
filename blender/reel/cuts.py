"""Shared edit decisions for the reel: used by build_reel.py, sound.py and post.py (30 fps frames)."""
FPS = 30
END = 1417          # 47.23 s: 3 s hook + narration at 1.2x + outro (prep_audio.py prints the exact length)

CUT = dict(
    H1=0,       # hook: hip-level tracking shot through the gate, X-ray reveal
    H2=57,      # hook: whip up to the alarm panel ("lekin aakhir kaise?")
    S1=90,      # "yeh gate toh lagbhag har insaan par beep karta hai" - wide crane, beep
    S2=164,     # "phir security guards ko kaise pata chalta hai" - orbit
    S3=233,     # "ki kisi ke paas" - push to pocket
    S4=253,     # "sikka hai" - X-ray coins
    S5=271,     # "bandook hai" - holster
    S6=289,     # "bomb hai, ya belt?" - buckle
    S7=312,     # "chaliye samajhte hain" - fast pull-out
    S8=336,     # "asal mein yeh machine sirf beep nahi karti" - control unit
    S9=398,     # "balki metal ki maujoodgi" - macro: coins + card
    S10=468,    # "response ko bhi detect karti hai" - screen
    S11=507,    # "is walk-through metal detector ke andar" - gate dolly, panels turn see-through
    S12=561,    # "khaas coils lagi hoti hain" - slide past TX and RX coils
    S13=611,    # "...electromagnetic field banaati rehti hain" - field builds
    S14=701,    # "jaise hi koi vyakti iske andar se guzarta hai" - walk in
    S15=761,    # "...field mein badlaav paida karta hai" - field bends around the metal
    S16=873,    # "is badlaav ki wajah se" - push into the pocket (match cut)
    S17=911,    # "...electric currents paida hote hain" - macro eddy currents
    S18=995,    # "machine ke sensors" - the coin's own field
    S19=1025,   # "is badlaav ko" - receiver coil picks it up
    S20=1043,   # "turant detect kar lete hain" - ALARM
    S21=1076,   # "phir signal ki strength..." - trace + strength bar
    S22=1129,   # "machine ko andaaza hota hai" - zone LEDs at hip height
    S23=1175,   # "ki metal object kitna bada ya significant" - gauge
    S24=1260,   # "isi wajah se system" - wide low
    S25=1287,   # "coin" - pocket X-ray
    S26=1300,   # "belt" - buckle
    S27=1312,   # "kisi bade metal object ke liye" - gun
    S28=1352,   # "alag-alag response de sakta hai" - crane up, end card
    END=END,
)

PULSE = 22          # frames between transmitter pulses (slowed right down so the eye can follow)

# alarm / beep blink windows (red button, zone LEDs, alarm sound): (start, end) frames, 8-frame blink period
ALARM = [(36, 90), (137, 153), (CUT["S20"], CUT["S22"] + 40), (CUT["S28"], END)]
BLINK = 8

# walks: (first frame, last frame, cadence in steps/s) -> footsteps in sound.py
WALKS = [(0, 56, 2.05), (90, 146, 1.9), (701, 754, 1.9)]

# On-screen labels (post.py draws them, sound.py adds a soft tick when each appears):
# (first frame, last frame, anchor (LBL_* empty), label, small caption, colour, (dx, dy) pill offset in 1080x1920 px)
LABELS = [
    (408, 466, "METAL", "Metal", "", "white", (170, -300)),
    (474, 506, "SCREEN", "Response signal", "", "white", (0, -430)),
    (566, 596, "TX", "Transmitter coil", "field bhejti hai", "cyan", (230, -330)),
    (594, 610, "RX", "Receiver coil", "signal sunti hai", "white", (-230, -330)),
    (614, 652, "TX", "Transmitter coil", "field bhejti hai", "cyan", (250, 330)),
    (622, 652, "RX", "Receiver coil", "signal sunti hai", "white", (-200, -250)),
    (656, 700, "FIELD", "Magnetic field", "", "cyan", (0, -330)),
    (796, 834, "POCKET", "Metal", "", "amber", (240, -240)),
    (836, 872, "POCKET", "Field mein badlaav", "", "amber", (240, -240)),
    (938, 994, "EDDY", "Eddy currents", "coin ke andar", "amber", (110, -330)),
    (1000, 1024, "SEC", "Metal ka apna field", "ulta asar", "rose", (40, -300)),
    (1027, 1042, "RX", "Receiver coil", "badlaav pakad leti hai", "amber", (-160, -300)),
    (1082, 1128, "BAR", "Signal strength", "", "white", (0, -420)),
    (1134, 1174, "ZONE", "Zone lights", "metal kahan hai", "white", (-150, -330)),
    (1192, 1259, "GAUGE", "Size: 27 mm", "", "white", (0, -320)),
]

# The five-step explanation tracker shown during the physics section: (start, end, label)
STEPS = [(611, 701, "Field"), (701, 873, "Metal"), (873, 995, "Current"), (995, 1043, "Sensor"), (1043, 1129, "Alarm")]

# Signal meter HUD for "coin, belt, or a bigger metal object": (start, end, item, level 0-10)
METER = [(1287, 1300, "Coin", 3), (1300, 1312, "Belt", 5), (1312, 1352, "Bada metal object", 9)]

# Cold-open typography (frames)
HOOK_TEXT = [(4, 57, ["Metro ki ek machine", "kapdon mein chhupa", "*metal* bhi", "pakad leti hai"]),
             (57, 90, ["Lekin aakhir", "*KAISE?*"])]
# Just KnowIt logo ending: the corner logo flies to the centre while a red iris fills the frame; the reel runs past
# the last 3D frame (END) on the logo alone
LOGO_IN = 1392                # first frame of the logo transition (just after the last word)
LOGO_HIT = LOGO_IN + 20       # wordmark lands
OUT_END = END + 66            # total frames in the finished reel
# Lower-third step titles (Hinglish), shown as each of the five steps begins
STEP_SUB = {"Field": "field banta hai", "Metal": "metal andar aata hai", "Current": "current paida hota hai",
            "Sensor": "sensor badlaav pakadta hai", "Alarm": "alarm bajta hai"}
CAPTIONS = None         # subtitles off; "hinglish" (Roman Hindi) or "english" turns them back on
END_CTA = ("Aise aur explainers ke liye", "follow karo")   # English: ("More explainers like this", "follow")
