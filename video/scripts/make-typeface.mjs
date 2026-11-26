// Converts a TTF into three.js typeface JSON (used by the 3D logo).
// Usage: node scripts/make-typeface.mjs assets/InterTight-Black.ttf public/jki/fonts/InterTight-Black.typeface.json
import fs from "node:fs";
import opentype from "opentype.js";

const [src, out] = process.argv.slice(2);
const font = opentype.loadSync(src);
const scale = 1000 / font.unitsPerEm;
const chars = "JUSTKNOWIjustknowi .?!0123456789";
const glyphs = {};
for (const ch of new Set(chars)) {
  const g = font.charToGlyph(ch);
  const path = g.getPath(0, 0, 1000);
  const o = [];
  for (const c of path.commands) {
    // three's FontLoader expects y-up; opentype getPath is y-down
    const p = (x, y) => `${Math.round(x)} ${Math.round(-y)}`;
    if (c.type === "M") o.push(`m ${p(c.x, c.y)}`);
    else if (c.type === "L") o.push(`l ${p(c.x, c.y)}`);
    else if (c.type === "Q") o.push(`q ${p(c.x, c.y)} ${p(c.x1, c.y1)}`);
    else if (c.type === "C") o.push(`b ${p(c.x, c.y)} ${p(c.x1, c.y1)} ${p(c.x2, c.y2)}`);
  }
  const bb = g.getBoundingBox();
  glyphs[ch] = { ha: Math.round(g.advanceWidth * scale), x_min: Math.round(bb.x1 * scale), x_max: Math.round(bb.x2 * scale), o: o.join(" ") };
}
const json = {
  glyphs,
  familyName: "Inter Tight Black",
  ascender: Math.round(font.ascender * scale),
  descender: Math.round(font.descender * scale),
  underlinePosition: -100,
  underlineThickness: 50,
  boundingBox: { yMin: Math.round(font.tables.head.yMin * scale), xMin: Math.round(font.tables.head.xMin * scale), yMax: Math.round(font.tables.head.yMax * scale), xMax: Math.round(font.tables.head.xMax * scale) },
  resolution: 1000,
  original_font_information: { format: 0, fontFamily: "Inter Tight", license: "SIL Open Font License 1.1" },
};
fs.writeFileSync(out, JSON.stringify(json));
console.log(`wrote ${out} (${Object.keys(glyphs).length} glyphs)`);
