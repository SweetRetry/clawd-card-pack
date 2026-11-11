// Frame probe for diagnosing jank on phones. Off unless the URL has ?perf or the build sets
// VITE_PERF=1 (the mini tool container cannot pass a query string, so a debug zip uses the flag).
// It shows a small HUD and keeps the same numbers on window.__perf for scripted runs.
//
// HUD lines:
//   phase, fps, p95 of the gap between frames, worst gap since the last reset
//   cpu: p95 of our own work per frame (update + issuing the draw calls). If cpu stays small
//        while the gap p95 is 33 ms, the frame is lost on the GPU or in the compositor.
//   calls / tris / textures / shader programs, DPR and drawing-buffer size
// Tapping the HUD calls onTap (main.js flips the DPR between 1.5 and 1) and resets the stats,
// so a GPU-bound phone shows up as a p95 that drops when the DPR does.
const ON = /[?&]perf\b/.test(location.search) || import.meta.env.VITE_PERF === '1';

export function createPerf(renderer, onTap) {
  if (!ON) return { frame() {}, mark: (label, fn) => fn() };

  const hud = document.createElement('pre');
  hud.style.cssText =
    'position:fixed;z-index:99;left:8px;top:calc(var(--host-top, 12px) + 4px);margin:0;padding:6px 8px;border-radius:6px;' +
    'background:rgba(0,0,0,.72);color:#9f9;font:11px/1.35 ui-monospace,Menlo,monospace';
  document.body.appendChild(hud);

  const gaps = [], cpus = []; // last 120 frames, ms
  let last = 0, worst = 0, shown = 0;
  const marks = []; // [label, ms] for one-off costs
  const out = (window.__perf = { fps: 0, p95: 0, cpu: 0, worst: 0, calls: 0, tris: 0, textures: 0, programs: 0, dpr: 0, marks });
  out.reset = () => {
    worst = 0;
    gaps.length = cpus.length = marks.length = 0;
  };
  hud.addEventListener('click', () => {
    if (onTap) onTap();
    out.reset();
    last = 0;
  });
  const p95 = (list) => list.slice().sort((a, b) => a - b)[Math.floor(list.length * 0.95)];
  const push = (list, v) => {
    list.push(v);
    if (list.length > 120) list.shift();
  };

  return {
    // Call once per frame, right after the main render. `cpu` is the frame's own work in ms.
    frame(now, phase, cpu) {
      if (last) {
        const gap = now - last;
        push(gaps, gap);
        if (gap > worst) worst = gap;
      }
      push(cpus, cpu);
      last = now;
      // Once a second: refreshing the HUD is DOM work over the canvas, kept rare so the
      // probe does not cause the drops it reports.
      if (now - shown < 1000 || gaps.length < 10) return;
      shown = now;
      const info = renderer.info;
      out.calls = info.render.calls;
      out.tris = info.render.triangles;
      out.textures = info.memory.textures;
      out.programs = info.programs ? info.programs.length : 0;
      out.dpr = renderer.getPixelRatio();
      out.fps = Math.round(1000 / (gaps.reduce((s, g) => s + g, 0) / gaps.length));
      out.p95 = Math.round(p95(gaps));
      out.cpu = Math.round(p95(cpus) * 10) / 10;
      out.worst = Math.round(worst);
      const { width, height } = renderer.domElement;
      hud.textContent =
        `${phase}  ${out.fps} fps  p95 ${out.p95}ms  worst ${out.worst}ms\n` +
        `cpu p95 ${out.cpu}ms\n` +
        `calls ${out.calls}  tris ${(out.tris / 1000).toFixed(1)}k  tex ${out.textures}  prog ${out.programs}\n` +
        `dpr ${out.dpr}  buffer ${width}x${height}  (tap: toggle dpr)` +
        (marks.length ? `\n${marks.slice(-3).map(([l, ms]) => `${l} ${ms.toFixed(1)}ms`).join('  ')}` : '');
    },
    // Times a synchronous chunk of work outside the frame loop.
    mark(label, fn) {
      const t = performance.now();
      const result = fn();
      marks.push([label, performance.now() - t]);
      return result;
    },
  };
}
