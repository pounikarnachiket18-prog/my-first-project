/**
 * "5 cheezein, 1 raaz": pure explainer, no characters.
 * Every time is in seconds. When the voiceover is recorded, retime here.
 */
export const FPS = 30;

export const SCENES = {
  open: [0, 1.4], // branded train clip
  lineup: [1.4, 13.0], // quiz → 5 items → reveal kambal (one continuous shot)
  fresh: [13.0, 20.0], // wash → steam → seal loop
  blanket: [20.0, 27.0], // split: sheet loop vs blanket 30-day odometer
  howto: [27.0, 41.0], // exploded berth: 3 steps, then "sirf fresh chadar"
  bonus: [41.0, 45.0], // printed cover, washed separately
  recap: [45.0, 47.2], // two-column recap card
  follow: [47.2, 49.4], // branded train + follow
} as const;

export const TOTAL = 49.4;

/** Script lines as subtitles: [start, end, text]. */
export const LINES: [number, number, string][] = [
  [0.2, 2.6, "AC coach mein aapko paanch cheezein milti hain."],
  [2.6, 5.0, "Par inmein se ek… har trip ke baad nahi dhulti. Guess karo, kaunsi? 🤔"],
  [5.1, 9.0, "Do chadar, ek takiye ka cover, ek towel… aur ek kambal."],
  [9.1, 12.9, "Jawab hai: kambal! Baaki chaaron cheezein har safar ke baad laundry jaati hain…"],
  [13.1, 19.9, "…dhulti hain, steam press hoti hain, aur naye sealed packet mein wapas aati hain."],
  [20.1, 23.4, "Lekin kambal coach mein hi rehta hai. Uski dhulai hoti hai kam se kam mahine mein ek baar."],
  [23.4, 26.9, "Yaani ek hi kambal, mahine bhar, kai yatriyon ke kaam aata hai."],
  [27.1, 29.6, "Toh smart tareeka kya hai?"],
  [29.6, 32.2, "Step one: pehli chadar berth par bichhao."],
  [32.2, 35.0, "Step two: doosri chadar kambal ke andar daalo, bilkul cover ki tarah."],
  [35.0, 37.4, "Step three: takiye par cover chadhao."],
  [37.5, 40.9, "Ab aapko sirf fresh chadar chhuegi, kambal nahi."],
  [41.1, 44.9, "Aur kuch trains mein ab kambal par printed cover bhi aata hai, jo alag se dhulta hai."],
  [45.1, 47.1, "Toh yaad rakho: chadar har trip, kambal mahine mein."],
  [47.2, 49.3, "Aise hi explainers ke liye Mindset Mode Explainers follow karo."],
];

/** Sound-effect cues from public/sfx: [time, file, volume]. */
export const SFX: [number, string, number][] = [
  [1.25, "swoosh", 0.7],
  [5.3, "pop", 0.6],
  [6.0, "pop", 0.6],
  [6.7, "pop", 0.6],
  [7.4, "pop", 0.6],
  [8.1, "pop", 0.7],
  [9.3, "ding", 0.5],
  [12.9, "swoosh", 0.7],
  [15.0, "whoosh", 0.4],
  [18.6, "stamp", 0.7],
  [19.9, "swoosh", 0.7],
  [25.6, "stamp", 0.7],
  [26.9, "swoosh", 0.7],
  [29.7, "click", 0.8],
  [32.3, "click", 0.8],
  [35.1, "click", 0.8],
  [37.6, "ding", 0.45],
  [40.9, "swoosh", 0.7],
  [42.0, "whoosh", 0.45],
  [44.9, "swoosh", 0.7],
  [47.1, "swoosh", 0.7],
  [47.6, "train-horn", 0.35],
];
