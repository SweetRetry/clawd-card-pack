// The crab. One blocky body, cheeks, eyes that track a gaze, and a costume per variant.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BODY_COLOR } from './parts.js';
import { ZODIAC, ZODIAC_FIT } from './zodiac.js';
import { SHENGXIAO, SHENGXIAO_FIT } from './shengxiao.js';
import { FESTIVAL, FESTIVAL_FIT } from './festival.js';

const box = (w, h, d, r = 0.06) => new RoundedBoxGeometry(w, h, d, 4, r);
const damp = THREE.MathUtils.damp;

const BODY = { w: 1.5, h: 0.95, d: 0.8 };
const FACE = { w: 1.36, h: 0.85 };
const LEGS = [-0.56, -0.3, 0.3, 0.56];
const COSTUMES = { ...ZODIAC, ...SHENGXIAO, ...FESTIVAL };

// Framing of each variant inside the card window: scale, the y of its visual centre, optional x shift.
export const VARIANTS = { classic: { scale: 0.7, centerY: -0.13 }, ...ZODIAC_FIT, ...SHENGXIAO_FIT, ...FESTIVAL_FIT };

// One material per distinct look, shared by every crab that asks for it.
const tints = new Map();
function tint(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!tints.has(key)) tints.set(key, new THREE.MeshPhysicalMaterial({ color, roughness: 0.5, ...opts }));
  return tints.get(key);
}

let shared;
function assets() {
  if (shared) return shared;
  const faces = faceTextures();
  const decal = (map) => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, toneMapped: false });
  shared = {
    // Body and the four legs never move apart, so they are one mesh: one draw call, not five.
    trunk: mergeGeometries([
      box(BODY.w, BODY.h, BODY.d, 0.1),
      ...LEGS.map((x) => box(0.17, 0.32, 0.3, 0.05).translate(x, -0.58, 0)),
    ]),
    arm: box(0.3, 0.3, 0.42, 0.07),
    face: new THREE.PlaneGeometry(FACE.w, FACE.h),
    skin: tint(BODY_COLOR, { roughness: 0.4, clearcoat: 0.7, clearcoatRoughness: 0.2 }),
    cheeks: decal(faces.cheeks),
    decal,
    faces,
  };
  return shared;
}

function faceTextures() {
  const W = 512, H = 320, CX = W / 2, EX = 124, EY = 122;
  const make = (draw) => {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.fillStyle = g.strokeStyle = '#1b1310';
    draw(g);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  const eyes = (g, fn) => [-1, 1].forEach((s) => fn(CX + s * EX, s));
  const smile = (g) => {
    g.beginPath();
    g.moveTo(CX - 26, 196);
    g.quadraticCurveTo(CX, 232, CX + 26, 196);
    g.closePath();
    g.fill();
  };
  const heart = (g, x, y, s) => {
    g.beginPath();
    g.moveTo(x, y + s * 0.9);
    g.bezierCurveTo(x - s * 1.5, y - s * 0.1, x - s * 0.7, y - s * 1.1, x, y - s * 0.35);
    g.bezierCurveTo(x + s * 0.7, y - s * 1.1, x + s * 1.5, y - s * 0.1, x, y + s * 0.9);
    g.fill();
  };
  return {
    cheeks: make((g) => {
      g.fillStyle = 'rgba(255,100,120,0.5)';
      for (const s of [-1, 1]) {
        g.beginPath();
        g.ellipse(CX + s * 200, 196, 30, 17, 0, 0, Math.PI * 2);
        g.fill();
      }
    }),
    idle: make((g) =>
      eyes(g, (x) => {
        g.beginPath();
        g.roundRect(x - 24, EY - 54, 48, 108, 18);
        g.fill();
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(x - 7, EY - 30, 9, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#1b1310';
      })
    ),
    blink: make((g) =>
      eyes(g, (x) => {
        g.beginPath();
        g.roundRect(x - 30, EY - 7, 60, 14, 7);
        g.fill();
      })
    ),
    happy: make((g) => {
      g.lineWidth = 16;
      eyes(g, (x) => {
        g.beginPath();
        g.moveTo(x - 30, EY + 18);
        g.quadraticCurveTo(x, EY - 44, x + 30, EY + 18);
        g.stroke();
      });
      smile(g);
    }),
    love: make((g) => {
      eyes(g, (x) => {
        g.fillStyle = '#ef2f55';
        heart(g, x, EY, 44);
        g.fillStyle = 'rgba(255,255,255,0.85)';
        g.beginPath();
        g.ellipse(x - 20, EY - 18, 9, 6, -0.6, 0, Math.PI * 2);
        g.fill();
      });
      g.fillStyle = '#1b1310';
      smile(g);
    }),
    squint: make((g) => {
      g.lineWidth = 16;
      eyes(g, (x, s) => {
        g.beginPath();
        g.moveTo(x - s * 28, EY - 34);
        g.lineTo(x + s * 22, EY);
        g.lineTo(x - s * 28, EY + 34);
        g.stroke();
      });
      smile(g);
    }),
  };
}

export function createCrab(variant = 'classic') {
  const A = assets();
  const group = new THREE.Group();
  const rig = new THREE.Group();
  group.add(rig);
  const add = (parent, geo, mat, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const sub = (x, y, z, rz = 0) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.z = rz;
    rig.add(g);
    return g;
  };

  add(rig, A.trunk, A.skin);
  const arms = [-1, 1].map((s) => {
    const pivot = sub(s * 0.72, -0.08, 0);
    add(pivot, A.arm, A.skin, s * 0.14);
    return pivot;
  });

  // Cheeks stay put. The eyes are a separate decal so they can slide toward the gaze.
  const front = BODY.d / 2;
  add(rig, A.face, A.cheeks, 0, 0, front + 0.004).renderOrder = 4;
  const eyeMat = A.decal(A.faces.idle);
  const eyes = add(rig, A.face, eyeMat, 0, 0, front + 0.006);
  eyes.renderOrder = 4;

  const moving = COSTUMES[variant]?.({ rig, arms, add, sub, box, tint, crab: createCrab }) ?? [];

  // Cards draw their window backdrop without depth testing, so the crab must draw after it.
  group.traverse((o) => o.isMesh && o.renderOrder === 0 && (o.renderOrder = 3));

  const phase = Math.random() * 10;
  let excite = 0;
  const crab = {
    group,
    variant,
    yaw: -0.3, // resting three-quarter turn, so the side and top faces read
    pitch: 0.14,
    excited: false,
    look: new THREE.Vector2(), // gaze, each axis in -1..1
    face: 'idle',
    update(t, dt) {
      excite = damp(excite, crab.excited ? 1 : 0, 9, dt);
      const hop = Math.abs(Math.sin(t * 8.5)) * 0.06 * excite;
      rig.position.y = Math.sin(t * 2.2 + phase) * 0.03 + hop;
      rig.rotation.y = crab.yaw * (1 - excite) + crab.look.x * 0.3 + Math.sin(t * 1.1 + phase) * 0.06;
      rig.rotation.x = crab.pitch - crab.look.y * 0.22;
      rig.rotation.z = Math.sin(t * 8.5) * 0.05 * excite;
      const lift = 0.05 + Math.sin(t * 3 + phase) * 0.08 + excite * (0.85 + Math.sin(t * 15) * 0.25);
      arms[0].rotation.z = -lift;
      arms[1].rotation.z = lift;
      eyes.position.x = crab.look.x * 0.11;
      eyes.position.y = crab.look.y * 0.075;
      const blink = crab.face === 'idle' && (t + phase) % 3.4 < 0.12;
      eyeMat.map = A.faces[blink ? 'blink' : crab.face];
      for (const move of moving) move(t, dt);
    },
  };
  return crab;
}
