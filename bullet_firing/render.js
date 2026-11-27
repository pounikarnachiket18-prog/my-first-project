// Render the canvas scene to PNG frames, then mux with the sound effects into an MP4.
// Usage: node render.js [--stills 0.3,1.0,2.0]   (stills only, for checking)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const FPS = 60, DUR = 5;
const here = __dirname;
const work = process.env.FRAMES_DIR || path.join(here, 'build', 'frames');
const outDir = path.join(here, 'out');

(async () => {
  const stillsArg = process.argv.indexOf('--stills');
  const stills = stillsArg > 0 ? process.argv[stillsArg + 1].split(',').map(Number) : null;
  fs.mkdirSync(work, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('console', m => console.log('[page]', m.text()));
  page.on('pageerror', e => { console.error('[page error]', e); process.exitCode = 1; });
  await page.goto('file://' + path.join(here, 'index.html') + '?render=1');
  await page.evaluate(async () => {
    for (const w of [500, 700, 800]) await document.fonts.load(`${w} 40px Deva`, 'गोली');
    await document.fonts.ready;
  });

  const grab = async (t, file) => {
    const url = await page.evaluate(t => { window.renderFrame(t); return document.getElementById('c').toDataURL('image/png'); }, t);
    fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
  };

  if (stills) {
    for (const t of stills) await grab(t, path.join(outDir, `still_${t.toFixed(2)}.png`));
    await browser.close();
    return;
  }
  const n = FPS * DUR;
  for (let i = 0; i < n; i++) {
    await grab(i / FPS, path.join(work, `f_${String(i).padStart(4, '0')}.png`));
    if (i % 60 === 0) console.log(`frame ${i}/${n}`);
  }
  await browser.close();

  const wav = path.join(here, 'build', 'sfx.wav');
  execFileSync('python3', ['-I', path.join(here, 'sfx.py'), wav], { stdio: 'inherit' });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(work, 'f_%04d.png'), '-i', wav,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    '-c:a', 'aac', '-b:a', '192k', '-shortest', path.join(outDir, 'bullet_firing_5s.mp4')], { stdio: 'inherit' });
  console.log('wrote', path.join(outDir, 'bullet_firing_5s.mp4'));
})();
