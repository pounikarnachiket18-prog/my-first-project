/**
 * New storyline ("sleeping passenger" version). All timings in seconds.
 * When the real voiceover is recorded, retime SCENES and CAPTIONS here.
 */
export const FPS = 30;

export const SCENES = {
  sleep: [0, 3.5], // 1 cold open: passenger asleep
  hook: [3.5, 8.5], // 2 eyes open + POV on blanket
  twist: [8.5, 19.5], // 3 blanket stays in coach; trip board 1→30
  packet: [19.5, 26.5], // 4 flashback: sealed packet contents
  journey: [26.5, 33.5], // 5 collect → wash → press → new packet
  solution: [33.5, 40.5], // 6 two sheets: berth + blanket cover
  recap: [40.5, 46.0], // 7 sheet every trip vs blanket monthly
  bonus: [46.0, 51.5], // 8 printed cover, washed separately
  ending: [51.5, 58.0], // 9 back to sleep + follow
} as const;

export const TOTAL_SEC = 58;

/** Voiceover script as on-screen subtitles: [start, end, text]. */
export const CAPTIONS: [number, number, string][] = [
  [0.3, 3.4, "Raat ka safar, AC coach, aur mast neend…"],
  [3.6, 5.6, "Par ek second…"],
  [5.6, 8.4, "jo kambal aapne odha hai, woh aakhri baar kab dhula tha?"],
  [8.6, 11.4, "Sach ye hai ki kambal har trip ke baad nahi badalta."],
  [11.4, 14.2, "Woh coach mein hi rehta hai, aur alag-alag yatriyon ke saath safar karta hai."],
  [14.2, 19.4, "Uski dhulai hoti hai kam se kam mahine mein ek baar."],
  [19.6, 22.6, "Haan, jo sealed bedroll packet milta hai, woh fresh hota hai:"],
  [22.6, 26.4, "do chadar, ek takiye ka cover aur ek towel."],
  [26.6, 30.0, "Ye sab har safar ke baad collect hote hain, laundry mein dhulte hain,"],
  [30.0, 33.4, "steam press hote hain, aur naye packet mein seal hote hain."],
  [33.6, 36.4, "Isiliye packet mein do chadar hoti hain."],
  [36.4, 40.4, "Pehli berth par bichhao, aur doosri kambal ke andar daalo, bilkul cover ki tarah."],
  [40.6, 43.2, "Chadar har trip fresh, kambal mahine mein."],
  [43.2, 45.9, "Toh beech ki ye chadar hi aapki dhaal hai."],
  [46.1, 51.4, "Aur kuch trains mein ab kambal par printed cover bhi aata hai, jo alag se dhulta hai."],
  [51.6, 54.6, "Ab aaram se so jaiye… bas doosri chadar waste mat karna!"],
  [54.6, 57.9, "Aise hi 1-minute explainers ke liye, Mindset Mode Explainers follow karo."],
];
