// A card is four layers: the foil front, a stencil mask over the art window,
// a backdrop recessed behind the window, and a crab standing proud of the surface.
// The recess and the pop-out are what make the card read as 3D when it tilts.
import * as THREE from 'three';
import { createCrab, VARIANTS } from './crab.js';

export const CARD = { W: 2, H: 2.9, R: 0.13, WIN: { y: 0.45, half: 0.86, r: 0.1 }, RECESS: 0.4, CRAB_Z: 0.5 };
export const TIME = { value: 0 };

const pad = (i) => String(i + 1).padStart(2, '0');
const HOLO = { common: 0.3, rare: 0.65, ultra: 0.95 };
const ELEMENTS = {
  fire: { colA: '#ee4a2c', colB: '#7a1238', p1: '#3a0d2e', p2: '#c8402c' },
  earth: { colA: '#2f9a5e', colB: '#113d2e', p1: '#0d2a22', p2: '#3f9552' },
  air: { colA: '#5aa9f0', colB: '#4a2fb0', p1: '#1b1a5e', p2: '#5a8fe0' },
  water: { colA: '#1fa8bc', colB: '#122a78', p1: '#0a1f4e', p2: '#1f94ac' },
};
const SIGNS = [
  ['Aries', '白羊座', '♈', 'fire', 'common'], ['Taurus', '金牛座', '♉', 'earth', 'common'],
  ['Gemini', '双子座', '♊', 'air', 'rare'], ['Cancer', '巨蟹座', '♋', 'water', 'ultra'],
  ['Leo', '狮子座', '♌', 'fire', 'ultra'], ['Virgo', '处女座', '♍', 'earth', 'common'],
  ['Libra', '天秤座', '♎', 'air', 'common'], ['Scorpio', '天蝎座', '♏', 'water', 'rare'],
  ['Sagittarius', '射手座', '♐', 'fire', 'common'], ['Capricorn', '摩羯座', '♑', 'earth', 'rare'],
  ['Aquarius', '水瓶座', '♒', 'air', 'rare'], ['Pisces', '双鱼座', '♓', 'water', 'common'],
];
// \uFE0E asks for the text glyph, not the emoji.
const ZODIAC_DEFS = SIGNS.map(([name, zh, glyph, element, rarity], i) => ({
  name, tag: `${glyph}\uFE0E ${zh}`, no: pad(i), total: 12, rarity,
  variant: name.toLowerCase(), ink: '#ffffff', pattern: 5, holo: HOLO[rarity], ...ELEMENTS[element],
}));

const SHENGXIAO_LOOKS = [
  { colA: '#e8402f', colB: '#8f1420', ink: '#ffffff', p1: '#f8cf6a', p2: '#eaa63c' },
  { colA: '#ffe08a', colB: '#f2a93b', ink: '#4a1a08', p1: '#d2322c', p2: '#e9553f' },
  { colA: '#2fae8c', colB: '#0d5a4c', ink: '#ffffff', p1: '#f5e9c6', p2: '#e4d19c' },
];
const ANIMALS = [
  ['Rat', '鼠', 'common'], ['Ox', '牛', 'common'], ['Tiger', '虎', 'ultra'], ['Rabbit', '兔', 'rare'],
  ['Dragon', '龙', 'ultra'], ['Snake', '蛇', 'rare'], ['Horse', '马', 'rare'], ['Goat', '羊', 'common'],
  ['Monkey', '猴', 'rare'], ['Rooster', '鸡', 'common'], ['Dog', '狗', 'common'], ['Pig', '猪', 'common'],
];
const SHENGXIAO_DEFS = ANIMALS.map(([name, zh, rarity], i) => ({
  name, tag: `${zh}年`, no: pad(i), total: 12, rarity, variant: name.toLowerCase(), pattern: 0, holo: HOLO[rarity], ...SHENGXIAO_LOOKS[i % 3],
}));
const FESTIVAL_DEFS = [
  { name: 'Lunar', tag: '春节', rarity: 'ultra', variant: 'lunar', colA: '#f04a35', colB: '#9c1420', ink: '#ffffff', pattern: 4, p1: '#ffd66b', p2: '#e23b2e' },
  { name: 'Valentine', tag: '情人节', rarity: 'common', variant: 'valentine', colA: '#ffdbe6', colB: '#ffa9c4', ink: '#5a1030', pattern: 0, p1: '#ff86ad', p2: '#ffb9cf' },
  { name: 'Duanwu', tag: '端午', rarity: 'common', variant: 'duanwu', colA: '#d6f3e4', colB: '#a9dfc4', ink: '#0f3d2c', pattern: 2, p1: '#c9eedd', p2: '#3f9f7c' },
  { name: 'Mooncake', tag: '中秋', rarity: 'rare', variant: 'midautumn', colA: '#2f3fa0', colB: '#0e1440', ink: '#ffffff', pattern: 5, p1: '#0a0f3a', p2: '#3a4aa8' },
  { name: 'Spooky', tag: '万圣节', rarity: 'rare', variant: 'halloween', colA: '#8246dc', colB: '#2a0f4a', ink: '#ffffff', pattern: 5, p1: '#1a0a2e', p2: '#e0661a' },
  { name: 'Rudolph', tag: '圣诞', rarity: 'common', variant: 'reindeer', colA: '#ee4a40', colB: '#9c1c24', ink: '#ffffff', pattern: 1, p1: '#17573d', p2: '#2c8a5f' },
].map((def, i) => ({ no: pad(i), total: 6, holo: def.ink === '#ffffff' ? HOLO[def.rarity] : 0.1, ...def }));

// A pack belongs to one series and deals five cards from it.
export const SERIES = [
  { id: 'zodiac', label: '星座', title: '十二星座系列', pack: 'Zodiac pack', defs: ZODIAC_DEFS },
  { id: 'shengxiao', label: '生肖', title: '十二生肖系列', pack: 'Shengxiao pack', defs: SHENGXIAO_DEFS },
  { id: 'festival', label: '节日', title: '节日系列', pack: 'Festival pack', defs: FESTIVAL_DEFS },
];
for (const s of SERIES) {
  for (const def of s.defs) {
    def.series = s;
    def.id = `${s.id}:${def.variant}`;
  }
}
const RARITY = { common: '● Common', rare: '◆ Rare', ultra: '★ Ultra rare' };
const FONT = '"Inter", "SF Pro Display", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';

// Shaders here work in display space and skip three's colour conversion, so pass raw sRGB values.
const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

const VERT = /* glsl */ `
  uniform vec2 uOff;
  varying vec2 vP; varying vec3 vN; varying vec3 vVP; varying float vFront;
  void main() {
    vP = position.xy + uOff;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vVP = mv.xyz;
    vFront = normal.z;
    gl_Position = projectionMatrix * mv;
  }`;

const COMMON = /* glsl */ `
  varying vec2 vP; varying vec3 vN; varying vec3 vVP; varying float vFront;
  uniform float uHolo; uniform float uSweep;
  vec3 rainbow(float t) { return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67))); }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float sdRR(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
  // How the surface faces the viewer. Everything iridescent keys off this, so foil moves as the card tilts.
  vec2 tilt() { return normalize(vN).xy + 0.4 * normalize(-vVP).xy; }
  vec3 foil(vec3 base, vec2 p, vec2 tl, float holo) {
    float band = p.x * 0.6 + p.y * 0.35 + tl.x * 2.4 - tl.y * 1.7;
    vec3 rb = rainbow(band * 0.55);
    float streak = 0.5 + 0.5 * sin(band * 9.0 + p.y * 3.0);
    vec3 c = mix(base, base * 0.5 + rb * 0.8, holo * (0.55 + 0.25 * streak));
    float g = hash(floor(p * 240.0));
    float sparkle = step(0.985, g) * (0.5 + 0.5 * sin(g * 100.0 + tl.x * 50.0 + tl.y * 35.0));
    return c + sparkle * 0.4 * holo + (hash(p * 510.0) - 0.5) * 0.035;
  }
  vec3 sheen(vec3 c, vec2 p, vec2 tl) {
    float d = p.x * 0.8 + p.y * 0.45 - tl.x * 5.0 + tl.y * 3.2 - 0.3;
    // A one-off glint that crosses the card when it is picked up.
    float w = p.x * 0.8 + p.y * 0.45 - mix(-2.8, 2.8, uSweep);
    float glint = exp(-w * w * 12.0) * 0.6 * step(0.001, uSweep) * step(uSweep, 0.999);
    return c + exp(-d * d * 9.0) * 0.2 + exp(-(d - 0.55) * (d - 0.55) * 70.0) * 0.12 + glint;
  }`;

const FRONT_FRAG = /* glsl */ `
  ${COMMON}
  uniform sampler2D uText; uniform vec3 uColA; uniform vec3 uColB;
  uniform vec2 uSize; uniform vec3 uWin; uniform float uR;
  void main() {
    vec2 uv = vP / uSize + 0.5;
    vec2 tl = tilt();
    vec3 c = foil(mix(uColB, uColA, smoothstep(0.0, 1.0, uv.y)), vP, tl, uHolo);
    float win = sdRR(vP - vec2(0.0, uWin.x), vec2(uWin.y), uWin.z);
    c *= 1.0 - 0.25 * smoothstep(0.06, 0.0, win);
    vec4 t = texture2D(uText, uv);
    c = mix(c, t.rgb, t.a);
    c = sheen(c, vP, tl);
    float edge = sdRR(vP, uSize * 0.5, uR);
    c += 0.16 * smoothstep(-0.04, -0.015, edge);
    if (vFront < 0.5) c = mix(uColA, vec3(1.0), 0.5);
    gl_FragColor = vec4(c, 1.0);
  }`;

const BACK_FRAG = /* glsl */ `
  ${COMMON}
  uniform int uPattern; uniform vec3 uP1; uniform vec3 uP2; uniform float uTime; uniform vec3 uWin;
  void main() {
    vec2 q = vP - vec2(0.0, uWin.x);
    vec3 c;
    if (uPattern == 0) {
      float w = 0.5 + 0.5 * sin(length(q) * 15.0 - uTime * 0.7);
      c = mix(uP1, uP2, smoothstep(0.3, 0.7, w));
    } else if (uPattern == 1) {
      c = mix(uP1, uP2, q.y * 0.5 + 0.5);
      for (int l = 0; l < 2; l++) {
        float s = l == 0 ? 5.0 : 9.0;
        vec2 g = q * s + vec2(float(l) * 3.7, uTime * (l == 0 ? 0.5 : 0.28));
        vec2 cell = floor(g), f = fract(g) - 0.5;
        vec2 o = (vec2(hash(cell + 1.3), hash(cell + 7.1)) - 0.5) * 0.6;
        float r = l == 0 ? 0.12 : 0.09;
        c = mix(c, vec3(1.0), smoothstep(r, r * 0.5, length(f - o)) * step(0.45, hash(cell)) * (l == 0 ? 0.95 : 0.6));
      }
    } else if (uPattern == 2) {
      float n = vnoise(q * 2.3 + 4.0) + 0.5 * vnoise(q * 4.6 + 9.0);
      float line = smoothstep(0.07, 0.02, abs(fract(n * 6.0) - 0.5));
      c = mix(uP1, uP2, line * 0.85);
    } else if (uPattern == 5) {
      c = mix(uP1, uP2, smoothstep(0.2, 0.95, vnoise(q * 1.7 + uTime * 0.06) + q.y * 0.3));
      vec2 g = q * 7.0; vec2 cell = floor(g), f = fract(g) - 0.5;
      vec2 o = (vec2(hash(cell + 1.3), hash(cell + 7.1)) - 0.5) * 0.7;
      float tw = 0.5 + 0.5 * sin(uTime * 2.5 + hash(cell) * 6.283);
      c += smoothstep(0.075, 0.0, length(f - o)) * step(0.5, hash(cell + 3.0)) * (0.3 + 0.7 * tw);
    } else {
      float a = atan(q.y, q.x) + uTime * 0.18;
      float s = smoothstep(0.42, 0.58, abs(fract(a / 6.28318 * 12.0) - 0.5) * 2.0);
      c = mix(uP1, uP2, s);
      c = mix(c, vec3(1.0, 0.96, 0.75), exp(-dot(q, q) * 2.2) * 0.55);
    }
    vec2 sh = (q - vec2(0.0, -0.58)) / vec2(0.62, 0.14);
    c *= 1.0 - 0.38 * exp(-dot(sh, sh));
    vec2 tl = tilt();
    c = sheen(foil(c, vP, tl, uHolo * 0.45), vP, tl);
    gl_FragColor = vec4(c, 1.0);
  }`;

function textTexture(def) {
  const PW = 1024, PH = Math.round((1024 * CARD.H) / CARD.W);
  const c = document.createElement('canvas');
  c.width = PW;
  c.height = PH;
  const g = c.getContext('2d');
  const L = 92, R = PW - 92;
  const glyphs = (text) => text.match(/.\uFE0E?/gu);
  const spacedWidth = (text, sp) => glyphs(text).reduce((w, ch) => w + g.measureText(ch).width + sp, -sp);
  const spaced = (text, x, y, sp) => {
    for (const ch of glyphs(text)) {
      g.fillText(ch, x, y);
      x += g.measureText(ch).width + sp;
    }
  };
  g.fillStyle = def.ink;
  g.textBaseline = 'alphabetic';
  g.font = `600 36px ${FONT}`;
  const tw = spacedWidth(def.tag, 5);
  // Long names shrink until they clear the tag pill.
  let size = 108;
  do g.font = `700 ${size}px ${FONT}`;
  while (g.measureText(def.name).width > R - L - tw - 80 && (size -= 4) > 60);
  g.fillText(def.name, L, 1100);
  g.globalAlpha = 0.7;
  g.font = `500 36px ${FONT}`;
  g.fillText(`✦ ${def.series.title}`, L, 1182);
  g.globalAlpha = 1;
  g.font = `600 36px ${FONT}`;
  g.globalAlpha = 0.14;
  g.beginPath();
  g.roundRect(R - tw - 48, 1034, tw + 48, 64, 32);
  g.fill();
  g.globalAlpha = 0.9;
  spaced(def.tag, R - tw - 24, 1079, 5);

  g.globalAlpha = 0.22;
  g.fillRect(L, 1232, R - L, 2);
  g.globalAlpha = 0.72;
  g.font = `500 40px ${FONT}`;
  g.fillText(`No. ${def.no}/${def.total}`, L, 1345);
  g.textAlign = 'right';
  g.fillText(RARITY[def.rarity], R, 1345);

  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  return t;
}

let geo;
function geometries() {
  if (geo) return geo;
  const { W, H, R, WIN } = CARD;
  const front = new THREE.ExtrudeGeometry(roundedRect(W - 0.02, H - 0.02, R), {
    depth: 0.035, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2, curveSegments: 10,
  });
  front.computeBoundingBox();
  front.translate(0, 0, -front.boundingBox.max.z);

  const sc = document.createElement('canvas');
  sc.width = 256;
  sc.height = 352;
  const g = sc.getContext('2d');
  g.shadowColor = 'rgba(45,32,20,1)';
  g.shadowBlur = 26;
  g.shadowOffsetX = 1000;
  g.beginPath();
  g.roundRect(-1000 + 44, 44, 168, 264, 14);
  g.fill();
  const shadowMap = new THREE.CanvasTexture(sc);
  shadowMap.colorSpace = THREE.SRGBColorSpace;

  geo = {
    front,
    mask: new THREE.ShapeGeometry(roundedRect(WIN.half * 2, WIN.half * 2, WIN.r), 10),
    back: new THREE.PlaneGeometry(3, 3),
    shadow: new THREE.PlaneGeometry((W * 256) / 168, (H * 352) / 264),
    shadowMap,
  };
  return geo;
}

// Spring state is [x, y, z, rotX, rotY, rotZ, scale]. `base` is where the card belongs,
// `off` is the pointer-driven offset on top of it.
const STIFF = 130, DAMP = 16;

export function createCard(def) {
  const G = geometries();
  const { W, H, R, WIN } = CARD;
  const stencil = 1;
  const sweep = { value: 1 };
  const win = new THREE.Vector3(WIN.y, WIN.half, WIN.r);
  const group = new THREE.Group();

  const front = new THREE.Mesh(G.front, new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRONT_FRAG,
    uniforms: {
      uOff: { value: new THREE.Vector2() }, uHolo: { value: def.holo }, uSweep: sweep, uText: { value: textTexture(def) },
      uColA: { value: rgb(def.colA) }, uColB: { value: rgb(def.colB) },
      uSize: { value: new THREE.Vector2(W, H) }, uWin: { value: win }, uR: { value: R },
    },
  }));

  // Marks the window pixels that are actually visible, so the backdrop of a card
  // never paints over another card overlapping it.
  const mask = new THREE.Mesh(G.mask, new THREE.MeshBasicMaterial({
    colorWrite: false, depthWrite: false,
    stencilWrite: true, stencilRef: stencil, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp,
  }));
  mask.position.set(0, WIN.y, 0.01);
  mask.renderOrder = 1;

  const back = new THREE.Mesh(G.back, new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: BACK_FRAG,
    depthTest: false, depthWrite: false,
    stencilWrite: true, stencilRef: stencil, stencilFunc: THREE.EqualStencilFunc,
    uniforms: {
      uOff: { value: new THREE.Vector2(0, WIN.y) }, uHolo: { value: def.holo }, uSweep: sweep, uPattern: { value: def.pattern },
      uP1: { value: rgb(def.p1) }, uP2: { value: rgb(def.p2) }, uTime: TIME, uWin: { value: win },
    },
  }));
  back.position.set(0, WIN.y, -CARD.RECESS);
  back.renderOrder = 2;

  const crab = createCrab(def.variant);
  const fit = VARIANTS[def.variant];
  crab.group.scale.setScalar(fit.scale);
  crab.group.position.set(fit.x ?? 0, WIN.y - fit.centerY * fit.scale, CARD.CRAB_Z);
  group.add(front, mask, back, crab.group);

  const shadowMat = new THREE.MeshBasicMaterial({ map: G.shadowMap, transparent: true, depthWrite: false, toneMapped: false });
  const shadow = new THREE.Mesh(G.shadow, shadowMat);
  shadow.renderOrder = -1;

  const x = new Float32Array(7), v = new Float32Array(7), base = new Float32Array(7), off = new Float32Array(7);
  const card = {
    def, group, front, shadow, crab, base, off, slot: 0,
    place(state) {
      x.set(state);
      v.fill(0);
    },
    kick(vx, vy, vz) {
      v[0] += vx; v[1] += vy; v[2] += vz;
    },
    // Unique among the cards on screen. See the mask above.
    setStencil(ref) {
      mask.material.stencilRef = back.material.stencilRef = ref;
    },
    setVisible(on) {
      group.visible = shadow.visible = on;
    },
    spin(w) {
      v[4] += w;
    },
    flash() {
      sweep.value = 0;
    },
    // Frees what this card alone owns. Geometry shared with other cards simply re-uploads on its next use.
    dispose() {
      group.traverse((o) => o.geometry && o.geometry.dispose());
      front.material.uniforms.uText.value.dispose();
      for (const mesh of [front, mask, back, shadow]) mesh.material.dispose();
    },
    update(t, dt) {
      sweep.value = Math.min(sweep.value + dt / 0.9, 1);
      for (let i = 0; i < 7; i++) {
        v[i] += ((base[i] + off[i] - x[i]) * STIFF - v[i] * DAMP) * dt;
        x[i] += v[i] * dt;
      }
      group.position.set(x[0], x[1], x[2]);
      group.rotation.set(x[3], x[4], x[5]);
      group.scale.setScalar(Math.max(x[6], 0.001));
      shadow.position.set(x[0] + 0.05 * x[2], x[1] - 0.1 - 0.14 * x[2], 0);
      shadow.rotation.z = x[5];
      shadow.scale.setScalar(x[6] * (1 + 0.07 * x[2]));
      shadowMat.opacity = THREE.MathUtils.clamp(0.45 - 0.06 * x[2], 0.12, 0.45);
      crab.update(t, dt);
    },
  };
  front.userData.card = card;
  return card;
}
