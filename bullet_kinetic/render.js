// Record bullet_kinetic.html frame by frame (window.seek), then mux with sfx into an MP4.
// Usage: node render.js            full render
//        node render.js --stills 0.5,1.4   check frames only
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const { execFileSync } = require('child_process');
const FPS = 60, DUR = 5, here = __dirname;
const frames = path.join(here, 'build', 'frames'), out = path.join(here, 'out');

(async () => {
  const si = process.argv.indexOf('--stills');
  const stills = si > 0 ? process.argv[si + 1].split(',').map(Number) : null;
  fs.mkdirSync(frames, { recursive: true }); fs.mkdirSync(out, { recursive: true });
  execFileSync('python3', ['-I', path.join(here, 'build.py')], { stdio: 'inherit' });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => { console.error('[page error]', e); process.exitCode = 1; });
  await page.goto('file://' + path.join(here, 'bullet_kinetic.html') + '?render=1');
  await page.evaluate(async () => {
    for (const f of ['900 50px Inter9', '800 50px Inter9', '600 50px Inter9']) await document.fonts.load(f, 'A');
    for (const f of ['800 50px Deva', '700 50px Deva']) await document.fonts.load(f, 'गोली');
    await document.fonts.ready;
  });
  const stage = await page.$('#stage');
  const grab = async (t, file) => { await page.evaluate(t => window.seek(t), t); await stage.screenshot({ path: file }); };
  if (stills) {
    for (const t of stills) await grab(t, path.join(out, `still_${t.toFixed(2)}.png`));
  } else {
    for (let i = 0; i < FPS * DUR; i++) {
      await grab(i / FPS, path.join(frames, `f_${String(i).padStart(4, '0')}.png`));
      if (i % 60 === 0) console.log(`frame ${i}/${FPS * DUR}`);
    }
  }
  await browser.close();
  if (stills) return;
  const wav = path.join(here, 'build', 'sfx.wav');
  execFileSync('python3', ['-I', path.join(here, 'sfx.py'), wav], { stdio: 'inherit' });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(frames, 'f_%04d.png'), '-i', wav,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    '-c:a', 'aac', '-b:a', '192k', '-shortest', path.join(out, 'bullet_kinetic_5s.mp4')], { stdio: 'inherit' });
  console.log('wrote', path.join(out, 'bullet_kinetic_5s.mp4'));
})();
