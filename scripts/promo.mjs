// Records the promo video from the real tool, frame by frame, at 4K portrait.
//
//   npm run build && node scripts/promo.mjs [outDir] [music.mp3]
//
// It serves dist/ with `vite preview`, drives headless Chrome over CDP, and loads the page
// with ?record&hq: the page's clock only moves when this script calls __tick, so every frame
// is rendered at full resolution and screenshotted with nothing skipped. Each clip below is a
// timeline of pointer actions and captions. ffmpeg then joins the clips with short fades and
// lays the music under them when one is given.
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const OUT = resolve(process.argv[2] || 'promo');
const MUSIC = process.argv[3] ? resolve(process.argv[3]) : null;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FPS = 30, STEP = 1000 / FPS;
const VIEW = { width: 405, height: 720, scale: 2160 / 405 }; // CSS px; frames come out 2160x3840
const PORT = 4174, DEBUG = 9334;
const FADE = 0.35; // seconds of cross-fade between clips

// Screen points in CSS px for the 405x720 viewport (see slotPose and pack.home in main.js).
const PACK = { x: 202, y: 272 };
const TEAR = { from: 118, to: 300 };
const SLOT2 = { x: 131, y: 338 }; // left card of the middle row

// Captions are plain DOM over the canvas, so the CSS transitions run on the page's virtual clock.
const CAPTION_CSS = `
  #cap { position: fixed; z-index: 50; left: 0; right: 0; top: 34px; text-align: center; pointer-events: none;
         opacity: 0; transform: translateY(-10px); transition: opacity .45s ease, transform .45s ease; }
  #cap.on { opacity: 1; transform: none; }
  #cap.low { top: auto; bottom: 64px; }
  #cap b { display: inline-block; padding: 9px 20px; border-radius: 999px; background: rgba(255,255,255,.92);
           box-shadow: 0 8px 24px rgba(40,30,20,.12); color: #2a2622; font: 800 25px/1.2 'PingFang SC', system-ui; letter-spacing: .02em; }
  #cap i { display: block; margin-top: 9px; color: rgba(40,30,20,.62); font: 600 14px/1.3 'PingFang SC', system-ui; font-style: normal; letter-spacing: .06em; }
  #end { position: fixed; z-index: 50; inset: 0; display: flex; flex-direction: column; justify-content: space-between;
         padding: 70px 0 74px; text-align: center; pointer-events: none; opacity: 0; transition: opacity .6s ease; }
  #end.on { opacity: 1; }
  #end h1 { margin: 0; color: #2a2622; font: 900 40px/1.1 'PingFang SC', system-ui; letter-spacing: .02em; }
  #end h1 + p { margin: 12px 0 0; color: rgba(40,30,20,.6); font: 600 15px/1.3 'PingFang SC', system-ui; letter-spacing: .12em; }
  #end footer b { display: inline-block; padding: 11px 22px; border-radius: 999px; background: #ff2442; color: #fff;
                  font: 800 18px/1.2 'PingFang SC', system-ui; }
  #end footer p { margin: 12px 0 0; color: rgba(40,30,20,.55); font: 600 13px/1.2 ui-monospace, Menlo, monospace; }
  body.promo-end .dock { display: none !important; }`;

// Each clip: the page query, its length, and timed steps. `at` is seconds into the clip.
const tear = (at) => [
  { at, move: [TEAR.from, PACK.y] },
  { at: at + 0.35, down: [TEAR.from, PACK.y] },
  { at: at + 0.4, drag: [TEAR.from, TEAR.to, PACK.y, 0.75] },
  { at: at + 1.2, up: [TEAR.to, PACK.y] },
];
const admire = (at, secs) => ({ at, orbit: [SLOT2.x + 70, 330, 70, secs] }); // pointer circles so the holo foil moves

const CLIPS = [
  {
    name: 'zodiac', query: 'series=zodiac&cards=aries,gemini,leo,scorpio,pisces', length: 11,
    steps: [
      { at: 0.3, cap: ['撕开一包 Clawd', '星座 · 生肖 · 节日 闪卡'] },
      { at: 2.2, cap: null },
      ...tear(1.8),
      { at: 5.6, move: [SLOT2.x, SLOT2.y] },
      { at: 6.4, click: [SLOT2.x, SLOT2.y] },
      { at: 6.9, cap: ['超稀有 · 狮子座', null] }, // one line: a second would cover the card's top edge
      admire(7.3, 3.6),
    ],
  },
  {
    name: 'shengxiao', query: 'series=shengxiao&cards=rabbit,ox,dragon,monkey,pig', length: 8.6,
    steps: [
      { at: 0.2, cap: ['十二生肖', '每包 5 张  稀有度随机'] },
      { at: 1.4, cap: null },
      ...tear(1.0),
      { at: 4.6, move: [SLOT2.x, SLOT2.y] },
      { at: 5.3, click: [SLOT2.x, SLOT2.y] },
      { at: 5.7, cap: ['超稀有 · 龙', null] },
      admire(5.9, 2.6),
    ],
  },
  {
    name: 'festival', query: 'series=festival&cards=valentine,midautumn,lunar,halloween,reindeer', length: 8.2,
    steps: [
      { at: 0.2, cap: ['节日限定', '春节 · 中秋 · 万圣 · 圣诞'] },
      { at: 1.4, cap: null },
      ...tear(1.0),
      { at: 4.6, move: [SLOT2.x, SLOT2.y] },
      { at: 5.3, click: [SLOT2.x, SLOT2.y] },
      { at: 5.7, cap: ['超稀有 · 春节', null] },
      admire(5.9, 2.2),
    ],
  },
  {
    name: 'dex', query: 'series=zodiac', length: 4.4,
    steps: [
      { at: 0.5, js: "document.querySelector('#idle-bar .dex-open').click()" },
      { at: 0.9, cap: ['30 张图鉴  等你集齐', null, 'low'] },
      { at: 1.4, scroll: [1.0, 2.6, 420] },
    ],
  },
  {
    name: 'end', query: 'series=zodiac', length: 3.6,
    steps: [{ at: 0.4, end: true }],
  },
];

// ---- CDP plumbing ----
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const tabs = await (await fetch(`http://127.0.0.1:${DEBUG}/json/list`)).json();
      const tab = tabs.find((t) => t.type === 'page');
      if (tab) {
        const ws = new WebSocket(tab.webSocketDebuggerUrl);
        await new Promise((r, j) => (ws.onopen = r, ws.onerror = j));
        let id = 0;
        const pending = new Map();
        ws.onmessage = (e) => {
          const m = JSON.parse(e.data);
          if (pending.has(m.id)) pending.get(m.id)(m), pending.delete(m.id);
        };
        const cdp = (method, params = {}) => new Promise((r) => (pending.set(++id, r), ws.send(JSON.stringify({ id, method, params }))));
        return { ws, cdp };
      }
    } catch {}
    await sleep(200);
  }
  throw new Error('Chrome did not come up');
}

async function recordClip({ cdp }, clip, dir) {
  const js = async (expression) => {
    const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.result?.exceptionDetails) throw new Error(`${clip.name}: ${r.result.exceptionDetails.text}`);
    return r.result?.result?.value;
  };
  // A move reports the left button only while it is held, so hovering is not read as a drag.
  const mouse = (type, x, y, extra = {}) =>
    cdp('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' && !held ? 'none' : 'left', ...extra });
  await cdp('Page.navigate', { url: `http://127.0.0.1:${PORT}/?record&hq&${clip.query}` });
  for (let i = 0; i < 100 && !(await js("typeof __tick === 'function' && !!document.body.dataset.phase").catch(() => false)); i++) await sleep(100);
  await js(`(() => {
    const s = document.createElement('style'); s.textContent = ${JSON.stringify(CAPTION_CSS)}; document.head.append(s);
    const c = document.createElement('div'); c.id = 'cap'; document.body.append(c);
    const e = document.createElement('div'); e.id = 'end';
    e.innerHTML = '<header><h1>Clawd 闪卡包</h1><p>撕开卡包 · 收集星座生肖卡</p></header>' +
      '<footer><b>小红书搜「Clawd 闪卡包」</b><p>clawd.sweetretry.com</p></footer>';
    document.body.append(e);
    window.__cap = (t, sub, where) => {
      if (!t) return c.classList.remove('on');
      c.innerHTML = '<b>' + t + '</b>' + (sub ? '<i>' + sub + '</i>' : '');
      c.className = 'on' + (where ? ' ' + where : '');
    };
  })()`);
  await document_fonts_ready(js);

  mkdirSync(dir, { recursive: true });
  const frames = Math.round(clip.length * FPS);
  const steps = clip.steps.slice().sort((a, b) => a.at - b.at);
  const active = []; // steps that span time: drag, orbit, scroll
  let held = null;
  for (let f = 0; f < frames; f++) {
    const t = f / FPS;
    while (steps.length && steps[0].at <= t) {
      const s = steps.shift();
      if (s.move) await mouse('mouseMoved', ...s.move);
      if (s.down) await mouse('mousePressed', ...s.down, { clickCount: 1 }), (held = 'left');
      if (s.up) await mouse('mouseReleased', ...s.up, { clickCount: 1 }), (held = null);
      if (s.click) {
        await mouse('mouseMoved', ...s.click);
        await mouse('mousePressed', ...s.click, { clickCount: 1 });
        await mouse('mouseReleased', ...s.click, { clickCount: 1 });
      }
      if ('cap' in s) await js(`__cap(${JSON.stringify(s.cap?.[0] ?? null)}, ${JSON.stringify(s.cap?.[1] ?? null)}, ${JSON.stringify(s.cap?.[2] ?? null)})`);
      if (s.js) await js(s.js);
      if (s.end) await js("document.body.classList.add('promo-end'); document.getElementById('end').classList.add('on')");
      if (s.drag || s.orbit || s.scroll) active.push(s);
    }
    for (const s of active) {
      if (s.drag) {
        const [x0, x1, y, secs] = s.drag, k = Math.min((t - s.at) / secs, 1), e = k * k * (3 - 2 * k);
        await mouse('mouseMoved', x0 + (x1 - x0) * e, y, held ? { buttons: 1 } : {});
      }
      if (s.orbit) {
        const [cx, cy, r, secs] = s.orbit, a = ((t - s.at) / secs) * Math.PI * 2;
        if (t - s.at <= secs) await mouse('mouseMoved', cx + Math.sin(a) * r, cy - Math.cos(a) * r * 0.8);
      }
      if (s.scroll) {
        const [delay, secs, px] = s.scroll, k = Math.max(0, Math.min((t - s.at - delay) / secs, 1));
        await js(`document.getElementById('dex').scrollTop = ${(k * k * (3 - 2 * k) * px).toFixed(1)}`);
      }
    }
    await js(`__tick(${STEP})`);
    const shot = await cdp('Page.captureScreenshot', { format: 'jpeg', quality: 93 });
    writeFileSync(join(dir, `${String(f).padStart(5, '0')}.jpg`), Buffer.from(shot.result.data, 'base64'));
    if (f % 30 === 0) process.stdout.write(`\r${clip.name} ${f}/${frames}   `);
  }
  process.stdout.write(`\r${clip.name} ${frames}/${frames} done\n`);
}
async function document_fonts_ready(js) {
  await js('document.fonts.ready.then(() => true)');
}

// ---- run ----
// ONLY=zodiac,dex records just those clips and skips assembly, for checking a change quickly.
const RUN = process.env.ONLY ? CLIPS.filter((c) => process.env.ONLY.split(',').includes(c.name)) : CLIPS;
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const profile = join(tmpdir(), `clawd-promo-${process.pid}`); // fresh, so the dex starts empty
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' });
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${DEBUG}`, `--user-data-dir=${profile}`,
  '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars', '--font-render-hinting=none', 'about:blank'], { stdio: 'ignore' });
try {
  await sleep(1500);
  const conn = await connect();
  await conn.cdp('Emulation.setDeviceMetricsOverride', { width: VIEW.width, height: VIEW.height, deviceScaleFactor: VIEW.scale, mobile: true });
  for (const clip of RUN) await recordClip(conn, clip, join(OUT, clip.name));
  conn.ws.close();
} finally {
  const exited = new Promise((r) => chrome.once('exit', r));
  chrome.kill();
  server.kill();
  await exited; // Chrome keeps writing its profile until it is gone
  rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
}

// ---- assemble ----
if (process.env.ONLY) process.exit(0);
const enc = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(FPS)];
for (const clip of CLIPS) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(OUT, clip.name, '%05d.jpg'), ...enc, join(OUT, `${clip.name}.mp4`)]);
}
const inputs = CLIPS.flatMap((c) => ['-i', join(OUT, `${c.name}.mp4`)]);
let graph = '', prev = '[0:v]', offset = 0;
CLIPS.slice(1).forEach((c, i) => {
  offset += CLIPS[i].length - FADE;
  const out = i === CLIPS.length - 2 ? '[v]' : `[x${i}]`;
  graph += `${prev}[${i + 1}:v]xfade=transition=fade:duration=${FADE}:offset=${offset.toFixed(3)}${out};`;
  prev = out;
});
const total = CLIPS.reduce((s, c) => s + c.length, 0) - FADE * (CLIPS.length - 1);
const video = join(OUT, 'clawd-promo-4k.mp4');
const audio = MUSIC && existsSync(MUSIC)
  ? ['-i', MUSIC, '-filter_complex', `${graph}[${CLIPS.length}:a]atrim=0:${total.toFixed(2)},afade=t=in:d=0.4,afade=t=out:st=${(total - 1.2).toFixed(2)}:d=1.2[a]`, '-map', '[v]', '-map', '[a]', '-c:a', 'aac', '-b:a', '192k']
  : ['-filter_complex', graph.replace(/;$/, ''), '-map', '[v]'];
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, ...audio, ...enc, '-movflags', '+faststart', video]);
console.log(`${video}  ${total.toFixed(1)}s`);
