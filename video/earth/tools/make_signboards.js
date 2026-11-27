// Renders Indian shop signboards (Hindi + English) to PNG textures with Chromium,
// so Devanagari conjuncts/matras are shaped correctly.  Run from video/:
//   node earth/tools/make_signboards.js
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const OUT = path.join(__dirname, "..", "..", "public", "earth", "textures", "signs");
const font = (pkg, file) => "file://" + path.join(__dirname, "..", "..", "node_modules", "@fontsource", pkg, "files", file);

const SIGNS = [
  ["sharma", "शर्मा जनरल स्टोर", "SHARMA GENERAL STORE", "#c8102e", "#fff6d0"],
  ["chai", "मुंबई चाय कट्टा", "MUMBAI CHAI • SNACKS", "#0b5d3b", "#ffe27a"],
  ["medical", "गणेश मेडिकल", "GANESH MEDICAL & GENERAL", "#ffffff", "#0a7a3f"],
  ["sweets", "अग्रवाल स्वीट्स", "AGARWAL SWEETS • SINCE 1972", "#ff8f00", "#5a1a00"],
  ["hardware", "पटेल हार्डवेयर", "PATEL HARDWARE & PAINTS", "#1d3f8f", "#ffffff"],
  ["mobile", "श्री साई मोबाइल", "SHREE SAI MOBILE • RECHARGE", "#ffd400", "#c4001a"],
  ["vadapav", "वड़ा पाव सेंटर", "VADA PAV CENTRE", "#e63b14", "#fff3c4"],
  ["tailor", "राज टेलर्स", "RAJ TAILORS • LADIES & GENTS", "#6a1b9a", "#ffffff"],
  ["kirana", "लक्ष्मी किराना", "LAXMI KIRANA STORES", "#00897b", "#fffde7"],
  ["jewellers", "महालक्ष्मी ज्वेलर्स", "MAHALAXMI JEWELLERS", "#7a0019", "#ffd56b"],
  ["bank", "भारतीय सहकारी बैंक", "BHARATIYA SAHAKARI BANK", "#0d47a1", "#ffffff"],
  ["xerox", "जय अम्बे ज़ेरॉक्स", "JAI AMBE XEROX • PRINT", "#212121", "#ffeb3b"],
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 400 } });
  for (const [id, hi, en, bg, fg] of SIGNS) {
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
      @font-face{font-family:Baloo;src:url(${font("baloo-2", "baloo-2-devanagari-800-normal.woff2")})}
      @font-face{font-family:BalooL;src:url(${font("baloo-2", "baloo-2-latin-800-normal.woff2")})}
      html,body{margin:0;width:1600px;height:400px;overflow:hidden}
      .b{width:1600px;height:400px;box-sizing:border-box;background:${bg};color:${fg};border:16px solid rgba(0,0,0,.25);
         display:flex;flex-direction:column;align-items:center;justify-content:center;
         background-image:linear-gradient(180deg,rgba(255,255,255,.12),rgba(0,0,0,.18))}
      .hi{font:800 180px/1 Baloo, BalooL;letter-spacing:2px;text-shadow:0 6px 0 rgba(0,0,0,.25)}
      .en{font:800 62px/1 BalooL, Baloo;letter-spacing:6px;margin-top:6px}
    </style></head><body><div class="b"><div class="hi">${hi}</div><div class="en">${en}</div></div></body></html>`;
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(OUT, `${id}.png`) });
    console.log("sign", id);
  }
  await browser.close();
})();
