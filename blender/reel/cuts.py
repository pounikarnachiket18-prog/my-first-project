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
# (first frame, last frame, anchor (LBL_* empty), Hindi, English, colour, (dx, dy) pill offset in 1080x1920 px)
LABELS = [
    (408, 466, "METAL", "मेटल", "metal", "white", (170, -300)),
    (474, 506, "SCREEN", "रिस्पॉन्स सिग्नल", "response signal", "white", (0, -430)),
    (566, 596, "TX", "ट्रांसमीटर कॉइल", "transmitter coil", "cyan", (230, -330)),
    (594, 610, "RX", "रिसीवर कॉइल", "receiver coil", "white", (-230, -330)),
    (614, 652, "TX", "ट्रांसमीटर कॉइल", "transmitter coil", "cyan", (250, 330)),
    (622, 652, "RX", "रिसीवर कॉइल", "receiver coil", "white", (-200, -250)),
    (656, 700, "FIELD", "मैग्नेटिक फ़ील्ड", "magnetic field", "cyan", (0, -330)),
    (796, 834, "POCKET", "मेटल", "metal", "amber", (240, -240)),
    (836, 872, "POCKET", "फ़ील्ड में बदलाव", "the field changes", "amber", (240, -240)),
    (938, 994, "EDDY", "एडी करंट्स", "eddy currents", "amber", (110, -330)),
    (1000, 1024, "SEC", "मेटल का अपना फ़ील्ड", "the metal's own field", "rose", (40, -300)),
    (1027, 1042, "RX", "रिसीवर कॉइल", "receiver coil", "amber", (-160, -300)),
    (1082, 1128, "BAR", "सिग्नल स्ट्रेंथ", "signal strength", "white", (0, -420)),
    (1134, 1174, "ZONE", "मेटल कहाँ है", "zone lights show where", "white", (-150, -330)),
    (1192, 1259, "GAUGE", "साइज़: 27 मिमी", "how big is the metal", "white", (0, -320)),
]

# The five-step explanation tracker shown during the physics section: (start, end, label)
STEPS = [(611, 701, "फ़ील्ड"), (701, 873, "मेटल"), (873, 995, "करंट"), (995, 1043, "सेंसर"), (1043, 1129, "अलार्म")]

# Signal meter HUD for "coin, belt, or a bigger metal object": (start, end, item, level 0-10)
METER = [(1287, 1300, "कॉइन", 3), (1300, 1312, "बेल्ट", 5), (1312, 1352, "बड़ा मेटल ऑब्जेक्ट", 9)]

# Cold-open typography (frames)
HOOK_TEXT = [(4, 57, ["एयरपोर्ट की ये मशीन", "कपड़ों में छुपा *मेटल*", "भी पकड़ लेती है"]),
             (57, 90, ["लेकिन आख़िर", "*कैसे?*"])]
END_CARD = 1388
