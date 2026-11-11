// Celebration effects: the rainbow fan that escapes the torn pack, and confetti.
import * as THREE from 'three';

const COLORS = ['#ff4d6d', '#ff9f1c', '#ffd60a', '#2ec4b6', '#3a86ff', '#8338ec', '#ff5fa2', '#e0714a'];

export function createRays() {
  const uniforms = {
    uReach: { value: 0 }, uInner: { value: 0 }, uSpread: { value: 0 }, uAlpha: { value: 0 }, uTime: { value: 0 },
  };
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 16).translate(0, 7, 0),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms,
      vertexShader: /* glsl */ `
        varying vec2 vP;
        void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        varying vec2 vP;
        uniform float uReach, uInner, uSpread, uAlpha, uTime;
        float hash(float n) { return fract(sin(n * 91.7) * 43758.5453); }
        vec3 pal(float i) {
          if (i < 0.5) return vec3(1.0, 0.25, 0.33);
          if (i < 1.5) return vec3(1.0, 0.55, 0.1);
          if (i < 2.5) return vec3(1.0, 0.83, 0.1);
          if (i < 3.5) return vec3(0.2, 0.8, 0.45);
          if (i < 4.5) return vec3(0.25, 0.65, 1.0);
          if (i < 5.5) return vec3(0.5, 0.35, 0.95);
          return vec3(1.0, 0.3, 0.7);
        }
        void main() {
          float r = length(vP);
          float a = atan(vP.x, vP.y);
          float wave = sin(r * 5.0 - uTime * 9.0) * 0.17 / max(r, 0.7);
          float t = (a + wave) / 2.5 + 0.5;
          float idx = floor(t * 24.0);
          float reach = uReach * (0.8 + 0.35 * hash(idx));
          float alpha = step(0.0, t) * step(t, uSpread)
            * smoothstep(reach, reach - 0.7, r) * smoothstep(uInner, uInner + 0.7, r);
          vec3 c = mix(vec3(1.0), pal(mod(idx, 7.0)), smoothstep(0.2, 1.7, r - uInner));
          gl_FragColor = vec4(c, alpha * uAlpha);
        }`,
    })
  );
  mesh.visible = false;

  let launched = -1;
  return {
    mesh,
    // While tearing: short rays, spreading left to right with the tear front.
    tear(p, origin) {
      mesh.visible = true;
      mesh.position.set(origin.x, origin.y, -0.6);
      uniforms.uSpread.value = p;
      uniforms.uReach.value = 0.5 + p * 2.2;
      uniforms.uInner.value = 0;
      uniforms.uAlpha.value = 1;
      launched = -1;
    },
    launch() {
      launched = 0;
    },
    update(t, dt) {
      uniforms.uTime.value = t;
      if (launched < 0) return;
      launched += dt;
      const k = Math.min(launched / 1.3, 1);
      uniforms.uSpread.value = 1;
      uniforms.uReach.value = 2.7 + (1 - Math.pow(1 - k, 3)) * 16;
      uniforms.uInner.value = Math.max(0, launched - 0.45) * 14;
      uniforms.uAlpha.value = 1 - THREE.MathUtils.smoothstep(k, 0.6, 1);
      if (k >= 1) {
        mesh.visible = false;
        launched = -1;
      }
    },
  };
}

export function createConfetti(count = 280) {
  const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false });
  const layers = [
    new THREE.InstancedMesh(new THREE.PlaneGeometry(0.13, 0.08), mat, Math.round(count * 0.7)),
    new THREE.InstancedMesh(new THREE.CircleGeometry(0.05, 12), mat, Math.round(count * 0.3)),
  ];
  const parts = [];
  const color = new THREE.Color();
  for (const mesh of layers) {
    mesh.frustumCulled = false;
    mesh.renderOrder = 6; // after the card backdrops, which ignore depth
    mesh.visible = false;
    for (let i = 0; i < mesh.count; i++) {
      mesh.setColorAt(i, color.set(COLORS[(Math.random() * COLORS.length) | 0]));
      parts.push({ mesh, i, pos: new THREE.Vector3(), vel: new THREE.Vector3(), rot: new THREE.Euler(), spin: new THREE.Vector3(), life: 0, size: 1 });
    }
  }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  const group = new THREE.Group();
  group.add(...layers);

  return {
    group,
    burst(origin) {
      for (const mesh of layers) mesh.visible = true;
      for (const p of parts) {
        const a = (Math.random() - 0.5) * 2.6, speed = 5 + Math.random() * 13;
        p.pos.copy(origin).add(s.set((Math.random() - 0.5) * 1.6, Math.random() * 0.3, Math.random() * 0.6));
        p.vel.set(Math.sin(a) * speed, Math.cos(a) * speed * 0.9 + 2, (Math.random() - 0.3) * 5);
        p.spin.set(Math.random() * 12 - 6, Math.random() * 12 - 6, Math.random() * 12 - 6);
        p.life = 2 + Math.random() * 1.8;
        p.size = 0.7 + Math.random() * 0.9;
      }
    },
    update(dt) {
      if (!layers[0].visible) return;
      let alive = false;
      const drag = Math.exp(-1.6 * dt);
      for (const p of parts) {
        if (p.life > 0) {
          alive = true;
          p.life -= dt;
          p.vel.multiplyScalar(drag);
          p.vel.y -= 9 * dt;
          p.pos.addScaledVector(p.vel, dt);
          p.rot.x += p.spin.x * dt;
          p.rot.y += p.spin.y * dt;
          p.rot.z += p.spin.z * dt;
        }
        const k = p.life > 0 ? p.size * Math.min(p.life / 0.4, 1) : 0;
        m.compose(p.pos, q.setFromEuler(p.rot), s.setScalar(k));
        p.mesh.setMatrixAt(p.i, m);
      }
      for (const mesh of layers) {
        mesh.instanceMatrix.needsUpdate = true;
        mesh.visible = alive;
      }
    },
  };
}
