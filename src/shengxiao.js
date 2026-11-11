// Chinese zodiac costumes. See parts.js for the costume contract.
import { TOP, FRONT, BODY_COLOR, GOLD, sphere, cone, cyl, torus, tube, horn, mirrored } from './parts.js';

export const SHENGXIAO = {
  rat(ctx) {
    const fur = ctx.tint(0x9aa0ab, { roughness: 0.7 }), pink = ctx.tint(0xffa6b8, { roughness: 0.6 }), white = ctx.tint(0xffffff);
    mirrored(ctx, (g) => {
      ctx.add(g, sphere(0.32), fur, 0.58, TOP + 0.2, 0).scale.z = 0.35;
      ctx.add(g, sphere(0.2), pink, 0.58, TOP + 0.2, 0.07).scale.z = 0.3;
    });
    ctx.add(ctx.rig, ctx.box(0.2, 0.15, 0.05, 0.02), white, 0, -0.28, FRONT + 0.02);
    ctx.add(ctx.rig, tube([[0.7, -0.35, -0.3], [1.15, -0.5, -0.3], [1.38, -0.2, -0.3], [1.22, 0.12, -0.3]], 0.035), pink);
  },

  ox(ctx) {
    const ivory = ctx.tint(0xf4ecd8, { roughness: 0.4, clearcoat: 0.5 }), hide = ctx.tint(BODY_COLOR, { roughness: 0.4 });
    const muzzle = ctx.tint(0xffe6d2, { roughness: 0.6 }), dark = ctx.tint(0x3b2418), gold = ctx.tint(0xf2c14e, GOLD);
    mirrored(ctx, (g) => {
      ctx.add(g, horn(0.14, 0.52, -1.1), ivory, 0.44, TOP - 0.03, 0).rotation.z = -1.2;
      const ear = ctx.add(g, sphere(0.17), hide, 0.9, TOP - 0.06, 0);
      ear.scale.set(1.5, 0.7, 0.5);
      ear.rotation.z = -0.3;
      ctx.add(g, sphere(0.035), dark, 0.12, -0.26, FRONT + 0.06);
    });
    ctx.add(ctx.rig, ctx.box(0.62, 0.3, 0.1, 0.05), muzzle, 0, -0.26, FRONT);
    ctx.add(ctx.rig, ctx.box(0.22, 0.22, 0.2, 0.05), gold, 0, -0.62, FRONT + 0.04);
  },

  tiger(ctx) {
    const hide = ctx.tint(BODY_COLOR, { roughness: 0.4 }), white = ctx.tint(0xffffff), stripe = ctx.tint(0x2a1a14, { roughness: 0.6 });
    mirrored(ctx, (g) => {
      ctx.add(g, sphere(0.2), hide, 0.5, TOP + 0.08, 0).scale.z = 0.5;
      ctx.add(g, sphere(0.11), white, 0.5, TOP + 0.08, 0.08).scale.z = 0.4;
      for (const y of [-0.06, 0.08]) ctx.add(g, ctx.box(0.2, 0.055, 0.02, 0.008), stripe, 0.64, y, FRONT + 0.004);
      for (const x of [0.28, 0.52]) ctx.add(g, ctx.box(0.09, 0.03, 0.82, 0.01), stripe, x, TOP, 0);
    });
    for (const [w, y] of [[0.26, 0.36], [0.18, 0.29], [0.26, 0.22]]) ctx.add(ctx.rig, ctx.box(w, 0.045, 0.02, 0.008), stripe, 0, y, FRONT + 0.004);
    ctx.add(ctx.rig, tube([[0.7, -0.3, -0.3], [1.15, -0.4, -0.3], [1.35, -0.05, -0.3], [1.25, 0.3, -0.3]], 0.06), hide);
    ctx.add(ctx.rig, sphere(0.085), stripe, 1.25, 0.32, -0.3);
  },

  rabbit(ctx) {
    const fur = ctx.tint(0xffffff, { roughness: 0.8 }), pink = ctx.tint(0xffa6b8, { roughness: 0.6 });
    const orange = ctx.tint(0xff8a1f, { roughness: 0.5 }), leaf = ctx.tint(0x3f9d57, { roughness: 0.7 });
    mirrored(ctx, (g) => {
      const ear = ctx.sub(0.34, TOP + 0.48, 0, -0.14);
      g.add(ear);
      ctx.add(ear, sphere(0.16), fur).scale.set(0.9, 3.2, 0.5);
      ctx.add(ear, sphere(0.09), pink, 0, 0, 0.06).scale.set(0.9, 3, 0.3);
    });
    ctx.add(ctx.rig, sphere(0.2), fur, 0.62, -0.3, -0.4);
    const carrot = ctx.sub(1.1, 0.02, 0.25, -0.5);
    ctx.add(carrot, cone(0.12, 0.52), orange).rotation.z = Math.PI;
    for (const a of [-0.4, 0, 0.4]) ctx.add(carrot, cone(0.05, 0.22), leaf, a * 0.2, 0.34, 0).rotation.z = -a;
  },

  dragon(ctx) {
    const scale = ctx.tint(0x2fae6c, { roughness: 0.35, clearcoat: 0.7 }), gold = ctx.tint(0xf2c14e, GOLD);
    const flame = ctx.tint(0xff7a1a, { roughness: 0.4, emissive: 0xff5a00, emissiveIntensity: 0.4 });
    const pearl = ctx.tint(0xfff3d0, { roughness: 0.05, clearcoat: 1, emissive: 0xffe9a8, emissiveIntensity: 0.35 });
    for (let i = 0; i < 5; i++) ctx.add(ctx.rig, cone(0.15, 0.36), scale, -0.5 + i * 0.25, TOP + 0.14, -0.2);
    mirrored(ctx, (g) => {
      ctx.add(g, cyl(0.065, 0.62), gold, 0.42, TOP + 0.28, 0.1).rotation.z = -0.38;
      ctx.add(g, cyl(0.05, 0.3), gold, 0.64, TOP + 0.38, 0.1).rotation.z = -1.2;
      ctx.add(g, cyl(0.05, 0.26), gold, 0.4, TOP + 0.52, 0.1).rotation.z = 0.6;
      ctx.add(g, tube([[0.26, -0.2, FRONT], [0.8, -0.34, FRONT + 0.15], [1.15, -0.1, FRONT + 0.1], [1.3, 0.25, FRONT]], 0.04), gold);
    });
    ctx.add(ctx.rig, ctx.box(0.52, 0.24, 0.16, 0.07), scale, 0, -0.22, FRONT + 0.03);
    ctx.add(ctx.rig, cone(0.12, 0.3), flame, 0, -0.6, FRONT - 0.06).rotation.z = Math.PI;
    ctx.add(ctx.rig, tube([[0.6, -0.3, -0.3], [1.15, -0.45, -0.3], [1.45, -0.1, -0.3], [1.3, 0.3, -0.3]], 0.1), scale);
    ctx.add(ctx.rig, cone(0.15, 0.36), flame, 1.24, 0.5, -0.3).rotation.z = 0.35;
    const orb = ctx.add(ctx.rig, sphere(0.18), pearl, -1.25, 0.85, 0.2);
    return [(t) => (orb.position.y = 0.85 + Math.sin(t * 2) * 0.08)];
  },

  snake(ctx) {
    const skin = ctx.tint(0x3fae4a, { roughness: 0.3, clearcoat: 0.8 }), eye = ctx.tint(0x1b1310), tongue = ctx.tint(0xe0304f);
    for (const [R, r, y] of [[0.44, 0.13, 0.1], [0.3, 0.12, 0.3]]) {
      const coil = ctx.add(ctx.rig, torus(R, r), skin, 0, TOP + y, 0);
      coil.rotation.x = Math.PI / 2;
      coil.scale.y = 0.75; // local y is depth after the rotation
    }
    const head = ctx.sub(0.2, TOP + 0.54, 0.1);
    ctx.add(head, sphere(0.2), skin).scale.set(1.2, 0.8, 1.1);
    for (const s of [-1, 1]) ctx.add(head, sphere(0.035), eye, s * 0.1, 0.05, 0.18);
    ctx.add(head, ctx.box(0.03, 0.02, 0.22, 0.008), tongue, 0, -0.04, 0.26);
    return [(t) => (head.rotation.y = Math.sin(t * 1.5) * 0.4)];
  },

  horse(ctx) {
    const mane = ctx.tint(0x4a2c14, { roughness: 0.8 }), hide = ctx.tint(BODY_COLOR, { roughness: 0.4 });
    const cream = ctx.tint(0xffe6d2, { roughness: 0.6 }), dark = ctx.tint(0x3b2418), strap = ctx.tint(0x7a4a22, { roughness: 0.6 }), white = ctx.tint(0xffffff);
    mirrored(ctx, (g) => {
      ctx.add(g, cone(0.13, 0.4), hide, 0.4, TOP + 0.17, 0.02).rotation.z = -0.12;
      ctx.add(g, sphere(0.035), dark, 0.11, -0.28, FRONT + 0.07);
    });
    // A forelock between the ears, then the mane falling down the right side.
    for (const [x, y, rz] of [[-0.13, 0.09, 0.5], [0.02, 0.14, 0.1], [0.17, 0.09, -0.4]]) {
      const lock = ctx.add(ctx.rig, sphere(0.15), mane, x, TOP + y, 0.12);
      lock.scale.set(0.8, 1.5, 0.8);
      lock.rotation.z = rz;
    }
    for (let i = 0; i < 5; i++) ctx.add(ctx.rig, sphere(0.2 - i * 0.015), mane, 0.62 + Math.min(i, 2) * 0.09, TOP + 0.08 - i * 0.2, -0.12).scale.set(0.8, 1.2, 0.9);
    // Muzzle, noseband, and a white star on the forehead.
    ctx.add(ctx.rig, ctx.box(0.6, 0.3, 0.1, 0.06), cream, 0, -0.28, FRONT);
    ctx.add(ctx.rig, ctx.box(1.5, 0.05, 0.04, 0.015), strap, 0, -0.1, FRONT - 0.005);
    ctx.add(ctx.rig, ctx.box(0.13, 0.13, 0.02, 0.01), white, 0, 0.31, FRONT + 0.003).rotation.z = Math.PI / 4;
    ctx.add(ctx.rig, horn(0.2, 1.0, 1.1), mane, 0.66, -0.25, -0.34).rotation.z = -2.2;
  },

  goat(ctx) {
    const wool = ctx.tint(0xffffff, { roughness: 1 }), keratin = ctx.tint(0x8a7a66, { roughness: 0.6 });
    for (const [x, y, r] of [[-0.34, 0.05, 0.24], [0, 0.14, 0.28], [0.34, 0.05, 0.24]]) ctx.add(ctx.rig, sphere(r), wool, x, TOP + y, 0);
    mirrored(ctx, (g) => {
      ctx.add(g, cone(0.08, 0.38), keratin, 0.3, TOP + 0.42, 0).rotation.z = -0.3;
      const ear = ctx.add(g, sphere(0.14), wool, 0.88, TOP - 0.14, 0);
      ear.scale.set(1.5, 0.6, 0.5);
      ear.rotation.z = -0.5;
    });
    ctx.add(ctx.rig, cone(0.13, 0.34), wool, 0, -0.62, FRONT - 0.08).rotation.z = Math.PI;
  },

  monkey(ctx) {
    const fur = ctx.tint(0x8a5a33, { roughness: 0.8 }), skin = ctx.tint(0xf2c9a0, { roughness: 0.6 }), banana = ctx.tint(0xffd83a, { roughness: 0.45 });
    mirrored(ctx, (g) => {
      ctx.add(g, sphere(0.27), fur, 0.82, 0.34, -0.02).scale.z = 0.4;
      ctx.add(g, sphere(0.16), skin, 0.84, 0.34, 0.05).scale.z = 0.35;
    });
    for (const [x, rz] of [[-0.15, 0.4], [0, 0], [0.15, -0.4]]) ctx.add(ctx.rig, cone(0.1, 0.32), fur, x, TOP + 0.12, 0).rotation.z = rz;
    ctx.add(ctx.rig, torus(0.36, 0.085, Math.PI * 0.62), banana, -1.16, -0.16, 0.28).rotation.z = 0.9;
    ctx.add(ctx.rig, tube([[0.7, -0.3, -0.3], [1.2, -0.3, -0.3], [1.42, 0.1, -0.3], [1.18, 0.38, -0.3], [1.02, 0.16, -0.3]], 0.055), fur);
  },

  rooster(ctx) {
    const red = ctx.tint(0xe0304f, { roughness: 0.4, clearcoat: 0.5 }), beak = ctx.tint(0xffc23a, { roughness: 0.4 });
    for (const [x, y, r] of [[-0.17, 0.06, 0.14], [0, 0.12, 0.18], [0.17, 0.06, 0.14]]) ctx.add(ctx.rig, sphere(r), red, x, TOP + y, 0).scale.z = 0.5;
    ctx.add(ctx.rig, cone(0.12, 0.28), beak, 0, -0.12, FRONT + 0.12).rotation.x = Math.PI / 2;
    ctx.add(ctx.rig, sphere(0.08), red, 0, -0.32, FRONT + 0.03).scale.y = 1.5;
    [0x1fb5a6, 0x3a6fe0, 0xe0304f, 0xffc23a].forEach((color, i) => {
      const a = 0.25 + i * 0.36;
      const feather = ctx.add(ctx.rig, sphere(0.22), ctx.tint(color, { roughness: 0.4 }), 0.72 + Math.sin(a) * 0.55, -0.05 + Math.cos(a) * 0.55, -0.3);
      feather.scale.set(0.35, 1.7, 0.25);
      feather.rotation.z = -a;
    });
  },

  dog(ctx) {
    const brown = ctx.tint(0x7a4a26, { roughness: 0.8 }), black = ctx.tint(0x1b1310, { roughness: 0.2, clearcoat: 1 });
    const red = ctx.tint(0xd9283a, { roughness: 0.5 }), gold = ctx.tint(0xf2c14e, GOLD), bone = ctx.tint(0xfff7e6, { roughness: 0.6 });
    mirrored(ctx, (g) => ctx.add(g, ctx.box(0.26, 0.58, 0.32, 0.1), brown, 0.82, 0.14, 0.04).rotation.z = -0.14);
    ctx.add(ctx.rig, sphere(0.07), black, 0, -0.06, FRONT + 0.04);
    ctx.add(ctx.rig, ctx.box(1.54, 0.1, 0.84, 0.04), red, 0, -0.44, 0);
    ctx.add(ctx.rig, sphere(0.07), gold, 0, -0.54, FRONT + 0.05);
    ctx.add(ctx.rig, cyl(0.04, 0.42), bone, 0, -0.26, FRONT + 0.1).rotation.z = Math.PI / 2;
    for (const s of [-1, 1]) for (const d of [-1, 1]) ctx.add(ctx.rig, sphere(0.065), bone, s * 0.22, -0.26 + d * 0.045, FRONT + 0.1);
    const tail = ctx.sub(0.6, -0.25, -0.38);
    ctx.add(tail, cone(0.09, 0.4), brown, 0, 0.2, 0);
    return [(t) => (tail.rotation.z = -0.7 + Math.sin(t * 13) * 0.4)];
  },

  pig(ctx) {
    const pink = ctx.tint(0xff9fb5, { roughness: 0.45, clearcoat: 0.4 }), deep = ctx.tint(0xd9607c, { roughness: 0.5 });
    const snout = ctx.add(ctx.rig, cyl(0.2, 0.12), pink, 0, -0.14, FRONT + 0.05);
    snout.rotation.x = Math.PI / 2;
    snout.scale.x = 1.25;
    for (const s of [-1, 1]) ctx.add(ctx.rig, sphere(0.04), deep, s * 0.09, -0.14, FRONT + 0.1).scale.y = 1.5;
    mirrored(ctx, (g) => {
      const ear = ctx.add(g, cone(0.17, 0.28), pink, 0.5, TOP + 0.09, 0.05);
      ear.rotation.z = -0.45;
      ear.scale.z = 0.5;
    });
    ctx.add(ctx.rig, torus(0.12, 0.035, Math.PI * 1.7), pink, 0.88, -0.2, -0.32);
  },
};

export const SHENGXIAO_FIT = {
  rat: { scale: 0.58, centerY: 0.1, x: -0.08 },
  ox: { scale: 0.62, centerY: 0.02 },
  tiger: { scale: 0.62, centerY: 0, x: -0.1 },
  rabbit: { scale: 0.54, centerY: 0.38 },
  dragon: { scale: 0.5, centerY: 0.16, x: -0.05 },
  snake: { scale: 0.6, centerY: 0.22 },
  horse: { scale: 0.58, centerY: 0.02, x: -0.1 },
  goat: { scale: 0.6, centerY: 0.02 },
  monkey: { scale: 0.52, centerY: 0.08 },
  rooster: { scale: 0.56, centerY: 0.02, x: -0.12 },
  dog: { scale: 0.62, centerY: -0.03 },
  pig: { scale: 0.66, centerY: -0.05 },
};
