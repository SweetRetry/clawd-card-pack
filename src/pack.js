// The foil pouch. Two pillow shells split at the tear line into a body and a strip,
// so the strip can peel off left to right and fly away.
import * as THREE from 'three';
import { createCrab } from './crab.js';

export const PACK = { W: 2.3, H: 3.3, BULGE: 0.24, TEAR: 0.865, SCALE: 1.25 };
const TEAR_Y = (PACK.TEAR - 0.5) * PACK.H;
const FONT = '"Inter", "SF Pro Display", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
const COLORWAYS = [
  { name: 'COBALT', color: '#2a36e0', fg: '#ffffff' },
  { name: 'INK', color: '#262421', fg: '#f4efe6' },
  { name: 'BERRY', color: '#dc2a86', fg: '#ffffff' },
  { name: 'FOREST', color: '#16634b', fg: '#f4efe6' },
];
const damp = THREE.MathUtils.damp;
const smooth = (a, b, x) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

function pouchPoint(u, v) {
  const sides = Math.pow(Math.sin(Math.PI * u), 0.5);
  const ends = smooth(0.07, 0.24, v) * (1 - smooth(0.76, 0.93, v));
  return [(u - 0.5) * PACK.W, (v - 0.5) * PACK.H, PACK.BULGE * sides * ends];
}

function pouchGeo(v0, v1, segV, sign) {
  const g = new THREE.PlaneGeometry(1, 1, 44, segV);
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const u = uv.getX(i), v = v0 + uv.getY(i) * (v1 - v0);
    const [x, y, z] = pouchPoint(u, v);
    pos.setXYZ(i, x, y, z * sign);
    uv.setXY(i, u, v);
  }
  g.computeVertexNormals();
  g.userData.rest = pos.array.slice();
  return g;
}

function artTexture(cw, label) {
  const PW = 1024, PH = Math.round((1024 * PACK.H) / PACK.W);
  const c = document.createElement('canvas');
  c.width = PW;
  c.height = PH;
  const g = c.getContext('2d');
  g.fillStyle = cw.color;
  g.fillRect(0, 0, PW, PH);
  if (label) {
    const spaced = (text, x, y, sp, right) => {
      const w = [...text].reduce((s, ch) => s + g.measureText(ch).width + sp, -sp);
      if (right) x -= w;
      for (const ch of text) {
        g.fillText(ch, x, y);
        x += g.measureText(ch).width + sp;
      }
    };
    g.fillStyle = cw.fg;
    g.globalAlpha = 0.8;
    g.font = `600 26px ${FONT}`;
    spaced('TEAR HERE  →', 96, 178, 5);
    spaced(cw.name, PW - 96, 372, 6, true);
    g.globalAlpha = 0.3;
    g.setLineDash([10, 10]);
    g.strokeStyle = cw.fg;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(40, (1 - PACK.TEAR) * PH);
    g.lineTo(PW - 40, (1 - PACK.TEAR) * PH);
    g.stroke();
    g.globalAlpha = 1;
    g.font = `800 150px ${FONT}`;
    g.fillText('clawd', 88, 410);
    g.globalAlpha = 0.85;
    g.font = `500 40px ${FONT}`;
    g.fillText(label, 96, PH - 130);
    g.textAlign = 'right';
    g.fillText('5 cards', PW - 96, PH - 130);
  }
  // Pinked edges. The material alpha-tests against this.
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'destination-out';
  const teeth = 30, tw = PW / teeth, amp = 22;
  for (const y of [0, PH]) {
    const dir = y === 0 ? 1 : -1;
    g.beginPath();
    for (let i = 0; i <= teeth; i++) {
      g.moveTo(i * tw - tw / 2, y);
      g.lineTo(i * tw, y + dir * amp);
      g.lineTo(i * tw + tw / 2, y);
    }
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function bumpTexture() {
  const PW = 512, PH = 736;
  const c = document.createElement('canvas');
  c.width = PW;
  c.height = PH;
  const g = c.getContext('2d');
  g.fillStyle = '#808080';
  g.fillRect(0, 0, PW, PH);
  const band = Math.round(PH * 0.075);
  for (const y of [0, PH - band]) {
    for (let x = 0; x < PW; x += 10) {
      g.fillStyle = '#d0d0d0';
      g.fillRect(x, y, 5, band);
      g.fillStyle = '#303030';
      g.fillRect(x + 5, y, 5, band);
    }
  }
  return new THREE.CanvasTexture(c);
}

export function createPack() {
  const group = new THREE.Group();
  const bump = bumpTexture();
  const foil = (extra) => new THREE.MeshPhysicalMaterial({
    bumpMap: bump, bumpScale: 2.5, roughness: 0.34, metalness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.25,
    alphaTest: 0.5, side: THREE.DoubleSide, ...extra,
  });
  const frontMat = foil(), backMat = foil({ roughness: 0.6 });
  const textures = new Map();
  const art = (i, label) => {
    const key = i + label;
    if (!textures.has(key)) textures.set(key, artTexture(COLORWAYS[i], label));
    return textures.get(key);
  };

  const body = new THREE.Group(), strip = new THREE.Group();
  const bodyGeos = [], stripGeos = [];
  for (const sign of [1, -1]) {
    const mat = sign > 0 ? frontMat : backMat;
    const bg = pouchGeo(0, PACK.TEAR, 50, sign);
    bg.userData.sign = sign;
    bodyGeos.push(bg);
    body.add(new THREE.Mesh(bg, mat));
    const sg = pouchGeo(PACK.TEAR, 1, 8, sign);
    stripGeos.push(sg);
    strip.add(new THREE.Mesh(sg, mat));
  }
  // Card tops that rise out of the mouth as it opens. Stand-ins: the real cards take over at the burst.
  const peek = new THREE.Group();
  const peekMats = [-1, 0, 1].map((i) => {
    const sliver = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.6), new THREE.MeshBasicMaterial({ toneMapped: false }));
    sliver.position.set(i * 0.07, 0, i * 0.025);
    sliver.rotation.z = i * 0.05;
    peek.add(sliver);
    return sliver.material;
  });
  const crab = createCrab('classic');
  crab.group.scale.set(0.74, 0.74, 0.42);
  crab.group.position.set(0, -0.2, PACK.BULGE + 0.1);
  crab.yaw = -0.12;
  crab.pitch = 0.08;
  group.add(body, strip, peek, crab.group);
  group.traverse((o) => o.isMesh && o.renderOrder === 0 && (o.renderOrder = 3));

  // The tear front sweeps left to right. Behind it the strip leaves as a ribbon that bends
  // up and toward the viewer and rolls into a loose curl, the mouth of the pouch parts,
  // and the cards inside rise.
  const CURL = 0.4, LEAN = 0.6, MOUTH = 0.17;
  function peel(p) {
    const front = (p * 1.1 - 0.5) * PACK.W;
    for (const g of stripGeos) {
      const pos = g.attributes.position, rest = g.userData.rest;
      for (let i = 0; i < pos.count; i++) {
        const x = rest[i * 3], y = rest[i * 3 + 1], z = rest[i * 3 + 2];
        const s = front - x; // arc length behind the tear front
        if (s <= 0) {
          pos.setXYZ(i, x, y, z);
          continue;
        }
        const k = smooth(0, 0.35, s), lean = LEAN * k;
        const th = s / CURL, R = CURL * (1 + th * 0.1);
        const out = (1 - Math.cos(th)) * R, dy = y - TEAR_Y;
        pos.setXYZ(
          i,
          front - Math.sin(th) * R,
          TEAR_Y + dy * Math.cos(lean) + out * Math.sin(lean),
          z * (1 - k) + out * Math.cos(lean) - dy * Math.sin(lean)
        );
      }
      pos.needsUpdate = true;
      g.computeVertexNormals();
    }
    for (const g of bodyGeos) {
      const pos = g.attributes.position, rest = g.userData.rest, uv = g.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        const open = MOUTH * smooth(0, 0.6, front - rest[i * 3]) * Math.sin(Math.PI * uv.getX(i)) * smooth(0.55, PACK.TEAR, uv.getY(i));
        pos.setZ(i, rest[i * 3 + 2] + g.userData.sign * open);
      }
      pos.needsUpdate = true;
      g.computeVertexNormals();
    }
    peek.visible = p > 0;
    peek.position.y = TEAR_Y - 0.95 + 0.42 * smooth(0.15, 1, p);
  }

  let y = 0, vy = 0, falling = false, tear = 0, scale = PACK.SCALE, colorway = -1;
  const stripVel = new THREE.Vector3();
  let stripFree = false;

  const pack = {
    group, crab,
    charge: 0, // 0..1 swell just before the burst
    home: 0, // resting height; main.js raises it on phones
    reset(scene, label) {
      colorway = (colorway + 1) % COLORWAYS.length;
      frontMat.map = art(colorway, label);
      backMat.map = art(colorway, '');
      frontMat.needsUpdate = backMat.needsUpdate = true;
      stripFree = falling = false;
      pack.charge = 0;
      group.add(strip);
      strip.position.set(0, 0, 0);
      strip.rotation.set(0, 0, 0);
      strip.scale.setScalar(1);
      strip.visible = true;
      pack.setTear(0);
      group.rotation.set(0, 0, 0);
      group.visible = true;
      y = pack.home + 9;
      vy = 0;
      scene.add(group);
    },
    // Colours of the dealt cards, shown as slivers inside the mouth.
    setPeek(colors) {
      peekMats.forEach((m, i) => m.color.set(colors[i % colors.length]));
    },
    setTear(p) {
      tear = p;
      peel(p);
    },
    openingWorld(target) {
      return group.localToWorld(target.set(0, TEAR_Y, 0.1));
    },
    // The strip leaves the pack, and the empty pouch drops away.
    release(scene) {
      scene.attach(strip);
      stripFree = true;
      stripVel.set(3.5, 7, 2.5);
      falling = true;
      vy = 1.5;
    },
    update(t, dt, hover, px, py) {
      if (stripFree && strip.visible) {
        stripVel.y -= 26 * dt;
        strip.position.addScaledVector(stripVel, dt);
        strip.rotation.z -= 5 * dt;
        strip.rotation.x += 3 * dt;
        if (strip.position.y < -9) strip.visible = false;
      }
      if (falling) {
        vy -= 50 * dt;
        group.position.y += vy * dt;
        group.rotation.z += 0.9 * dt;
        if (group.position.y < -12) group.visible = false;
      } else {
        vy += ((pack.home - y) * 90 - vy * 13) * dt;
        y += vy * dt;
        const busy = tear > 0 && tear < 1 ? 1 : 0;
        group.position.y = y + Math.sin(t * 1.6) * 0.06;
        group.rotation.x = damp(group.rotation.x, hover ? -py * 0.3 : 0, 8, dt);
        group.rotation.y = damp(group.rotation.y, hover ? px * 0.5 : Math.sin(t * 0.8) * 0.1, 8, dt);
        group.rotation.z = Math.sin(t * 42) * (0.014 * busy + 0.035 * pack.charge);
        scale = damp(scale, PACK.SCALE * (hover || busy ? 1.05 : 1) * (1 + 0.09 * pack.charge), 14, dt);
        group.scale.setScalar(scale);
      }
      crab.face = tear > 0 ? 'squint' : hover ? 'happy' : 'idle';
      crab.excited = hover || tear > 0;
      crab.look.set(damp(crab.look.x, px, 8, dt), damp(crab.look.y, py, 8, dt));
      crab.update(t, dt);
    },
  };
  return pack;
}
