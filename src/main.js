// Scene setup and the pack-opening state machine:
//   enter -> idle <-> tearing -> charge -> burst -> row <-> inspect
//   row -> exit -> enter
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createCard, CARD, SERIES, TIME } from './card.js';
import { createPack, PACK } from './pack.js';
import { createRays, createConfetti } from './fx.js';
import { dex, loadDex, renderDex } from './dex.js';
import { initCompat } from './compat.js';
import { createPerf } from './perf.js';

// Runs before any rendering so the capability classes are on <html> for the first paint.
initCompat();

const $ = (sel) => document.querySelector(sel);
const clamp = THREE.MathUtils.clamp, damp = THREE.MathUtils.damp;
const canvas = $('#stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, stencil: true });
const perf = createPerf(renderer, () => {
  // Perf HUD tap: alternate 1.5 and 1, to tell a GPU-bound phone from a CPU-bound one.
  dprManual = true;
  renderer.setPixelRatio(renderer.getPixelRatio() > 1 ? 1 : Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight, false);
});

// Drawing-buffer resolution. Phones report a DPR of 3, and every pixel runs the foil and
// clearcoat shaders, so this starts at 1.5 and steps down while frames run long.
// It never steps back up: a phone that struggled once is likely to struggle again (it heats).
// ?hq renders at the device's full DPR with no stepping down, for recording promo footage.
const DPR_STEPS = /[?&]hq\b/.test(location.search) ? [devicePixelRatio] : [1.5, 1.25, 1].map((d) => Math.min(devicePixelRatio, d));
let dprStep = 0;
renderer.setPixelRatio(DPR_STEPS[0]);
const governor = { slow: 0, frames: 0 };
let dprManual = false; // set by the perf HUD while comparing resolutions by hand
function govern(dt) {
  if (dprManual || dprStep === DPR_STEPS.length - 1) return;
  governor.frames++;
  if (dt > 1 / 40) governor.slow++; // under 40 fps
  if (governor.frames < 90) return;
  if (governor.slow > 45) {
    dprStep++;
    renderer.setPixelRatio(DPR_STEPS[dprStep]);
    renderer.setSize(innerWidth, innerHeight, false);
  }
  governor.slow = governor.frames = 0;
}
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(28, 1, 0.5, 100);
const TAN = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));

// Layer 1 is the snapshot studio: the lights live there too, and a card joins it only while being photographed.
const SHOT = 1, SOLO = 2; // SOLO: see the showcase section
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.6;
const key = new THREE.DirectionalLight(0xffffff, 1.5), fill = new THREE.AmbientLight(0xffffff, 0.2);
key.position.set(-4, 6, 8);
for (const light of [key, fill]) {
  light.layers.enable(SHOT);
  light.layers.enable(SOLO);
}
scene.add(key, fill);

// ---- cards ----
// Cards are built on first deal and reused. `cards` is the hand of five in play.
// ?series=festival picks the starting series. ?cards=leo,pig forces a hand, for checking art.
const query = new URLSearchParams(location.search);
const forced = query.get('cards')?.split(',');
const ALL = SERIES.flatMap((s) => s.defs);
const WEIGHT = { common: 6, rare: 3, ultra: 1 };
// Built cards, least recently used first. Each holds a 1024px label texture of about 8 MB
// with mipmaps, so only the last KEEP are kept: all 30 would hold some 240 MB of GPU memory.
const built = new Map();
const KEEP = 10;
// The next hand, drawn early and built one card per frame while the row rests, so that
// "again" does not stall for ~100 ms building five cards in one frame.
let next = null; // { series, defs, i }
let series = SERIES.find((s) => s.id === query.get('series')) ?? SERIES[0];
let cards = [];
let inspected = null;

function cardFor(def) {
  let made = built.get(def);
  if (made) {
    built.delete(def); // re-inserted below, as the most recent
  } else {
    made = createCard(def);
    scene.add(made.group, made.shadow);
    made.setVisible(false);
    // Upload its label and compile its shaders now, not on the first frame it is drawn.
    renderer.initTexture(made.front.material.uniforms.uText.value);
    renderer.compileAsync(made.group, camera, scene).catch(() => {});
  }
  built.set(def, made);
  return made;
}
function evict(inUse) {
  for (const [def, c] of built) {
    if (built.size <= KEEP) break;
    if (inUse.has(c)) continue;
    scene.remove(c.group, c.shadow);
    c.dispose();
    built.delete(def);
  }
}
// Weighted draw without replacement: rarer cards get smaller keys on average.
function draw() {
  if (forced) return forced.map((v) => ALL.find((d) => d.variant === v)).filter(Boolean);
  return series.defs.map((def) => [Math.random() ** (1 / WEIGHT[def.rarity]), def]).sort((a, b) => b[0] - a[0]).slice(0, 5).map(([, def]) => def);
}
function prebuild() {
  if (!next || next.series !== series) next = { series, defs: draw(), i: 0 };
  if (next.i < next.defs.length) cardFor(next.defs[next.i++]);
}
function deal() {
  for (const c of cards) c.setVisible(false);
  const defs = next && next.series === series ? next.defs : draw();
  next = null;
  cards = defs.map((def, slot) => {
    const c = cardFor(def);
    c.slot = slot;
    c.setStencil(slot + 1);
    c.setVisible(false);
    return c;
  });
  pack.setPeek(defs.map((def) => def.colA));
  evict(new Set(cards));
}

const pack = createPack();
const rays = createRays();
const confetti = createConfetti();
scene.add(rays.mesh, confetti.group);
confetti.group.traverse((o) => o.layers.enable(SOLO));

const blob = document.createElement('canvas');
blob.width = blob.height = 128;
const bg = blob.getContext('2d');
const grad = bg.createRadialGradient(64, 64, 0, 64, 64, 64);
grad.addColorStop(0, 'rgba(45,32,20,0.5)');
grad.addColorStop(1, 'rgba(45,32,20,0)');
bg.fillStyle = grad;
bg.fillRect(0, 0, 128, 128);
const packShadow = new THREE.Mesh(
  new THREE.PlaneGeometry(3.3, 0.6),
  new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(blob), transparent: true, depthWrite: false, toneMapped: false, opacity: 0 })
);
scene.add(packShadow); // resize() places it under the pack

// Hides the row while one card is inspected. It writes depth so decals on the cards behind it are culled too.
const INSPECT_Z = 5;
const veil = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshBasicMaterial({ color: 0xedece6, transparent: true, opacity: 0, toneMapped: false })
);
veil.position.z = INSPECT_Z / 2;
veil.renderOrder = 3.5;
veil.visible = false;
scene.add(veil);

// ---- layout ----
let portrait = false;
function slotPose(slot) {
  if (!portrait) return [(slot - 2) * 2.32, 0.2, 0.1, 0, 0, 0, 1];
  // Phones: two columns, three rows, the fifth card centred on the last row.
  return [slot === 4 ? 0 : ((slot & 1) - 0.5) * 2.3, 3.5 - (slot >> 1) * 3.15, 0.1, 0, 0, 0, 1];
}
const FAN = [[-2.7, 0.15, -0.18], [-1.25, 1.05, 0.1], [-0.7, -0.6, -0.07], [1.2, 0.95, 0.12], [1.95, -0.5, -0.1]];
function fanPose(slot) {
  const [x, y, rz] = FAN[slot];
  const k = portrait ? 0.45 : 1;
  return [x * k, y, 0.3 + slot, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.5, rz, portrait ? 0.62 : 0.95];
}
function inspectPose() {
  const visH = 2 * (camera.position.z - INSPECT_Z) * TAN, visW = visH * camera.aspect;
  return [0, visH * 0.035, INSPECT_Z, 0, 0, 0, Math.min((0.68 * visH) / CARD.H, (0.82 * visW) / CARD.W)];
}
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  portrait = camera.aspect < 0.95;
  const [needW, needH] = portrait ? [5.3, 11.6] : [14.6, 6.6];
  camera.position.z = Math.max(needH / 2 / TAN, needW / 2 / (TAN * camera.aspect));
  camera.updateProjectionMatrix();
  // On phones the pack rests about 12% of the screen above centre. The note page and the
  // profile grid show the top of this first screen as the cover, cropped at the bottom with
  // a "use tool" button laid over it, so a centred pack loses its lower half and its face.
  // The lower part of the screen is left for the controls.
  pack.home = portrait ? 0.12 * 2 * camera.position.z * TAN : 0;
  packShadow.position.y = pack.home - (PACK.H * PACK.SCALE) / 2 - 0.55;
  if (state.phase === 'row' || state.phase === 'inspect') for (const c of cards) c.base.set(c === inspected ? inspectPose() : slotPose(c.slot));
  if (showcase && !showcase.leaving) showcase.card.base.set(inspectPose());
}

// ---- snapshots ----
// Renders one card alone, in a fixed pose, onto a 2D canvas. Used for dex thumbnails and image export.
const studio = new THREE.PerspectiveCamera(camera.fov, 1, 0.5, 50);
studio.layers.set(SHOT);
studio.position.z = 1.8 / TAN;
function snapshot(card, w, h) {
  const g = card.group;
  const saved = { visible: g.visible, pos: g.position.clone(), rot: g.rotation.clone(), scale: g.scale.x, ratio: renderer.getPixelRatio() };
  g.visible = true;
  g.position.set(0, 0, 0);
  g.rotation.set(0.04, -0.16, 0);
  g.scale.setScalar(1);
  g.traverse((o) => o.layers.enable(SHOT));
  studio.aspect = w / h;
  studio.updateProjectionMatrix();
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  renderer.render(scene, studio);
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  out.getContext('2d').drawImage(canvas, 0, 0);

  g.traverse((o) => o.layers.disable(SHOT));
  g.visible = saved.visible;
  g.position.copy(saved.pos);
  g.rotation.copy(saved.rot);
  g.scale.setScalar(saved.scale);
  renderer.setPixelRatio(saved.ratio);
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.render(scene, camera);
  return out;
}
function thumbnail(card) {
  card.crab.face = 'idle';
  card.crab.look.set(0, 0);
  card.crab.update(time, 0.2);
  return snapshot(card, 216, 300).toDataURL('image/webp', 0.85);
}
function exportCard(card) {
  const W = 1200, H = 1600, { def } = card;
  const out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  const g = out.getContext('2d');
  const sky = g.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, H * 0.8);
  sky.addColorStop(0, '#f5f4ef');
  sky.addColorStop(1, '#dfded7');
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  g.shadowColor = 'rgba(45,32,20,0.3)';
  g.shadowBlur = 70;
  g.shadowOffsetY = 44;
  g.drawImage(snapshot(card, 1044, 1450), 78, 30);
  g.shadowColor = 'transparent';
  g.fillStyle = 'rgba(40,30,20,0.5)';
  g.textAlign = 'center';
  g.font = '500 30px "Inter", system-ui, -apple-system, "PingFang SC", sans-serif';
  g.fillText(`clawd · ${def.series.title} · No. ${def.no}/${def.total}`, W / 2, H - 56);
  return out.toDataURL('image/png');
}
// Web fallback: hand the PNG to the browser's download flow.
// Only reached when the mini tool container is absent, since the container blocks
// downloads. Kept so the same build still works as a plain web page.
function downloadCard(dataUrl, def) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `clawd-${def.variant}.png`;
  document.body.append(a);
  a.click();
  a.remove();
}

// Two delivery paths, picked by what the runtime actually is.
//   mini tool container -> saveImageToPhotosAlbum (the container blocks downloads)
//   plain web page      -> a normal download
async function saveCard(card) {
  const dataUrl = exportCard(card);
  const miniTool = window.xhs && window.xhs.miniTool;
  const canSaveToAlbum = !!miniTool && typeof miniTool.saveImageToPhotosAlbum === 'function';

  if (!canSaveToAlbum) {
    downloadCard(dataUrl, card.def);
    toast('已导出图片');
    return;
  }

  try {
    await miniTool.saveImageToPhotosAlbum({ filePath: dataUrl });
    toast('已保存到相册');
  } catch (error) {
    toast('保存失败，请重试');
    console.log(error && error.errMsg, error && error.errCode);
  }
}

// ?sheet=zodiac downloads a contact sheet of one series, ?sheet=all of every card, for reviewing the art.
// Desktop browsers only: the mini tool container blocks downloads.
function exportSheet(defs, name) {
  const cols = Math.min(defs.length, Number(query.get('cols')) || 6), w = 420, h = 584;
  const out = document.createElement('canvas');
  out.width = cols * w;
  out.height = Math.ceil(defs.length / cols) * h;
  const g = out.getContext('2d');
  g.fillStyle = '#edece6';
  g.fillRect(0, 0, out.width, out.height);
  defs.forEach((def, i) => {
    const c = cardFor(def);
    c.crab.update(i * 0.37, 0.2);
    g.drawImage(snapshot(c, w, h), (i % cols) * w, Math.floor(i / cols) * h);
  });
  out.toBlob((file) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = `clawd-sheet-${name}.png`;
    a.click();
  });
}

// ---- state machine ----
const FAN_HOLD = 1.45, STAGGER = 0.06, LAUNCH_GAP = 0.08, CHARGE = 0.24;
const state = { phase: '', t: 0 };
function setPhase(p) {
  state.phase = p;
  state.t = 0;
  document.body.dataset.phase = p;
}
const origin = new THREE.Vector3();
// p is how far the strip is torn. While held it follows the pointer, once let go it runs to `target`.
const tear = { p: 0, target: 0, held: false, startX: 0 };

function newPack() {
  perf.mark('deal', deal);
  pack.reset(scene, series.pack);
  setPhase('enter');
}
function startTear(held, startX = 0) {
  if (state.phase !== 'idle') return;
  Object.assign(tear, { p: 0, target: held ? 0 : 1, held, startX });
  setPhase('tearing');
}
function burst() {
  pack.openingWorld(origin);
  let fresh = 0;
  for (const c of cards) {
    if (dex.collect(c.def)) fresh++;
    c.rowed = c.launched = false;
  }
  refreshDexCount();
  if (fresh) toast(`新卡 +${fresh}`);
  buzz();
  confetti.burst(origin);
  rays.launch();
  pack.release(scene);
  shake = 1;
  const glare = $('#flash');
  glare.classList.remove('go');
  void glare.offsetWidth; // restart the animation
  glare.classList.add('go');
  setPhase('burst');
}
// A thump in the hand as the pack bursts. Container client 9.50+; silently absent elsewhere.
function buzz() {
  const miniTool = window.xhs && window.xhs.miniTool;
  if (!miniTool || typeof miniTool.vibrateShort !== 'function') return;
  try {
    const done = miniTool.vibrateShort({ type: 'medium' });
    if (done && done.catch) done.catch(() => {});
  } catch (error) {}
}
// Cards leave the mouth one after another and spin up into the fan.
function launch(c) {
  c.launched = true;
  c.setVisible(true);
  c.off.fill(0);
  c.place([origin.x + (Math.random() - 0.5) * 0.6, origin.y - 0.3, 0.3 + c.slot, 0, 0, (Math.random() - 0.5) * 2.4, 0.2]);
  c.base.set(fanPose(c.slot));
  c.kick((Math.random() - 0.5) * 6, 13, 0);
}
function inspect(card) {
  inspected = card;
  card.off.fill(0);
  card.base.set(inspectPose());
  card.spin(-7);
  card.flash();
  if (card.def.rarity === 'ultra') confetti.burst(origin.set(0, -1, INSPECT_Z + 1));
  setPhase('inspect');
}
function closeInspect() {
  if (state.phase !== 'inspect') return;
  inspected.base.set(slotPose(inspected.slot));
  inspected = null;
  setPhase('row');
}

// ---- showcase: a card opened from the dex ----
// The dex stays open behind it. The canvas is raised above the dex panel and the camera is
// limited to the SOLO layer, so this one card is all that gets drawn. It is its own card
// instance and not a phase, so the pack state machine underneath is left alone.
let showcase = null; // { card, t, leaving }
function openShowcase(def) {
  dropShowcase();
  const card = createCard(def);
  card.group.traverse((o) => o.layers.set(SOLO));
  scene.add(card.group);
  card.place([0, -9, INSPECT_Z, 0, 0, 0.3, 0.5]);
  card.base.set(inspectPose());
  card.spin(-7);
  card.flash();
  if (def.rarity === 'ultra') confetti.burst(origin.set(0, -1, INSPECT_Z + 1));
  showcase = { card, t: 0, leaving: false };
  document.body.dataset.showcase = 'on';
}
function closeShowcase() {
  if (!showcase || showcase.leaving) return;
  showcase.leaving = true;
  showcase.card.base[1] = -14;
  document.body.dataset.showcase = 'leaving';
}
function dropShowcase() {
  if (!showcase) return;
  scene.remove(showcase.card.group);
  showcase.card.dispose();
  showcase = null;
  delete document.body.dataset.showcase;
}
function again() {
  closeInspect();
  if (state.phase !== 'row') return;
  for (const c of cards) {
    c.off.fill(0);
    c.base[1] = -9 - c.slot * 0.6;
    c.base[5] = (Math.random() - 0.5) * 1.2;
  }
  setPhase('exit');
}

// ---- input ----
const pointer = new THREE.Vector2(0, 0.2);
const raycaster = new THREE.Raycaster();
const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const hitPoint = new THREE.Vector3(), ndc = new THREE.Vector3();
const track = (e) => pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
function pointerAtDepth(z) {
  plane.constant = -z;
  raycaster.setFromCamera(pointer, camera);
  return raycaster.ray.intersectPlane(plane, hitPoint);
}
// Hover is tested against where things rest, not against the tilting, lifting meshes, and the
// zone grows a little once hovered. Otherwise the reaction to hovering moves the edge out
// from under the pointer and the hover flickers.
let packHover = false, hovered = null, shake = 0;
let live = true; // false once a finger lifts: there is no pointer left to hover or aim with
const aim = new THREE.Vector2(), CENTER = new THREE.Vector2();
function overPack() {
  const p = pointerAtDepth(0), grow = packHover ? 1.1 : 1;
  return Math.abs(p.x) < (PACK.W * PACK.SCALE * grow) / 2 && Math.abs(p.y - pack.group.position.y) < (PACK.H * PACK.SCALE * grow) / 2;
}
function cardUnderPointer(current) {
  const p = pointerAtDepth(0.1);
  const inside = (c, grow) => Math.abs(p.x - c.base[0]) < (CARD.W * grow) / 2 && Math.abs(p.y - c.base[1]) < (CARD.H * grow) / 2;
  return current && inside(current, 1.12) ? current : cards.find((c) => inside(c, 1)) ?? null;
}

addEventListener('pointermove', (e) => {
  track(e);
  live = true;
});
canvas.addEventListener('pointerdown', (e) => {
  track(e);
  live = true;
  if (!showcase && state.phase === 'idle' && overPack()) {
    canvas.setPointerCapture(e.pointerId);
    startTear(true, pointerAtDepth(0).x);
  }
});
function lift(e) {
  if (e.pointerType === 'touch') live = false;
  if (!tear.held) return;
  tear.held = false;
  tear.target = tear.p > 0.45 ? 1 : 0;
}
addEventListener('pointerup', lift);
addEventListener('pointercancel', lift);
canvas.addEventListener('click', (e) => {
  track(e);
  if (showcase) return closeShowcase();
  if (state.phase === 'inspect') return closeInspect();
  const card = state.phase === 'row' && cardUnderPointer(null);
  if (card) inspect(card);
});
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') return showcase ? closeShowcase() : dexPanel.hidden ? closeInspect() : (dexPanel.hidden = true);
  if (!dexPanel.hidden) return; // the table is covered
  if (e.key !== ' ' && e.key !== 'Enter') return;
  e.preventDefault();
  startTear(false);
  again();
});
addEventListener('resize', resize);
$('#again').addEventListener('click', again);
$('#save').addEventListener('click', () => {
  const card = showcase ? showcase.card : inspected;
  if (card) saveCard(card);
});
$('#back').addEventListener('click', () => (showcase ? closeShowcase() : closeInspect()));

const tabs = $('#series');
for (const s of SERIES) {
  const b = document.createElement('button');
  b.textContent = s.label;
  b.setAttribute('aria-pressed', s === series);
  b.addEventListener('click', () => {
    series = s;
    for (const el of tabs.children) el.setAttribute('aria-pressed', el === b);
    closeInspect();
    if (state.phase === 'row') again();
    else if (state.phase === 'idle' || state.phase === 'enter') newPack();
  });
  tabs.append(b);
}

const dexPanel = $('#dex');
const refreshDexCount = () => {
  for (const el of document.querySelectorAll('.dex-count')) el.textContent = `${dex.count(ALL)} / ${ALL.length}`;
};
for (const el of document.querySelectorAll('.dex-open')) {
  el.addEventListener('click', () => {
    // Thumbnails of newly pulled cards are rendered here, while the table is covered.
    dex.fillThumbs(ALL, (def) => perf.mark('thumb', () => thumbnail(cardFor(def))));
    renderDex($('#dex-body'), SERIES);
    dexPanel.hidden = false;
  });
}
$('#dex-body').addEventListener('click', (e) => {
  const tile = e.target.closest('figure[data-id]');
  if (tile) openShowcase(ALL.find((def) => def.id === tile.dataset.id));
});
$('#dex-close').addEventListener('click', () => (dexPanel.hidden = true));
$('#dex-clear').addEventListener('click', () => {
  if (!confirm('清空图鉴？已收集的卡片记录会全部删除。')) return;
  dex.clear();
  refreshDexCount();
  renderDex($('#dex-body'), SERIES);
});
let toastTimer;
function toast(text) {
  const el = $('#toast');
  el.textContent = text;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), 2600);
}

// Turns a card's crab toward the pointer, measured on screen from where the card sits.
function watch(c, dt) {
  ndc.copy(c.group.position).project(camera);
  const look = c.crab.look;
  look.set(damp(look.x, live ? clamp((pointer.x - ndc.x) * 2.5, -1, 1) : 0, 8, dt), damp(look.y, live ? clamp((pointer.y - ndc.y) * 2.5, -1, 1) : 0, 8, dt));
}

// ---- frame ----
const HOVER_LIFT = 0.9;
let last = performance.now(), time = 0, cursor = '';

// The loop stops while the page is hidden or the GL context is lost. `running` keeps a
// second loop from starting when both resume.
let running = false, paused = false;
// ?record hands the clock to a capture script (scripts/promo.mjs): nothing moves until it
// calls window.__tick(ms), and CSS animations and timers advance by the same virtual time.
// Every frame can then be screenshotted at 4K without the scene running ahead.
const manual = /[?&]record\b/.test(location.search);
function run() {
  if (manual || running || paused || document.hidden) return;
  running = true;
  last = performance.now(); // no catch-up frames after a pause
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange', run);
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault(); // lets the browser restore it
  paused = true;
  toast('画面暂停，稍后自动恢复');
});
canvas.addEventListener('webglcontextrestored', () => {
  paused = false;
  run();
});

function frame(now) {
  if (paused || document.hidden) {
    running = false;
    return;
  }
  const t0 = performance.now();
  const dt = Math.min((now - last) / 1000, 1 / 30);
  govern((now - last) / 1000);
  last = now;
  time += dt;
  state.t += dt;
  TIME.value = time;

  aim.copy(live ? pointer : CENTER);
  packHover = tear.held || (live && state.phase === 'idle' && overPack());
  if (state.phase !== 'row' || !live) hovered = null;

  switch (state.phase) {
    case 'enter':
      if (state.t > 0.7) setPhase('idle');
      break;
    case 'tearing':
      if (tear.held) {
        tear.target = clamp((pointerAtDepth(0).x - tear.startX) / (PACK.W * PACK.SCALE * 0.8), 0, 1);
        tear.p = damp(tear.p, tear.target, 20, dt);
        if (tear.p > 0.96) Object.assign(tear, { held: false, target: 1 });
      } else {
        tear.p = clamp(tear.p + (tear.target ? 2.4 : -3) * dt, 0, 1);
      }
      pack.setTear(tear.p);
      rays.tear(tear.p, pack.openingWorld(origin));
      if (tear.p >= 1) setPhase('charge');
      else if (!tear.held && tear.p <= 0) setPhase('idle');
      break;
    case 'charge':
      // A beat of swelling before the pack gives way.
      pack.charge = Math.min(state.t / CHARGE, 1);
      if (state.t >= CHARGE) perf.mark('burst', burst);
      break;
    case 'burst':
      for (const c of cards) {
        if (!c.launched && state.t >= c.slot * LAUNCH_GAP) launch(c);
        if (!c.rowed && state.t > FAN_HOLD + c.slot * STAGGER) {
          c.rowed = true;
          c.base.set(slotPose(c.slot));
        }
      }
      if (state.t > FAN_HOLD + 0.7) setPhase('row');
      break;
    case 'row':
      if (live) hovered = cardUnderPointer(hovered);
      if (state.t > 1.2) prebuild();
      break;
    case 'exit':
      if (state.t > 0.6) {
        for (const c of cards) c.setVisible(false);
        newPack();
      }
      break;
  }

  const settled = state.phase === 'row' || state.phase === 'inspect';
  for (const c of cards) {
    if (!c.group.visible) continue;
    const isHover = c === hovered, isInspect = c === inspected;
    c.off.fill(0);
    if (isInspect) {
      c.off[3] = -aim.y * 0.3;
      c.off[4] = aim.x * 0.45;
    } else if (isHover) {
      pointerAtDepth(c.base[2] + HOVER_LIFT);
      c.off[2] = HOVER_LIFT;
      c.off[3] = -clamp((hitPoint.y - c.base[1]) / (CARD.H * 0.55), -1, 1) * 0.32;
      c.off[4] = clamp((hitPoint.x - c.base[0]) / (CARD.W * 0.55), -1, 1) * 0.42;
      c.off[6] = 0.1;
    } else if (settled) {
      c.off[3] = -aim.y * 0.06;
      c.off[4] = aim.x * 0.1;
    }
    watch(c, dt);
    c.crab.excited = isHover || (isInspect && state.t < 0.9);
    c.crab.face = isHover ? 'love' : !settled || (isInspect && state.t < 0.9) ? 'happy' : 'idle';
    c.update(time, dt);
  }

  if (showcase) {
    const { card } = showcase;
    showcase.t += dt;
    const fresh = showcase.t < 0.9 && !showcase.leaving;
    card.off.fill(0);
    if (!showcase.leaving) {
      card.off[3] = -aim.y * 0.3;
      card.off[4] = aim.x * 0.45;
    }
    watch(card, dt);
    card.crab.excited = fresh;
    card.crab.face = fresh ? 'happy' : 'idle';
    card.update(time, dt);
    if (showcase.leaving && card.group.position.y < -11) dropShowcase();
  }

  // While the strip is being pulled the pack leans less, so it does not swing into a glare.
  const lean = tear.held ? 0.3 : 1;
  pack.update(time, dt, packHover, clamp(aim.x * 4, -1, 1) * lean, clamp(aim.y * 3, -1, 1) * lean);
  const grounded = state.phase === 'enter' || state.phase === 'idle' || state.phase === 'tearing' || state.phase === 'charge';
  packShadow.material.opacity = damp(packShadow.material.opacity, grounded ? 0.55 : 0, 6, dt);
  packShadow.scale.setScalar(1 - Math.sin(time * 1.6) * 0.04);
  veil.material.opacity = damp(veil.material.opacity, state.phase === 'inspect' ? 0.9 : 0, 9, dt);
  veil.visible = veil.material.opacity > 0.01;

  shake = damp(shake, 0, 7, dt);
  camera.position.x = Math.sin(time * 71) * 0.07 * shake;
  camera.position.y = Math.cos(time * 83) * 0.06 * shake;

  rays.update(time, dt);
  confetti.update(dt);
  const want = showcase ? 'pointer' : tear.held ? 'grabbing' : packHover ? 'grab' : hovered || inspected ? 'pointer' : 'default';
  if (want !== cursor) canvas.style.cursor = cursor = want; // a style write every frame can cost a style pass
  camera.layers.set(showcase ? SOLO : 0);
  // While the dex covers the table, the canvas under it is not redrawn. The dex's 94% opaque,
  // blurred background would otherwise re-blur a changing full-screen layer every frame.
  if (dexPanel.hidden || showcase) renderer.render(scene, camera);
  perf.frame(now, state.phase, performance.now() - t0);
  if (!manual) requestAnimationFrame(frame);
}

if (manual) {
  let clock = 0, seq = 0;
  const timers = new Map(); // id -> [due, fn]
  window.setTimeout = (fn, ms = 0) => (timers.set(++seq, [clock + ms, fn]), seq);
  window.clearTimeout = (id) => timers.delete(id);
  const ages = new WeakMap(); // animation -> virtual ms it has run
  window.__tick = (ms) => {
    clock += ms;
    for (const [id, [due, fn]] of timers) if (due <= clock) timers.delete(id), fn();
    for (const a of document.getAnimations()) {
      const age = (ages.get(a) ?? -ms) + ms; // a new animation starts at 0
      ages.set(a, age);
      a.pause();
      a.currentTime = age;
    }
    frame(clock);
  };
  last = 0;
}

resize();
loadDex().then(() => {
  refreshDexCount();
  newPack();
  run();
  const sheet = query.get('sheet');
  if (sheet) exportSheet(sheet === 'all' ? ALL : SERIES.find((s) => s.id === sheet).defs, sheet);
});
