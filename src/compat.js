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

// Publishes two lengths on <html> for the stylesheet, in plain px so Chrome 61 never sees env():
//   --safe-bottom  the bottom safe-area inset
//   --host-top     where the page's own UI may start below the host's top buttons
// The PC simulator injects --safe-area-inset-* variables; phones answer env(). In the
// container, getWindowInfo (client 9.49+) reports the host buttons' real rects. Older
// clients do not, so there we keep a 52px nav row free below the safe area.
function trackInsets() {
  const root = document.documentElement;
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none';
  document.body.appendChild(probe);
  const inset = (side) => {
    const injected = parseFloat(getComputedStyle(root).getPropertyValue(`--safe-area-inset-${side}`));
    if (!isNaN(injected)) return injected;
    probe.style.paddingTop = '0px';
    probe.style.paddingTop = `env(safe-area-inset-${side})`; // ignored where env() is unknown
    return parseFloat(getComputedStyle(probe).paddingTop) || 0;
  };
  const miniTool = window.xhs && window.xhs.miniTool;
  let hostBottom = null; // lowest edge of the host's visible top buttons, from getWindowInfo

  const sync = () => {
    const top = inset('top');
    const fallback = miniTool ? top + 52 : top + 12;
    root.style.setProperty('--host-top', `${Math.round(hostBottom === null ? fallback : Math.max(hostBottom, top) + 8)}px`);
    root.style.setProperty('--safe-bottom', `${Math.round(inset('bottom'))}px`);
  };
  const ask = () => {
    if (!miniTool || typeof miniTool.getWindowInfo !== 'function') return;
    Promise.resolve(miniTool.getWindowInfo())
      .then((info) => {
        const buttons = (info && info.menuButtons) || {};
        hostBottom = ['back', 'me', 'share']
          .map((name) => buttons[name])
          .filter(Boolean)
          .reduce((low, rect) => Math.max(low, rect.bottom), (info && info.statusBarHeight) || 0);
        sync();
      })
      .catch(() => {});
  };
  sync();
  ask();
  window.addEventListener('resize', () => {
    sync();
    ask();
  });
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
  trackInsets();
  polyfillRoundRect();
}
