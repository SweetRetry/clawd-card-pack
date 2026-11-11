// Local persistence for the collection.
//
// The container exposes Storage from client 9.46 on, so we prefer it and fall back to
// browser storage on older clients. Browser storage is namespaced per mini tool by the
// container, but it can be cleared, so callers must tolerate read misses.
const STORAGE_MIN_CLIENT_VERSION = 9460;
const KEY = 'clawd-dex-v1';

function readBuildVersion(launchOptions) {
  const env = launchOptions && launchOptions.miniToolEnv;
  return Number(env && env.buildVersion) || 0;
}

async function getBuildVersion() {
  const xhs = window.xhs;
  const syncBuildVersion = readBuildVersion(xhs && xhs.launchOptions);
  if (syncBuildVersion) return syncBuildVersion;

  const miniTool = xhs && xhs.miniTool;
  if (!miniTool || typeof miniTool.getLaunchOptions !== 'function') return 0;

  try {
    return readBuildVersion(await miniTool.getLaunchOptions());
  } catch (error) {
    return 0;
  }
}

function hasContainerStorage() {
  const miniTool = window.xhs && window.xhs.miniTool;
  return !!(
    miniTool &&
    typeof miniTool.setStorage === 'function' &&
    typeof miniTool.getStorage === 'function'
  );
}

async function readRaw() {
  const miniTool = window.xhs && window.xhs.miniTool;
  if (hasContainerStorage()) {
    const buildVersion = await getBuildVersion();
    if (Math.floor(buildVersion / 1000) >= STORAGE_MIN_CLIENT_VERSION) {
      try {
        const result = await miniTool.getStorage({ key: KEY });
        return result && typeof result.data === 'string' ? result.data : null;
      } catch (error) {
        return null;
      }
    }
  }
  try {
    return localStorage.getItem(KEY);
  } catch (error) {
    return null;
  }
}

async function writeRaw(serialized) {
  const miniTool = window.xhs && window.xhs.miniTool;
  if (hasContainerStorage()) {
    const buildVersion = await getBuildVersion();
    if (Math.floor(buildVersion / 1000) >= STORAGE_MIN_CLIENT_VERSION) {
      try {
        await miniTool.setStorage({ key: KEY, data: serialized });
        return true;
      } catch (error) {
        return false;
      }
    }
  }
  try {
    localStorage.setItem(KEY, serialized);
    return true;
  } catch (error) {
    return false;
  }
}

let owned = {}; // { [def.id]: { n, thumb } }

export async function loadDex() {
  const raw = await readRaw();
  if (typeof raw !== 'string') return;
  try {
    const parsed = JSON.parse(raw);
    owned = parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    owned = {};
  }
}

function save() {
  let serialized;
  try {
    serialized = JSON.stringify(owned);
  } catch (error) {
    return;
  }
  // Fire and forget. A failed write only means the collection lasts for this visit.
  writeRaw(serialized);
}

export const dex = {
  // Records one pull. `thumb` is only called for a card not seen before. Returns true when new.
  collect(def, thumb) {
    const fresh = !(def.id in owned);
    if (fresh) owned[def.id] = { n: 0, thumb: thumb() };
    owned[def.id].n++;
    save();
    return fresh;
  },
  count: (defs) => defs.filter((def) => def.id in owned).length,
  clear() {
    owned = {};
    save();
  },
};

const RARITY = { common: '普通', rare: '稀有', ultra: '超稀有' };

export function renderDex(root, SERIES) {
  const tile = (def) => {
    const got = owned[def.id];
    return got
      ? `<figure class="got ${def.rarity}" data-id="${def.id}"><span class="frame"><img src="${got.thumb}" alt="${def.name}"></span><figcaption><b>${def.name}</b><span>${RARITY[def.rarity]} · ×${got.n}</span></figcaption></figure>`
      : `<figure class="miss"><span class="frame"><div>?</div></span><figcaption><b>No. ${def.no}</b><span>${RARITY[def.rarity]}</span></figcaption></figure>`;
  };
  root.innerHTML = SERIES.map((s) => {
    const n = dex.count(s.defs);
    return `<section>
      <h3>${s.title}<small>${n} / ${s.defs.length}</small></h3>
      <div class="bar"><i style="width:${(n / s.defs.length) * 100}%"></i></div>
      <div class="grid">${s.defs.map(tile).join('')}</div>
    </section>`;
  }).join('');
}
