// Festival costumes. See parts.js for the costume contract.
import * as THREE from 'three';
import { TOP, FRONT, BODY_COLOR, GOLD, sphere, cone, cyl, torus, heart, mirrored } from './parts.js';

export const FESTIVAL = {
  // Spring Festival: red cap, a swaying lantern, and a red envelope.
  lunar(ctx) {
    const red = ctx.tint(0xd9283a, { roughness: 0.4, clearcoat: 0.5 }), gold = ctx.tint(0xf2c14e, GOLD), wood = ctx.tint(0x7a4a22, { roughness: 0.6 });
    const cap = ctx.add(ctx.rig, new THREE.SphereGeometry(0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), red, 0, TOP - 0.01, 0);
    cap.scale.set(1, 0.6, 0.72);
    ctx.add(ctx.rig, sphere(0.08), gold, 0, TOP + 0.3, 0);
    ctx.add(ctx.rig, cyl(0.025, 1.05), wood, 1.08, 0.38, 0.22).rotation.z = -0.3;
    const lantern = ctx.sub(1.24, 0.86, 0.22);
    ctx.add(lantern, cyl(0.01, 0.16), gold, 0, -0.08, 0);
    ctx.add(lantern, sphere(0.25), red, 0, -0.36, 0).scale.y = 0.85;
    for (const y of [-0.16, -0.56]) ctx.add(lantern, cyl(0.12, 0.05), gold, 0, y, 0);
    ctx.add(lantern, cone(0.045, 0.22), red, 0, -0.7, 0).rotation.z = Math.PI;
    const envelope = ctx.sub(-1.08, 0, 0.3, 0.2);
    ctx.add(envelope, ctx.box(0.32, 0.44, 0.04, 0.02), red);
    ctx.add(envelope, ctx.box(0.13, 0.13, 0.05, 0.01), gold, 0, 0.04, 0);
    return [(t) => (lantern.rotation.z = Math.sin(t * 2.2) * 0.22)];
  },

  valentine(ctx) {
    const string = ctx.tint(0xffffff, { roughness: 0.8 });
    const balloons = [[0xef2f55, -0.42, 0.78, 0.36], [0xff8fb3, 0.4, 0.98, 0.3]].map(([color, x, y, size]) => {
      const g = ctx.sub(x, TOP, -0.05);
      ctx.add(g, cyl(0.008, y - 0.2), string, 0, (y - 0.2) / 2, 0);
      ctx.add(g, heart(size), ctx.tint(color, { roughness: 0.15, clearcoat: 1 }), 0, y, 0);
      return g;
    });
    ctx.add(ctx.rig, heart(0.16), ctx.tint(0xef2f55, { roughness: 0.15, clearcoat: 1 }), -1.02, 0.12, 0.3);
    return [(t) => balloons.forEach((g, i) => (g.rotation.z = Math.sin(t * 1.6 + i * 2) * 0.12 + (i ? -0.1 : 0.1)))];
  },

  // Dragon Boat Festival: a zongzi for a hat and a paddle.
  duanwu(ctx) {
    const leaf = ctx.tint(0x3f7f35, { roughness: 0.65 }), twine = ctx.tint(0xf3e6c0, { roughness: 0.8 }), wood = ctx.tint(0x7a4a22, { roughness: 0.6 });
    // A squat three-sided pyramid, tied twice. The ties are slices of the same pyramid, a hair larger.
    const R = 0.66, H = 0.58, at = (y) => R * (1 - y / H) + 0.012;
    const zongzi = ctx.sub(0, TOP - 0.01, 0);
    zongzi.rotation.y = Math.PI;
    ctx.add(zongzi, cone(R, H, 3), leaf, 0, H / 2, 0);
    for (const y of [0.13, 0.3]) ctx.add(zongzi, new THREE.CylinderGeometry(at(y + 0.022), at(y - 0.022), 0.044, 3), twine, 0, y, 0);
    const paddle = ctx.sub(1.1, 0.12, 0.25, -0.22);
    ctx.add(paddle, cyl(0.03, 1.05), wood);
    ctx.add(paddle, ctx.box(0.22, 0.4, 0.04, 0.02), wood, 0, -0.6, 0);
  },

  // Mid-Autumn: a full moon behind, jade-rabbit ears, and a mooncake.
  midautumn(ctx) {
    const moon = ctx.tint(0xfff0b0, { roughness: 0.9, emissive: 0xffe28a, emissiveIntensity: 0.7 });
    const fur = ctx.tint(0xffffff, { roughness: 0.8 }), cake = ctx.tint(0xc98a3a, { roughness: 0.5 }), crust = ctx.tint(0x9c6424, { roughness: 0.5 });
    ctx.add(ctx.rig, sphere(0.98), moon, 0.2, 0.36, -0.42).scale.z = 0.06;
    mirrored(ctx, (g) => {
      const ear = ctx.add(g, sphere(0.12), fur, 0.3, TOP + 0.28, 0);
      ear.scale.set(0.9, 2.7, 0.5);
      ear.rotation.z = -0.15;
    });
    // The mooncake faces the viewer: a scalloped rim and a pressed pattern on top.
    const mooncake = ctx.sub(1.12, 0.02, 0.3);
    ctx.add(mooncake, cyl(0.22, 0.1), cake).rotation.x = Math.PI / 2;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ctx.add(mooncake, sphere(0.065), cake, Math.cos(a) * 0.22, Math.sin(a) * 0.22, 0);
    }
    ctx.add(mooncake, torus(0.12, 0.02), crust, 0, 0, 0.05);
    ctx.add(mooncake, sphere(0.05), crust, 0, 0, 0.045).scale.z = 0.4;
  },

  halloween(ctx) {
    const cloth = ctx.tint(0x3b1f6e, { roughness: 0.7 }), band = ctx.tint(0xff7a1a, { roughness: 0.5 });
    const rind = ctx.tint(0xff7a1a, { roughness: 0.4, clearcoat: 0.4 }), stem = ctx.tint(0x3f9d57, { roughness: 0.7 });
    const glow = ctx.tint(0xffe066, { emissive: 0xffd23f, emissiveIntensity: 1 });
    const hat = ctx.sub(0.08, TOP - 0.01, 0, -0.12);
    ctx.add(hat, cyl(0.7, 0.05), cloth, 0, 0.025, 0).scale.z = 0.75;
    ctx.add(hat, cone(0.4, 0.9), cloth, 0, 0.48, 0).scale.z = 0.8;
    ctx.add(hat, cyl(0.37, 0.1), band, 0, 0.11, 0).scale.z = 0.8;
    const pumpkin = ctx.sub(1.16, -0.12, 0.26);
    for (let i = 0; i < 5; i++) {
      const lobe = ctx.add(pumpkin, sphere(0.22), rind);
      lobe.scale.set(0.6, 0.85, 1);
      lobe.rotation.y = (i * Math.PI) / 5;
    }
    ctx.add(pumpkin, cyl(0.04, 0.12), stem, 0, 0.22, 0);
    for (const s of [-1, 1]) ctx.add(pumpkin, cone(0.045, 0.07, 3), glow, s * 0.08, 0.03, 0.2);
    ctx.add(pumpkin, ctx.box(0.16, 0.035, 0.02, 0.008), glow, 0, -0.07, 0.21);
  },

  reindeer(ctx) {
    const antler = ctx.tint(0x7a4a22, { roughness: 0.7 }), hide = ctx.tint(BODY_COLOR, { roughness: 0.4 });
    const nose = ctx.tint(0xff2a3c, { roughness: 0.1, clearcoat: 1, emissive: 0xff2a3c, emissiveIntensity: 0.35 });
    const scarf = ctx.tint(0x1f8a52, { roughness: 0.8 }), bell = ctx.tint(0xf2c14e, GOLD);
    mirrored(ctx, (g) => {
      ctx.add(g, cyl(0.045, 0.52), antler, 0.4, TOP + 0.25, 0).rotation.z = -0.35;
      ctx.add(g, cyl(0.035, 0.26), antler, 0.6, TOP + 0.3, 0).rotation.z = -1.2;
      ctx.add(g, cyl(0.035, 0.22), antler, 0.37, TOP + 0.44, 0).rotation.z = 0.5;
      const ear = ctx.add(g, sphere(0.15), hide, 0.86, TOP - 0.04, 0);
      ear.scale.set(1.5, 0.7, 0.5);
      ear.rotation.z = -0.35;
    });
    ctx.add(ctx.rig, sphere(0.12), nose, 0, -0.1, FRONT + 0.07);
    ctx.add(ctx.rig, ctx.box(1.56, 0.17, 0.86, 0.06), scarf, 0, -0.4, 0);
    ctx.add(ctx.rig, ctx.box(0.2, 0.4, 0.06, 0.03), scarf, 0.45, -0.62, FRONT + 0.04).rotation.z = 0.1;
    ctx.add(ctx.rig, sphere(0.07), bell, 0, -0.52, FRONT + 0.06);
  },
};

export const FESTIVAL_FIT = {
  lunar: { scale: 0.54, centerY: 0.16, x: -0.08 },
  valentine: { scale: 0.56, centerY: 0.42 },
  duanwu: { scale: 0.56, centerY: 0.12, x: -0.1 },
  midautumn: { scale: 0.54, centerY: 0.2, x: -0.06 },
  halloween: { scale: 0.52, centerY: 0.3, x: -0.1 },
  reindeer: { scale: 0.6, centerY: 0.14 },
};
