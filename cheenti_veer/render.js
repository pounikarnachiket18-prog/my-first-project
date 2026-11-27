// Record the Three.js scene frame by frame (window.seek), then mux with the mix into an MP4.
// Usage: node render.js                     full render (30 fps, 20 s)
//        node render.js --stills 1,4.5,8.5  check frames into out/
//        node render.js --from 300 --to 450 render a range of frames (resume)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const { execFileSync } = require('child_process');
const FPS = 30, DUR = 20, here = __dirname;
const frames = path.join(here, 'build', 'frames'), out = path.join(here, 'out');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };

(async () => {
  const stills = arg('--stills') ? arg('--stills').split(',').map(Number) : null;
  const from = Number(arg('--from') ?? 0), to = Number(arg('--to') ?? FPS * DUR);
  fs.mkdirSync(frames, { recursive: true }); fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => { console.error('[page error]', e.message); process.exitCode = 1; });
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
  await page.goto('file://' + path.join(here, 'index.html') + '?render=1');
  await page.waitForFunction(() => window.sceneReady === true, null, { timeout: 120000 });
  await page.evaluate(async () => {
    for (const f of ['800 50px Deva', '700 50px Deva']) await document.fonts.load(f, 'चींटी वीर');
    for (const f of ['900 50px Inter9', '800 50px Inter9', '600 50px Inter9']) await document.fonts.load(f, 'A');
    await document.fonts.ready;
  });
  const stage = await page.$('#stage');
  const grab = async (t, file) => { await page.evaluate(t => window.seek(t), t); await stage.screenshot({ path: file }); };
  const t0 = Date.now();
  if (stills) {
    for (const t of stills) await grab(t, path.join(out, `still_${t.toFixed(2)}.png`));
    console.log(`stills: ${((Date.now() - t0) / stills.length / 1000).toFixed(2)} s/frame`);
    await browser.close(); return;
  }
  for (let i = from; i < to; i++) {
    await grab(i / FPS, path.join(frames, `f_${String(i).padStart(4, '0')}.png`));
    if (i % 30 === 0) console.log(`frame ${i}/${FPS * DUR}  ${((Date.now() - t0) / (i - from + 1) / 1000).toFixed(2)} s/frame`);
  }
  await browser.close();
  if (to < FPS * DUR || from > 0) return;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(frames, 'f_%04d.png'), '-i', path.join(here, 'build', 'mix.wav'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    '-c:a', 'aac', '-b:a', '192k', '-shortest', path.join(out, 'cheenti_veer_20s.mp4')], { stdio: 'inherit' });
  console.log('wrote', path.join(out, 'cheenti_veer_20s.mp4'));
})();
