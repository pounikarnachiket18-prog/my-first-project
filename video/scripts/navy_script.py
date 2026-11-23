# Narration for the INS Vikrant / Tejas explainer.
# Each line: (scene, hindi, hinglish). Words map 1:1 between the two strings;
# use "_" inside a Hindi token to join several spoken words into one caption word
# (e.g. "आई_एन_एस" is read as three words but captioned as "INS").
# Commas split a line into separately voiced clauses (gives natural pauses and
# tighter word timing).

SCENES = ["hook", "imagine", "runway", "skijump", "compare", "landing", "twist", "backup"]

LINES = [
    ("hook", "आई_एन_एस विक्रांत का रनवे,", "INS Vikrant ka runway,"),
    ("hook", "किसी आम एयरपोर्ट के रनवे का, बस छोटा सा हिस्सा है।", "kisi aam airport ke runway ka, bas chhota sa hissa hai."),
    ("hook", "तो तेजस जैसे फ़ाइटर जेट, इस पर उड़ान कैसे भरते हैं, और उतरते कैसे हैं?", "toh Tejas jaise fighter jet, is par udaan kaise bharte hain, aur utarte kaise hain?"),

    ("imagine", "सोचिए, आप बीच समंदर में, आई_एन_एस विक्रांत के डेक पर खड़े हैं।", "sochiye, aap beech samandar mein, INS Vikrant ke deck par khade hain."),
    ("imagine", "एक तेजस, सबसे आगे आकर तैयार होता है।", "ek Tejas, sabse aage aakar taiyaar hota hai."),
    ("imagine", "कुछ ही सेकंड बाद, वो हवा में है।", "kuch hi second baad, woh hawa mein hai."),
    ("imagine", "देखिए कैसे।", "dekhiye kaise."),

    ("runway", "एक आम जेट को, रफ़्तार पकड़ने के लिए, लंबा रनवे चाहिए।", "ek aam jet ko, raftaar pakadne ke liye, lamba runway chahiye."),
    ("runway", "विक्रांत के पास इतनी जगह नहीं है,", "Vikrant ke paas itni jagah nahi hai,"),
    ("runway", "इसलिए उसके आगे बना है, एक स्की-जंप।", "isliye uske aage bana hai, ek ski-jump."),

    ("skijump", "तेजस इंजन को पूरी ताक़त पर चलाता है,", "Tejas engine ko poori taaqat par chalata hai,"),
    ("skijump", "और डेक पर लगे ब्लॉक, उसे थामे रखते हैं।", "aur deck par lage block, use thaame rakhte hain."),
    ("skijump", "ब्लॉक हटते ही, जेट आगे भागता है,", "block hatte hi, jet aage bhaagta hai,"),
    ("skijump", "और रैंप उसे, ऊपर की ओर उछाल देता है।", "aur ramp use, upar ki or uchhaal deta hai."),
    ("skijump", "खड़े-खड़े से सीधा उड़ान तक, बस कुछ ही सेकंड में।", "khade-khade se seedha udaan tak, bas kuch hi second mein."),

    ("compare", "दुनिया के कई कैरियर, जेट को कैटापल्ट से फेंकते हैं।", "duniya ke kai carrier, jet ko catapult se phenkte hain."),
    ("compare", "लेकिन विक्रांत, स्की-जंप के सहारे उड़ान भरवाता है।", "lekin Vikrant, ski-jump ke sahaare udaan bharwata hai."),

    ("landing", "उतरना, इससे भी मुश्किल है।", "utarna, isse bhi mushkil hai."),
    ("landing", "तेजस के नीचे, एक हुक लटका होता है।", "Tejas ke neeche, ek hook latka hota hai."),
    ("landing", "टचडाउन के वक़्त, पायलट का निशाना होता है,", "touchdown ke waqt, pilot ka nishana hota hai,"),
    ("landing", "डेक पर बिछी मोटी स्टील की तारों में से, किसी एक को पकड़ना।", "deck par bichhi moti steel ki taaron mein se, kisi ek ko pakadna."),
    ("landing", "हुक जैसे ही तार पकड़ता है,", "hook jaise hi taar pakadta hai,"),
    ("landing", "जेट लगभग दो सेकंड में, पूरी तरह रुक जाता है।", "jet lagbhag do second mein, poori tarah ruk jaata hai."),

    ("twist", "लेकिन असली ट्विस्ट यहाँ है।", "lekin asli twist yahan hai."),
    ("twist", "जैसे ही पहिए डेक को छूते हैं,", "jaise hi pahiye deck ko chhoote hain,"),
    ("twist", "पायलट इंजन को फ़ुल पावर पर कर देता है।", "pilot engine ko full power par kar deta hai."),
    ("twist", "सुनने में उल्टा लगता है।", "sunne mein ulta lagta hai."),
    ("twist", "लेकिन अगर हुक, हर तार से चूक जाए,", "lekin agar hook, har taar se chook jaaye,"),
    ("twist", "तो जेट के पास, फिर से उड़ने की रफ़्तार होनी चाहिए,", "toh jet ke paas, phir se udne ki raftaar honi chahiye,"),
    ("twist", "वरना वो सीधा समंदर में गिरेगा।", "warna woh seedha samandar mein girega."),

    ("backup", "तो कैरियर पर लैंडिंग?", "toh carrier par landing?"),
    ("backup", "ये एक कंट्रोल्ड क्रैश है,", "yeh ek controlled crash hai,"),
    ("backup", "जिसमें बैकअप प्लान, पहले से तैयार है।", "jismein backup plan, pehle se taiyaar hai."),
    ("backup", "क्या आप चलते जहाज़ पर, जेट उतारने की हिम्मत करेंगे?", "kya aap chalte jahaaz par, jet utaarne ki himmat karenge?"),
    ("backup", "ये वीडियो उस दोस्त को भेजिए,", "yeh video us dost ko bhejiye,"),
    ("backup", "जिसे भारतीय नौसेना से प्यार है।", "jise Bhartiya Nausena se pyaar hai."),
]
