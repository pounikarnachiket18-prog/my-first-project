"""Reel 2: supersonic vs hypersonic (day, branded, ~60 s).
Each line: (scene, hindi for TTS, hinglish for captions); words map 1:1 per comma-clause.
The voice is a temporary Piper track until the user's ElevenLabs recording replaces it."""

SCENES = ["cold", "mach", "supersonic", "hypersonic", "attack", "outro"]
VOICE_FILE = "voice_h1.wav"
PACE = {"lead": 0.2, "clause": 0.05, "line": 0.1, "scene": 0.25, "tail": 2.2, "length_scale": 0.68}
SCENE_GAP_AFTER = {"cold": 0.3, "hypersonic": 0.35}
COLD_KEYWORD = "SUPERSONIC\nVS\nHYPERSONIC?"

LINES = [
    ("cold", "समंदर के बीच एक टारगेट शिप, और आसमान से आ रहा है तेजस!",
     "samandar ke beech ek target ship, aur aasmaan se aa raha hai Tejas!"),
    ("cold", "लेकिन मिसाइल कौन सी चलेगी, सुपरसोनिक या हाइपरसोनिक? दोनों में फर्क क्या है? चलिए समझते हैं।",
     "lekin missile kaun si chalegi, Supersonic ya Hypersonic? dono mein fark kya hai? chaliye samajhte hain."),

    ("mach", "पहले समझिए मैक, आवाज़ हवा में लगभग बारह_सौ किलोमीटर_प्रति_घंटे की रफ़्तार से चलती है, यही है मैक वन।",
     "pehle samjhiye Mach, awaaz hawa mein lagbhag 1200 km/h ki raftaar se chalti hai, yahi hai Mach 1."),

    ("supersonic", "जो चीज़ आवाज़ से तेज़ चले, यानी मैक वन से मैक फ़ाइव के बीच, वो है सुपरसोनिक।",
     "jo cheez awaaz se tez chale, yaani Mach 1 se Mach 5 ke beech, woh hai Supersonic."),
    ("supersonic", "जैसे ब्रह्मोस, जो लगभग मैक थ्री की रफ़्तार से उड़ती है।",
     "jaise BrahMos, jo lagbhag Mach 3 ki raftaar se udti hai."),
    ("supersonic", "आवाज़ से तेज़ उड़ने पर, हवा दबकर एक शॉक वेव बनाती है, और नीचे सुनाई देता है सोनिक बूम।",
     "awaaz se tez udne par, hawa dabkar ek shock wave banati hai, aur neeche sunai deta hai sonic boom."),

    ("hypersonic", "अब हाइपरसोनिक, मैक फ़ाइव से भी ज़्यादा, यानी आवाज़ से पाँच गुना से भी तेज़!",
     "ab Hypersonic, Mach 5 se bhi zyada, yaani awaaz se paanch guna se bhi tez!"),
    ("hypersonic", "इतनी रफ़्तार पर इतनी गर्मी पैदा होती है, कि मिसाइल के चारों ओर की हवा तक चमकने लगती है।",
     "itni raftaar par itni garmi paida hoti hai, ki missile ke chaaron or ki hawa tak chamakne lagti hai."),
    ("hypersonic", "और हाइपरसोनिक ग्लाइड मिसाइल सीधी नहीं आती, रास्ते में मुड़ सकती है, इसलिए उसे रोकना बहुत मुश्किल है।",
     "aur Hypersonic glide missile seedhi nahi aati, raaste mein mud sakti hai, isliye use rokna bahut mushkil hai."),
    ("hypersonic", "भारत ने दो_हज़ार_चौबीस में अपनी पहली लॉन्ग रेंज हाइपरसोनिक एंटी-शिप मिसाइल का टेस्ट किया।",
     "Bharat ne 2024 mein apni pehli long range Hypersonic anti-ship missile ka test kiya."),

    ("attack", "तो अब देखिए, तेजस से सुपरसोनिक मिसाइल लॉन्च!",
     "toh ab dekhiye, Tejas se Supersonic missile launch!"),
    ("attack", "और किनारे से, हाइपरसोनिक!",
     "aur kinaare se, Hypersonic!"),
    ("attack", "दोनों एक ही टारगेट की ओर, लेकिन हाइपरसोनिक, कहीं जल्दी पहुँचती है।",
     "dono ek hi target ki or, lekin Hypersonic, kahin jaldi pahunchti hai."),
    ("attack", "टारगेट, हिट!",
     "Target, HIT!"),

    ("outro", "सुपरसोनिक तेज़ है, लेकिन हाइपरसोनिक, उससे भी कहीं आगे।",
     "Supersonic tez hai, lekin Hypersonic, usse bhi kahin aage."),
    ("outro", "ऐसी और एक्सप्लेनर्स के लिए फ़ॉलो करो, माइंडसेट मोड!",
     "aisi aur explainers ke liye follow karo, Mindset Mode!"),
]
