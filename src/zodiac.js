// Zodiac costumes. Each builder dresses the plain crab with primitives and may
// return per-frame update functions for parts that move.
//
// ctx: { rig, arms, add(parent, geo, mat, x, y, z), sub(x, y, z, rotZ), box, tint(color, opts), crab(variant) }
// Crab-local reference points: body is 1.5 x 0.95 x 0.8, its top is y = TOP, its face is z = 0.4.
import * as THREE from 'three';
import { TOP, BODY_COLOR, GOLD, sphere, cone, cyl, torus, tube, horn, mirrored, pincers } from './parts.js';

export const ZODIAC = {
  aries(ctx) {
    const horn = ctx.tint(0xf0dfb8, { roughness: 0.55 }), wool = ctx.tint(0xffffff, { roughness: 1 });
    mirrored(ctx, (g) => {
      ctx.add(g, torus(0.25, 0.09, Math.PI * 1.6), horn, 0.8, TOP - 0.1, 0).rotation.z = -1;
    });
    for (const [x, y, r] of [[-0.32, 0.06, 0.24], [0, 0.16, 0.29], [0.32, 0.06, 0.24]]) ctx.add(ctx.rig, sphere(r), wool, x, TOP + y, 0);
  },

  taurus(ctx) {
    const ivory = ctx.tint(0xf4ecd8, { roughness: 0.4, clearcoat: 0.5 }), hide = ctx.tint(BODY_COLOR, { roughness: 0.4 });
    const gold = ctx.tint(0xf2c14e, GOLD);
    mirrored(ctx, (g) => {
      ctx.add(g, horn(0.16, 0.66, -1.3), ivory, 0.4, TOP - 0.04, 0).rotation.z = -1.25;
      const ear = ctx.add(g, sphere(0.16), hide, 0.9, TOP - 0.14, 0);
      ear.scale.set(1.5, 0.65, 0.5);
      ear.rotation.z = -0.35;
    });
    ctx.add(ctx.rig, torus(0.13, 0.032), gold, 0, -0.24, 0.43);
  },

  gemini(ctx) {
    const twin = ctx.crab('classic');
    twin.group.scale.setScalar(0.46);
    twin.group.position.set(0.28, TOP + 0.34, 0);
    twin.yaw = 0.35;
    ctx.rig.add(twin.group);
    return [(t, dt) => twin.update(t + 1.7, dt)];
  },

  cancer(ctx) {
    const shell = ctx.tint(0xc4361c, { roughness: 0.35, clearcoat: 0.8 });
    pincers(ctx, shell, 1.25);
    for (const x of [-0.42, 0, 0.42]) ctx.add(ctx.rig, sphere(0.13), shell, x, TOP, -0.05).scale.y = 0.6;
  },

  leo(ctx) {
    const dark = ctx.tint(0x9c4f12, { roughness: 0.75 }), light = ctx.tint(0xd08224, { roughness: 0.75 }), hide = ctx.tint(BODY_COLOR, { roughness: 0.4 });
    // Two rings of locks radiating from behind the face.
    for (const [rx, ry, len, mat, z, shift] of [[0.86, 0.6, 0.66, dark, -0.22, 0], [0.8, 0.54, 0.5, light, -0.08, 0.5]]) {
      for (let i = 0; i < 16; i++) {
        const a = ((i + shift) / 16) * Math.PI * 2;
        ctx.add(ctx.rig, cone(0.25, len, 10), mat, Math.cos(a) * rx, Math.sin(a) * ry, z).rotation.z = a - Math.PI / 2;
      }
    }
    for (const s of [-1, 1]) ctx.add(ctx.rig, sphere(0.14), hide, s * 0.5, TOP + 0.03, 0.14);
  },

  virgo(ctx) {
    const leaf = ctx.tint(0x3f9d57, { roughness: 0.7 }), heart = ctx.tint(0xffd23f, { roughness: 0.6 });
    const petals = [ctx.tint(0xff8fb3, { roughness: 0.6 }), ctx.tint(0xffffff, { roughness: 0.6 })];
    const wreath = ctx.add(ctx.rig, torus(0.52, 0.05), leaf, 0, TOP + 0.03, 0);
    wreath.rotation.x = Math.PI / 2;
    wreath.scale.y = 0.68; // local y is depth after the rotation
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.2;
      const flower = ctx.sub(Math.sin(a) * 0.52, TOP + 0.08, Math.cos(a) * 0.35);
      ctx.add(flower, sphere(0.05), heart, 0, 0.03, 0);
      for (let k = 0; k < 5; k++) {
        const b = (k / 5) * Math.PI * 2;
        ctx.add(flower, sphere(0.058), petals[i % 2], Math.cos(b) * 0.08, 0, Math.sin(b) * 0.08);
      }
    }
  },

  libra(ctx) {
    const gold = ctx.tint(0xf2c14e, { metalness: 1, roughness: 0.25, envMapIntensity: 2, side: THREE.DoubleSide });
    ctx.add(ctx.rig, cyl(0.035, 0.5), gold, 0, TOP + 0.25, 0);
    const beam = ctx.sub(0, TOP + 0.5, 0);
    ctx.add(beam, cyl(0.03, 1.34), gold).rotation.z = Math.PI / 2;
    ctx.add(beam, sphere(0.07), gold);
    const pans = [-1, 1].map((s) => {
      const pan = new THREE.Group();
      pan.position.x = s * 0.64;
      beam.add(pan);
      ctx.add(pan, cyl(0.012, 0.3), gold, 0, -0.15, 0);
      ctx.add(pan, new THREE.SphereGeometry(0.21, 24, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), gold, 0, -0.26, 0).scale.y = 0.5;
      return pan;
    });
    return [(t) => {
      beam.rotation.z = Math.sin(t * 1.4) * 0.17;
      for (const pan of pans) pan.rotation.z = -beam.rotation.z;
    }];
  },

  scorpio(ctx) {
    const shell = ctx.tint(0x5c1f73, { roughness: 0.3, clearcoat: 0.7 }), sting = ctx.tint(0xe0304f, { roughness: 0.3, clearcoat: 0.7 });
    // Overlapping segments arc up from the back and over the head.
    const at = (th) => [0.45 + Math.cos(th) * 0.5, TOP + 0.36 + Math.sin(th) * 0.5, -0.1];
    for (let i = 0; i < 8; i++) ctx.add(ctx.rig, sphere(0.21 - i * 0.012), shell, ...at(-1.4 + (i / 7) * 4.3));
    ctx.add(ctx.rig, cone(0.1, 0.32), sting, ...at(3.25)).rotation.z = Math.PI + 0.25;
    pincers(ctx, shell, 0.95);
  },

  sagittarius(ctx) {
    const green = ctx.tint(0x2f8f4e, { roughness: 0.7 }), wood = ctx.tint(0x7a4a22, { roughness: 0.6 });
    const red = ctx.tint(0xe0304f, { roughness: 0.5 }), steel = ctx.tint(0xdfe3ea, { metalness: 0.9, roughness: 0.25 });
    const hat = ctx.sub(-0.12, TOP - 0.01, 0, 0.18);
    ctx.add(hat, cyl(0.52, 0.05), green, 0, 0.025, 0).scale.z = 0.75;
    ctx.add(hat, cone(0.42, 0.52), green, 0, 0.3, 0).scale.z = 0.75;
    const feather = ctx.add(hat, sphere(0.1), red, 0.34, 0.36, 0);
    feather.scale.set(0.4, 2.3, 0.3);
    feather.rotation.z = -0.5;
    const bow = ctx.sub(1.1, -0.02, 0.3, 0.12);
    ctx.add(bow, torus(0.5, 0.036, Math.PI), wood).rotation.z = -Math.PI / 2;
    ctx.add(bow, cyl(0.01, 1), steel);
    ctx.add(bow, cyl(0.018, 0.9), wood, 0.2, 0, 0).rotation.z = Math.PI / 2;
    ctx.add(bow, cone(0.055, 0.15), steel, 0.7, 0, 0).rotation.z = -Math.PI / 2;
    ctx.add(bow, ctx.box(0.14, 0.1, 0.02, 0.008), red, -0.2, 0, 0);
  },

  capricorn(ctx) {
    const keratin = ctx.tint(0x5f4a3c, { roughness: 0.55 }), fin = ctx.tint(0x1fb5a6, { roughness: 0.3, clearcoat: 0.8 });
    mirrored(ctx, (g) => {
      ctx.add(g, horn(0.14, 0.95, 1.5), keratin, 0.3, TOP - 0.04, -0.08).rotation.z = 0.12;
    });
    ctx.add(ctx.rig, sphere(0.34), fin, -1.0, -0.36, -0.2).scale.set(1.5, 0.7, 0.6);
    for (const d of [-1, 1]) {
      const lobe = ctx.add(ctx.rig, sphere(0.28), fin, -1.56, -0.36 + d * 0.2, -0.2);
      lobe.scale.set(1.3, 0.5, 0.3);
      lobe.rotation.z = -d * 0.65;
    }
  },

  aquarius(ctx) {
    const glaze = ctx.tint(0x2f6fd0, { roughness: 0.2, clearcoat: 1, side: THREE.DoubleSide }), gold = ctx.tint(0xf2c14e, GOLD);
    const water = ctx.tint(0x8fdcff, { roughness: 0.05, transparent: true, opacity: 0.78 });
    // An amphora on its side, pouring to the right.
    const profile = [[0, 0], [0.15, 0], [0.31, 0.2], [0.33, 0.4], [0.2, 0.62], [0.11, 0.72], [0.11, 0.84], [0.19, 0.9]];
    const jug = ctx.sub(0.12, TOP + 0.02, 0, -1.0);
    ctx.add(jug, new THREE.LatheGeometry(profile.map((p) => new THREE.Vector2(...p)), 28), glaze);
    ctx.add(jug, torus(0.325, 0.025), gold, 0, 0.36, 0).rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) ctx.add(jug, torus(0.11, 0.028, Math.PI), glaze, s * 0.2, 0.68, 0).rotation.z = -s * Math.PI / 2;
    const stream = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0.86, 0.96, 0), new THREE.Vector3(1.3, 0.98, 0), new THREE.Vector3(1.34, -0.45, 0));
    ctx.add(ctx.rig, new THREE.TubeGeometry(stream, 24, 0.075, 10), water);
    for (const [x, y, r] of [[1.38, -0.62, 0.07], [1.24, -0.72, 0.05], [1.46, -0.78, 0.045]]) ctx.add(ctx.rig, sphere(r), water, x, y, 0);
  },

  pisces(ctx) {
    const eye = ctx.tint(0x1b1310, { roughness: 0.3 });
    const fish = [0xff7fb0, 0x5aa0ff].map((color) => {
      const skin = ctx.tint(color, { roughness: 0.25, clearcoat: 0.9 });
      const g = ctx.sub(0, 0, 0);
      ctx.add(g, sphere(0.24), skin).scale.set(1.5, 0.9, 0.6);
      const tail = ctx.add(g, cone(0.2, 0.3), skin, -0.45, 0, 0);
      tail.rotation.z = -Math.PI / 2;
      tail.scale.z = 0.4;
      ctx.add(g, sphere(0.04), eye, 0.2, 0.05, 0.13);
      return g;
    });
    // The two chase each other around the crab, in a ring that stays in front of it.
    return [(t) => {
      fish.forEach((g, k) => {
        const a = t * 1.1 + k * Math.PI;
        g.position.set(Math.cos(a) * 1.3, Math.sin(a) * 0.78 - 0.05, 0.42);
        g.rotation.z = Math.atan2(Math.cos(a) * 0.78, -Math.sin(a) * 1.3);
      });
    }];
  },
};

// Framing inside the card window. See VARIANTS in crab.js.
export const ZODIAC_FIT = {
  aries: { scale: 0.64, centerY: 0.03 },
  taurus: { scale: 0.6, centerY: 0.1 },
  gemini: { scale: 0.6, centerY: 0.2 },
  cancer: { scale: 0.5, centerY: -0.08 },
  leo: { scale: 0.5, centerY: -0.04 },
  virgo: { scale: 0.68, centerY: -0.03 },
  libra: { scale: 0.58, centerY: 0.2 },
  scorpio: { scale: 0.5, centerY: 0.28 },
  sagittarius: { scale: 0.56, centerY: 0.12, x: -0.16 },
  capricorn: { scale: 0.54, centerY: 0.18, x: 0.16 },
  aquarius: { scale: 0.54, centerY: 0.2, x: -0.14 },
  pisces: { scale: 0.5, centerY: -0.08 },
};
