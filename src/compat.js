// Runtime capability shims for the mini tool container, whose minimum kernel is Chrome 61.

// Adds `supports-flex-gap` to <html> when flexbox `gap` works, so the stylesheet can swap
// its margin fallbacks for real gaps.
function detectFlexGap() {
  if (!document.body) return;
  const probe = document.createElement('div');
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.display = 'flex';
  probe.style.flexDirection = 'column';
  probe.style.rowGap = '1px';
  probe.appendChild(document.createElement('div'));
  probe.appendChild(document.createElement('div'));
  document.body.appendChild(probe);
  const supported = probe.scrollHeight === 1;
  probe.parentNode.removeChild(probe);
  if (supported) document.documentElement.classList.add('supports-flex-gap');
}

// Mirrors the real viewport height into --app-height, for layouts that cannot trust 100vh.
function trackAppHeight() {
  const sync = () => document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
  sync();
  window.addEventListener('resize', sync);
  window.addEventListener('orientationchange', sync);
}

// CanvasRenderingContext2D.roundRect only arrived in Chrome 99. Card text, faces and
// shadows all draw with it, so older kernels get this stand-in.
function polyfillRoundRect() {
  const proto = CanvasRenderingContext2D.prototype;
  if (proto.roundRect) return;
  proto.roundRect = function (x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
  };
}

export function initCompat() {
  detectFlexGap();
  trackAppHeight();
  polyfillRoundRect();
}
