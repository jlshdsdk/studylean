/**
 * Module: 专注森林 (module-forest.js)
 * Contractor: SA-18
 * Contract: ARCHITECTURE v2.0
 */
'use strict';

const meta = { id: 'forest', title: '专注森林', icon: 'tree', order: 17 };

let viewRoot = null, viewParams = {};

/* ===== 树种定义 ===== */
const SPECIES = {
  sprout: { name: '新芽',   desc: '专注 25-49 分钟',   unlock: '完成一次 25 分钟以上专注', need: 25 },
  pine:   { name: '松树',   desc: '专注 30-49 分钟',   unlock: '完成一次 30 分钟以上专注', need: 30 },
  oak:    { name: '橡树',   desc: '专注 50-89 分钟',   unlock: '完成一次 50 分钟以上专注', need: 50 },
  ginkgo: { name: '银杏',   desc: '专注 90 分钟以上',  unlock: '完成一次 90 分钟以上专注', need: 90 },
  maple:  { name: '枫树',   desc: '稀有种 · 森林的常客', unlock: '累计种下 10 棵树解锁',     need: 10 },
  sakura: { name: '樱花',   desc: '稀有种 · 春日的馈赠', unlock: '累计种下 30 棵树解锁',     need: 30 }
};
const RARE = ['maple', 'sakura'];
// 合法树种集合（treeSVG 的 fallback 判定用；'tree' 是历史遗留非法值）
treeSVG.known = { sprout: 1, pine: 1, oak: 1, ginkgo: 1, maple: 1, sakura: 1 };

function trees() {
  const t = (SL.getData('forest') || {}).trees;
  return Array.isArray(t) ? t : [];
}
function isUnlocked(key, list) {
  const clean = list.filter(Boolean);
  if (key === 'maple') return clean.length >= 10;
  if (key === 'sakura') return clean.length >= 30;
  return clean.some(t => t.species === key);
}

/* ===== 每种树的小 SVG（颜色 / 大小 / 层次各不同） ===== */
function treeSVG(key) {
  // 旧数据可能出现非法 species（如早期 'tree'），兜底渲染为新芽，避免空白格子
  if (!SPECIES[key] || !treeSVG.known[key]) key = 'sprout';
  const W = 64, H = 72;
  const open = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="100%" aria-hidden="true">';
  const trunk = (x, y, w, h, c) =>
    '<path d="M' + x + ' ' + (y + h) + 'q2 -' + (h / 2) + ' 0 -' + h + '" stroke="' + c + '" stroke-width="' + w + '" stroke-linecap="round" fill="none"/>';
  switch (key) {
    case 'sprout':
      return open +
        '<path d="M32 62q1.5 -8 0 -16" stroke="#8a9a5b" stroke-width="3" stroke-linecap="round" fill="none"/>' +
        '<path d="M32 48c-8 -2 -12 -8 -12 -14 8 0 13 5 12 14z" fill="#7ec850"/>' +
        '<path d="M32 46c8 -3 11 -9 10 -15 -8 1 -12 6 -10 15z" fill="#a3d977"/>' +
        '</svg>';
    case 'pine':
      return open +
        '<path d="M32 64V48" stroke="#7c5a3a" stroke-width="4" stroke-linecap="round"/>' +
        '<path d="M32 6 20 24h24z" fill="#2f7d4f"/>' +
        '<path d="M32 18 16 38h32z" fill="#3c9a63"/>' +
        '<path d="M32 32 12 52h40z" fill="#2f7d4f"/>' +
        '</svg>';
    case 'oak':
      return open +
        '<path d="M32 64V44" stroke="#8a6240" stroke-width="5" stroke-linecap="round"/>' +
        '<circle cx="32" cy="26" r="16" fill="#5da144"/>' +
        '<circle cx="21" cy="32" r="9" fill="#6fb356"/>' +
        '<circle cx="43" cy="32" r="9" fill="#4c8f3c"/>' +
        '<circle cx="32" cy="16" r="8" fill="#7cc464"/>' +
        '</svg>';
    case 'ginkgo':
      return open +
        '<path d="M32 64V40" stroke="#9a7b4f" stroke-width="4" stroke-linecap="round"/>' +
        '<path d="M32 8c-12 6 -16 20 -8 30 3 4 13 4 16 0 8 -10 4 -24 -8 -30z" fill="#e9b83c"/>' +
        '<path d="M32 12v24" stroke="#d9a52e" stroke-width="2"/>' +
        '<path d="M26 20l6 6M38 20l-6 6" stroke="#d9a52e" stroke-width="2" stroke-linecap="round"/>' +
        '</svg>';
    case 'maple':
      return open +
        '<path d="M32 64V42" stroke="#7c5a3a" stroke-width="4" stroke-linecap="round"/>' +
        '<path d="M32 6l5 8 9 -3 -3 9 8 5 -8 5 3 9 -9 -3 -5 8 -5 -8 -9 3 3 -9 -8 -5 8 -5 -3 -9 9 3z" fill="#e06c3c"/>' +
        '<circle cx="32" cy="26" r="5" fill="#f2915c"/>' +
        '</svg>';
    case 'sakura':
      return open +
        '<path d="M32 64V44" stroke="#8a6240" stroke-width="4" stroke-linecap="round"/>' +
        '<circle cx="32" cy="18" r="9" fill="#f7a8c4"/>' +
        '<circle cx="21" cy="28" r="8" fill="#f393b4"/>' +
        '<circle cx="43" cy="28" r="8" fill="#f393b4"/>' +
        '<circle cx="32" cy="34" r="8" fill="#fbd0e0"/>' +
        '<circle cx="32" cy="26" r="3" fill="#fff" opacity=".8"/>' +
        '</svg>';
    default:
      return open + '</svg>';
  }
}
/* 剪影版（图鉴未解锁：灰色单色） */
function treeSilhouette(key) {
  return treeSVG(key).replace(/fill="#[0-9a-fA-F]{3,6}"/g, 'fill="var(--fg-muted)"')
    .replace(/stroke="#[0-9a-fA-F]{3,6}"/g, 'stroke="var(--fg-muted)"')
    .replace(/opacity="\.8"/g, '');
}

/* ===== 渲染 ===== */
function render(container, params) {
  viewRoot = container; viewParams = params || {};
  const list = trees();
  const totalMin = list.reduce((s, t) => s + (t && t.minutes || 0), 0);
  const today = SL.fmt.date(new Date());
  const todayTrees = list.filter(t => t && t.date === today);

  container.innerHTML =
    '<div class="view-header fade-up"><h1>专注森林</h1>' +
    '<div class="view-sub">每一段专注，都会在这里长成一棵树</div></div>' +

    '<div class="forest-stats stagger">' +
      statCard('tree', list.length, '棵树') +
      statCard('clock', totalMin, '累计专注分钟') +
      statCard('sparkles', Object.keys(SPECIES).filter(k => isUnlocked(k, list)).length, '已收集树种') +
    '</div>' +

    '<div class="card card--pad forest-land-card fade-up">' +
      '<div class="forest-land-head"><h2>我的森林</h2>' +
      (todayTrees.length ? '<span class="forest-today-badge">' + SL.icon('sun', 14) + ' 今日新种 ' + todayTrees.length + ' 棵</span>' : '') +
      '</div>' +
      (list.length ? (list.length > 300 ? '<div class="muted" style="font-size:11.5px;margin-bottom:8px;">树太多啦，这里只展示最近 300 棵 · 共 ' + list.length + ' 棵</div>' : '') +
        '<div class="forest-grid" id="fGrid"></div>' : emptyLand()) +
    '</div>' +

    (list.length ? timelineHTML(list) : '') +

    '<div class="card card--pad fade-up"><h2 class="forest-h2">树种图鉴</h2>' +
    '<div class="forest-dex" id="fDex"></div></div>';

  if (list.length) renderGrid(list, today);
  renderDex(list);
  container.querySelector('#fGoTimer')?.addEventListener('click', () => SL.go('timer'));
  SL.bindCardSwipe?.();
  SL.refreshBadges?.();
}

function statCard(icon, val, label) {
  return '<div class="card card--pad forest-stat"><span class="forest-stat__icon">' + SL.icon(icon, 22) + '</span>' +
    '<strong class="forest-stat__num">' + val + '</strong><span class="forest-stat__label">' + label + '</span></div>';
}

function emptyLand() {
  return '<div class="empty-state forest-empty">' +
    '<div class="forest-empty__land" aria-hidden="true">' +
    '<svg viewBox="0 0 220 90" width="220" height="90"><ellipse cx="110" cy="74" rx="100" ry="12" fill="var(--fg-muted)" opacity=".12"/>' +
    '<path d="M30 72q4 -14 12 -16M60 74q-2 -10 4 -14M150 73q5 -12 14 -13M185 72q-3 -9 3 -13" stroke="var(--fg-muted)" stroke-width="2" fill="none" stroke-linecap="round" opacity=".45"/></svg></div>' +
    '<p>这里还是一片荒地<br>去番茄钟专注一次，种下第一棵树吧</p>' +
    '<button class="btn btn--primary" id="fGoTimer">' + SL.icon('timer', 16) + ' 种下第一棵树</button></div>';
}

function renderGrid(list, today) {
  const grid = viewRoot.querySelector('#fGrid');
  if (!grid) return;
  // DOM 性能保护：超过 300 棵时只渲染最近 300 棵（总数已在卡片头部标注）
  const shown = list.filter(Boolean).slice(-300);
  grid.innerHTML = shown.map((t, i) => {
    const cls = 'forest-tree' + (t.date === today ? ' forest-tree--today' : '');
    const style = 'animation-delay:' + Math.min(i * 40, 1200) + 'ms;--sway-dur:' + (3 + (i % 5) * 0.6) + 's;--sway-delay:' + (i % 7) * 0.4 + 's';
    return '<div class="' + cls + '" style="' + style + '" title="' + SL.esc(t.date || '') + ' · ' + (t.minutes || 0) + ' 分钟">' +
      treeSVG(t.species) +
      (t.date === today ? '<span class="forest-tree__dot"></span>' : '') +
      '</div>';
  }).join('');
}

function timelineHTML(list) {
  const recent = list.filter(Boolean).slice(-10).reverse();
  return '<div class="card card--pad fade-up"><h2 class="forest-h2">' + SL.icon('clock', 16) + ' 最近种下的树</h2>' +
    '<ul class="forest-timeline">' +
    recent.map(t => {
      const sp = SPECIES[t.species] || { name: t.species || '未知' };
      return '<li class="forest-timeline__item' + (t.date === SL.fmt.date(new Date()) ? ' is-today' : '') + '">' +
        '<span class="forest-timeline__tree">' + treeSVG(t.species) + '</span>' +
        '<div class="forest-timeline__info"><strong>' + SL.esc(sp.name) + '</strong>' +
        '<span class="muted">' + SL.esc(t.date) + ' · 专注 ' + (t.minutes || 0) + ' 分钟</span></div>' +
        (t.date === SL.fmt.date(new Date()) ? '<span class="forest-timeline__tag">今天</span>' : '') +
        '</li>';
    }).join('') +
    '</ul></div>';
}

function renderDex(list) {
  const dex = viewRoot.querySelector('#fDex');
  if (!dex) return;
  dex.innerHTML = Object.keys(SPECIES).map(k => {
    const sp = SPECIES[k];
    const ok = isUnlocked(k, list);
    const count = RARE.includes(k) ? list.filter(t => t.species === k).length : 0;
    return '<div class="forest-dex__item' + (ok ? ' is-unlocked' : ' is-locked') + '">' +
      '<div class="forest-dex__art">' + (ok ? treeSVG(k) : treeSilhouette(k)) + '</div>' +
      '<strong>' + SL.esc(sp.name) + (count ? ' ×' + count : '') + '</strong>' +
      '<span class="muted forest-dex__cond">' + (ok ? SL.esc(sp.desc) : '<svg class="icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg> ' + SL.esc(sp.unlock)) + '</span>' +
      '</div>';
  }).join('');
}

function destroy() {}

export { render, destroy, meta };
