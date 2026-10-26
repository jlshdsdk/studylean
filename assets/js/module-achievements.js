/**
 * Module: 成就勋章 (module-achievements.js)
 * Contractor: SA-18
 * Contract: ARCHITECTURE v2.0
 */
'use strict';

import { ACHIEVEMENTS, TIERS } from './data/achievements.js';

const meta = { id: 'achievements', title: '成就勋章', icon: 'trophy', order: 19 };

let viewRoot = null, viewParams = {};

/* 锁形小图标（SL.icon 内置图标集中无 lock，这里内联一份） */
const LOCK_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

function render(container, params) {
  viewRoot = container; viewParams = params || {};

  /* ---- 自动检测新解锁 ---- */
  const newly = detectUnlocks();

  /* ---- 布局 ---- */
  const unlockedMap = (SL.getData('achievements') || {}).unlocked || {};
  const total = ACHIEVEMENTS.length;
  const unlockedCount = ACHIEVEMENTS.filter(a => unlockedMap[a.id]).length;
  const pct = total ? Math.round((unlockedCount / total) * 100) : 0;

  container.innerHTML =
    '<div class="view-header fade-up"><h1>成就勋章</h1>' +
    '<div class="view-sub">每一枚勋章，都是你走过的一段路 · 每枚 +10 自律币</div></div>' +

    '<div class="card card--pad ach-progress fade-up">' +
      '<div class="ach-progress__head">' +
        '<strong>' + SL.icon('trophy', 18) + ' 已解锁 <span class="ach-progress__num">' + unlockedCount + '</span> / ' + total + '</strong>' +
        '<span class="ach-progress__pct">' + pct + '%</span>' +
      '</div>' +
      '<div class="ach-progress__bar" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100">' +
        '<div class="ach-progress__fill" style="width:' + pct + '%;"></div>' +
      '</div>' +
      (newly.length ? '<div class="ach-newly" id="achNewly">' + SL.icon('sparkles', 14) + ' 本次新解锁 ' + newly.length + ' 枚勋章</div>' : '') +
    '</div>' +

    '<div id="achWall" class="stagger"></div>';

  renderWall(unlockedMap);
  celebrate(newly);
  SL.bindCardSwipe?.();
  SL.refreshBadges?.();
}

/* 遍历 ACHIEVEMENTS 检测，新解锁写库 + 发币 */
function detectUnlocks() {
  const newly = [];
  const d = SL.getData('achievements');
  d.unlocked = d.unlocked || {};
  for (const a of ACHIEVEMENTS) {
    if (d.unlocked[a.id]) continue;
    let ok = false;
    try { ok = typeof a.check === 'function' && !!a.check(SL); } catch (e) { ok = false; }
    if (ok) {
      d.unlocked[a.id] = SL.fmt.date(new Date());
      newly.push(a);
    }
  }
  if (newly.length) {
    SL.setData('achievements', d); // 先落库，避免发币产生的 shop records 干扰后续 check
    // 发币（契约 §6.5：成就解锁 +10）
    newly.forEach(a => SL.earnCoin('解锁成就：' + a.name, 10));
  }
  return newly;
}

const TIER_ORDER = ['diamond', 'gold', 'silver', 'bronze'];

function renderWall(unlockedMap) {
  const wall = viewRoot.querySelector('#achWall');
  if (!wall) return;
  wall.innerHTML = TIER_ORDER.map(tier => {
    const list = ACHIEVEMENTS.filter(a => a.tier === tier);
    if (!list.length) return '';
    const t = TIERS[tier];
    const gotInTier = list.filter(a => unlockedMap[a.id]).length;
    return '<section class="ach-section fade-up">' +
      '<h2 class="ach-section__title"><span class="ach-tier-dot" style="background:' + t.color + '"></span>' +
      SL.esc(t.name) + '勋章 <span class="muted">' + gotInTier + '/' + list.length + '</span></h2>' +
      '<div class="ach-grid">' +
      list.map(a => medalHTML(a, unlockedMap[a.id], t)).join('') +
      '</div></section>';
  }).join('');
}

function medalHTML(a, dateStr, tier) {
  const unlocked = !!dateStr;
  return '<div class="ach-medal' + (unlocked ? ' is-unlocked' : ' is-locked') + '" ' +
    (unlocked ? '' : 'title="未解锁：' + SL.esc(a.desc) + '"') + '>' +
    '<div class="ach-medal__coin" style="--tier-color:' + tier.color + '">' +
      '<span class="ach-medal__icon">' + SL.icon(a.icon, 22) + '</span>' +
      (unlocked ? '' : '<span class="ach-medal__lock">' + LOCK_SVG + '</span>') +
    '</div>' +
    '<strong class="ach-medal__name">' + SL.esc(a.name) + '</strong>' +
    '<span class="ach-medal__desc">' + SL.esc(a.desc) + '</span>' +
    '<span class="ach-medal__date">' + (unlocked ? SL.icon('checkCircle', 12) + ' ' + SL.esc(dateStr) : '未解锁') + '</span>' +
    '</div>';
}

/* 逐个 toast 祝贺，间隔 300ms；一次解锁超过 5 枚时折叠为汇总 toast（节流，防右上角刷屏） */
let toastTimers = [];
function celebrate(newly) {
  const MAX_TOASTS = 5;
  if (newly.length > MAX_TOASTS) {
    const heads = newly.slice(0, MAX_TOASTS).map(a => '「' + a.name + '」').join('');
    toastTimers.push(setTimeout(() => {
      SL.toast('新解锁 ' + newly.length + ' 枚勋章：' + heads + ' 等，各 +10 自律币', 'success');
    }, 0));
    return;
  }
  newly.forEach((a, i) => {
    toastTimers.push(setTimeout(() => {
      SL.toast('解锁成就「' + a.name + '」+10 自律币', 'success');
    }, i * 300));
  });
}

function destroy() {
  toastTimers.forEach(clearTimeout);
  toastTimers = [];
}

export { render, destroy, meta };
