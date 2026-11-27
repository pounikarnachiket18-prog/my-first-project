// Decals and cockpit display textures for THE LAST FLIGHT (rendered with Chromium for crisp text).
//   node lastflight/tools/make_textures.js
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const OUT = path.join(__dirname, "..", "..", "public", "lastflight", "textures");
const font = (pkg, file) => "file://" + path.join(__dirname, "..", "..", "node_modules", "@fontsource", pkg, "files", file);
const FF = `@font-face{font-family:A;src:url(${font("anton", "anton-latin-400-normal.woff2")})}
@font-face{font-family:M;src:url(${font("jetbrains-mono", "jetbrains-mono-latin-700-normal.woff2")})}
@font-face{font-family:S;src:url(${font("montserrat", "montserrat-latin-800-normal.woff2")})}`;

const pages = {
  // side decal: orange rescue band + RESCUE lettering (transparent background)
  rescue_side: [1600, 400, `<div style="width:1600px;height:400px;display:flex;align-items:center;justify-content:center">
     <div style="font:900 230px/1 S;letter-spacing:30px;color:#f4f1e8;-webkit-text-stroke:6px rgba(0,0,0,.35)">RESCUE</div></div>`],
  tail_number: [1200, 300, `<div style="width:1200px;height:300px;display:flex;align-items:center;justify-content:center;font:700 200px/1 M;color:#e9e6dd;letter-spacing:12px">IA-1142</div>`],
  roundel: [512, 512, `<div style="width:512px;height:512px;border-radius:50%;background:#ff7a1a;display:flex;align-items:center;justify-content:center">
     <div style="width:340px;height:340px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center">
     <div style="width:170px;height:170px;border-radius:50%;background:#138808"></div></div></div>`],
  // multi-function displays in the cockpit
  mfd_warn: [800, 600, `<div style="width:800px;height:600px;background:#0a0202;font:700 64px/1.25 M;color:#ff2a1a;padding:40px;box-sizing:border-box">
     <div style="background:#ff2a1a;color:#0a0202;padding:6px 18px;display:inline-block">MASTER WARNING</div><br>ROTOR RPM LOW<br>ENG 1 TORQUE<br>NAV GYRO FAIL<br><span style="color:#ffb000">ATT ±48° ?</span></div>`],
  mfd_horizon: [800, 600, `<div style="width:800px;height:600px;background:linear-gradient(170deg,#1b4c8a 0 46%,#7a4a1c 46% 100%);position:relative;font:700 54px M;color:#d8ffd8">
     <div style="position:absolute;left:0;right:0;top:290px;height:6px;background:#ffd400"></div>
     <div style="position:absolute;left:40px;top:30px">ALT 0420</div><div style="position:absolute;right:40px;top:30px;color:#ff3a2a">VSI -2600</div>
     <div style="position:absolute;left:40px;bottom:30px">IAS 091</div><div style="position:absolute;right:40px;bottom:30px;color:#ff3a2a">GYRO ✕</div></div>`],
  mfd_map: [800, 600, `<div style="width:800px;height:600px;background:#020a06;font:700 50px M;color:#36ff7a;padding:36px;box-sizing:border-box">
     MUMBAI SECTOR<br><span style="color:#ff3a2a">SURFACE WIND 1640 KM/H E</span><br>GPS: NO FIX<br>COMMS: CONTROL-2<br><br>▲ 0.8 NM  ROOFTOP SIGNAL</div>`],
  title_card: [10, 10, `<div></div>`],
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage();
  for (const [id, [w, h, html]] of Object.entries(pages)) {
    if (id === "title_card") continue;
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(`<!doctype html><html><head><meta charset=utf-8><style>${FF} html,body{margin:0;background:transparent}</style></head><body>${html}</body></html>`, { waitUntil: "load" });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(OUT, `${id}.png`), omitBackground: true });
    console.log("tex", id);
  }
  await b.close();
})();
