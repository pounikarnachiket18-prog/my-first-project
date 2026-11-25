"""Reel 2, version 2: Tejas fires a supersonic and a hypersonic missile at the same target,
the race freezes, the difference is explained, then the race resumes and both hit.
(scene, hindi for TTS, hinglish for captions); words map 1:1 per comma-clause.
Temporary Piper voice until the user's ElevenLabs recording is synced."""

SCENES = ["cold", "pause", "mach", "supersonic", "hypersonic", "radar", "time", "strike", "outro"]
VOICE_FILE = "voice_h2.wav"
PACE = {"lead": 0.2, "clause": 0.05, "line": 0.1, "scene": 0.22, "tail": 2.2, "length_scale": 0.66}
SCENE_GAP_AFTER = {"cold": 0.25, "pause": 0.2}

LINES = [
    ("cold", "तेजस ने एक साथ दो मिसाइलें दागीं, एक सुपरसोनिक, और एक हाइपरसोनिक!",
     "Tejas ne ek saath do missilein daagin, ek Supersonic, aur ek Hypersonic!"),
    ("cold", "टारगेट एक ही है, तो पहले कौन पहुँचेगी?",
     "target ek hi hai, toh pehle kaun pahunchegi?"),
    ("pause", "रुको! पहले समझते हैं, दोनों में फर्क क्या है।",
     "Ruko! pehle samajhte hain, dono mein fark kya hai."),
    ("mach", "आवाज़ हवा में लगभग बारह_सौ किलोमीटर_प्रति_घंटे की रफ़्तार से चलती है, यही है मैक वन।",
     "awaaz hawa mein lagbhag 1200 km/h ki raftaar se chalti hai, yahi hai Mach 1."),
    ("supersonic", "मैक वन से फ़ाइव के बीच की रफ़्तार, सुपरसोनिक कहलाती है, जैसे ब्रह्मोस, लगभग मैक थ्री।",
     "Mach 1 se 5 ke beech ki raftaar, Supersonic kehlati hai, jaise BrahMos, lagbhag Mach 3."),
    ("supersonic", "इतनी रफ़्तार पर हवा दबकर शॉक वेव बनाती है, यही है सोनिक बूम।",
     "itni raftaar par hawa dabkar shock wave banati hai, yahi hai sonic boom."),
    ("hypersonic", "और मैक फ़ाइव से ऊपर, यानी आवाज़ से पाँच गुना से भी तेज़, वो है हाइपरसोनिक!",
     "aur Mach 5 se upar, yaani awaaz se paanch guna se bhi tez, woh hai Hypersonic!"),
    ("hypersonic", "इतनी रफ़्तार पर हवा इतनी गर्म हो जाती है, कि मिसाइल के चारों ओर चमकने लगती है।",
     "itni raftaar par hawa itni garam ho jaati hai, ki missile ke chaaron or chamakne lagti hai."),
    ("radar", "जहाज़ के रडार पर दोनों दिखेंगी, लेकिन हाइपरसोनिक इतनी तेज़ है, कि रोकने का वक़्त बहुत कम मिलता है, और ये रास्ते में मुड़ भी सकती है।",
     "jahaaz ke radar par dono dikhengi, lekin Hypersonic itni tez hai, ki rokne ka waqt bahut kam milta hai, aur ye raaste mein mud bhi sakti hai."),
    ("time", "सोचिए, दिल्ली से मुंबई, सुपरसोनिक को लगभग उन्नीस मिनट, और हाइपरसोनिक को सिर्फ़ ग्यारह मिनट!",
     "sochiye, Delhi se Mumbai, Supersonic ko lagbhag 19 minute, aur Hypersonic ko sirf 11 minute!"),
    ("strike", "अब रेस फिर शुरू, हाइपरसोनिक पहले, और सुपरसोनिक उसके पीछे।",
     "ab race phir shuru, Hypersonic pehle, aur Supersonic uske peeche."),
    ("strike", "टारगेट, हिट!",
     "Target, HIT!"),
    ("outro", "सुपरसोनिक तेज़ है, हाइपरसोनिक उससे भी कहीं ज़्यादा।",
     "Supersonic tez hai, Hypersonic usse bhi kahin zyada."),
    ("outro", "ऐसे और एक्सप्लेनर्स के लिए फ़ॉलो करो, माइंडसेट मोड!",
     "aise aur explainers ke liye follow karo, Mindset Mode!"),
]
