// Shared building blocks for costume files.
//
// A costume is a function (ctx) => optional array of per-frame updaters (t, dt).
// ctx: { rig, arms, add(parent, geo, mat, x, y, z), sub(x, y, z, rotZ), box, tint(color, opts), crab(variant) }
// Crab-local reference points: the body is 1.5 x 0.95 x 0.8, its top is y = TOP, its face is z = FRONT.
import * as THREE from 'three';

export const TOP = 0.475, FRONT = 0.4;
export const BODY_COLOR = 0xd9572b;
export const GOLD = { metalness: 1, roughness: 0.25, envMapIntensity: 2 };

export const sphere = (r) => new THREE.SphereGeometry(r, 20, 14);
export const cone = (r, h, sides = 20) => new THREE.ConeGeometry(r, h, sides);
export const cyl = (r, h) => new THREE.CylinderGeometry(r, r, h, 16);
export const torus = (R, r, arc = Math.PI * 2) => new THREE.TorusGeometry(R, r, 12, 40, arc);
export const tube = (points, r) =>
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), 28, r, 8);

export function heart(size) {
  const s = new THREE.Shape();
  s.moveTo(0, -0.5);
  s.bezierCurveTo(-0.95, 0.1, -0.45, 0.8, 0, 0.3);
  s.bezierCurveTo(0.45, 0.8, 0.95, 0.1, 0, -0.5);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 5, curveSegments: 18 });
  g.center();
  g.scale(size, size, size);
  return g;
}

// A tapered horn that grows up from the origin and curls toward +x (negative `bend` curls toward -x).
export function horn(r, h, bend) {
  const g = new THREE.ConeGeometry(r, h, 16, 14);
  const pos = g.attributes.position, R = h / bend;
  for (let i = 0; i < pos.count; i++) {
    const a = ((pos.getY(i) + h / 2) / h) * bend, x = pos.getX(i);
    pos.setXY(i, R * (1 - Math.cos(a)) + x * Math.cos(a), R * Math.sin(a) - x * Math.sin(a));
  }
  g.computeVertexNormals();
  return g;
}

// Build once on the right, mirrored on the left.
export function mirrored(ctx, build) {
  for (const s of [1, -1]) {
    const g = ctx.sub(0, 0, 0);
    g.scale.x = s;
    build(g);
  }
}

export function pincers(ctx, mat, size) {
  ctx.arms.forEach((pivot, i) => {
    const s = i ? 1 : -1;
    const g = new THREE.Group();
    g.position.set(s * 0.4, 0.06, 0);
    pivot.add(g);
    ctx.add(g, sphere(0.22 * size), mat);
    for (const d of [-1, 1]) {
      const finger = ctx.add(g, ctx.box(0.44 * size, 0.24 * size, 0.32 * size, 0.1 * size), mat, s * 0.26 * size, d * 0.17 * size, 0);
      finger.rotation.z = s * d * 0.32;
    }
  });
}
