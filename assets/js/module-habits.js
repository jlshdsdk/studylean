/**
 * Module: 习惯打卡 (module-habits.js)
 * Contractor: SA-14
 * Contract: ARCHITECTURE v2.0
 */
'use strict';

const meta = { id: 'habits', title: '习惯打卡', icon: 'checkCircle', order: 13 };

const HB_COLORS = ['#5B6CFF', '#FF7AB6', '#2DD4BF', '#F59E0B', '#10B981', '#8B5CF6'];
const HB_GOAL_DAYS = 21;
const HB_FIX_COST = 2;

let viewRoot = null, viewParams = {};

function render(container, params) {
  viewRoot = container; viewParams = params || {};
  const items = (SL.getData('habits').items || []).slice();
  const today = SL.helpers.todayKey();

  // 顶部统计
  const doneToday = items.filter(h => h.records && h.records[today]).length;
  const totalChecks = items.reduce((s, h) => s + Object.keys(h.records || {}).length, 0);
  const bestStreak = items.reduce((m, h) => Math.max(m, bestStreakOf(h.records || {})), 0);

  container.innerHTML =
    '<div class="view-header fade-up"><h1>习惯打卡</h1>' +
    '<div class="view-sub">连续 21 天，习惯自然养成 · 每次打卡 +2 自律币</div></div>' +

    '<div class="hb-stats">' +
    statCard('checkCircle', 'hbToday', SL.fmt.num(doneToday) + ' / ' + SL.fmt.num(items.length), '今日打卡') +
    statCard('flame', 'hbBest', SL.fmt.num(bestStreak), '最长连续纪录') +
    statCard('star', 'hbTotal', SL.fmt.num(totalChecks), '总打卡次数') +
    '</div>' +

    '<div class="diary-toolbar">' +
    '<button class="btn btn--primary" id="hbNew">' + SL.icon('plus', 16) + ' 新建习惯</button>' +
    '</div>' +

    '<div id="hbGrid" class="hb-grid stagger"></div>';

  container.querySelector('#hbNew').addEventListener('click', () => openEditor(null));

  const gridEl = container.querySelector('#hbGrid');
  if (!items.length) {
    gridEl.innerHTML =
      '<div class="empty-state hb-empty">' + SL.icon('checkCircle', 52) +
      '<p class="empty-title">还没有习惯</p>' +
      '<p>早起、背单词、每天读书…<br>从一个 21 天的小目标开始</p>' +
      '<button class="btn btn--primary" id="hbNewEmpty">创建第一个习惯</button></div>';
    gridEl.querySelector('#hbNewEmpty').addEventListener('click', () => openEditor(null));
    SL.bindCardSwipe?.(); SL.refreshBadges?.();
    return;
  }

  gridEl.innerHTML = items.map(habitCard).join('');

  // 绑定：今日打卡
  gridEl.querySelectorAll('[data-check]').forEach(btn => btn.addEventListener('click', () => {
    checkToday(btn, btn.dataset.check);
  }));

  // 绑定：补卡
  gridEl.querySelectorAll('.hb-cell.is-miss:not(:disabled)[data-fix]').forEach(cell => {
    cell.addEventListener('click', ev => fixMiss(ev.currentTarget, cell.dataset.fix, cell.dataset.date));
  });

  // 绑定：编辑/删除
  gridEl.querySelectorAll('[data-edit]').forEach(el => el.addEventListener('click', () => {
    openEditor(findHabit(el.dataset.edit));
  }));
  gridEl.querySelectorAll('[data-del]').forEach(el => el.addEventListener('click', async () => {
    const h = findHabit(el.dataset.del);
    if (h && await SL.confirm('删除习惯「' + h.name + '」？打卡记录将一并清除。')) {
      const d = SL.getData('habits');
      d.items = d.items.filter(x => x.id !== h.id);
      SL.setData('habits', d);
      SL.toast('已删除', 'info');
      render(viewRoot, viewParams);
    }
  }));

  SL.bindCardSwipe?.(); SL.refreshBadges?.();
}

function destroy() {}

/* ===== 私有 ===== */

function findHabit(id) { return (SL.getData('habits').items || []).find(h => h.id === id); }

function statCard(icon, id, num, label) {
  return '<div class="hb-stat">' +
    '<div class="hb-stat__icon">' + SL.icon(icon, 19) + '</div>' +
    '<div><div class="hb-stat__num" id="' + id + '">' + num + '</div>' +
    '<div class="hb-stat__label">' + label + '</div></div></div>';
}

function habitCard(h) {
  const today = SL.helpers.todayKey();
  const records = h.records || {};
  const streak = SL.helpers.streakOf(records);
  const doneToday = !!records[today];
  const color = h.color || HB_COLORS[0];
  const grown = streak >= HB_GOAL_DAYS;
  const pct = Math.min(100, Math.round(streak / HB_GOAL_DAYS * 100));

  return '<div class="card hb-card">' +
    '<div class="hb-card__head">' +
    '<span class="hb-card__badge" style="background:' + SL.esc(color) + ';">' + SL.icon(h.icon || 'star', 20) + '</span>' +
    '<span class="hb-card__name">' + SL.esc(h.name) + '</span>' +
    (grown ? '<span class="hb-grown">' + SL.icon('trophy', 12) + '已养成</span>' : '') +
    '<span class="row-actions">' +
    '<button class="btn btn--ghost btn--sm" data-edit="' + h.id + '">' + SL.icon('edit', 14) + '</button>' +
    '<button class="btn btn--ghost btn--sm" data-del="' + h.id + '">' + SL.icon('trash', 14) + '</button>' +
    '</span></div>' +

    '<div class="hb-streak"><span class="hb-flame">' + SL.icon('flame', 26) + '</span>' +
    '<span class="hb-streak__num">' + SL.fmt.num(streak) + '</span>' +
    '<span class="hb-streak__label">天连续<br>近 ' + HB_GOAL_DAYS + ' 天目标</span></div>' +

    '<div class="hb-progress-row">' +
    '<div class="hb-progress"><div class="hb-progress__bar" style="width:' + pct + '%;background:linear-gradient(90deg,' + SL.esc(color) + ',#2DD4BF);"></div></div>' +
    '<span class="hb-progress-txt">' + Math.min(streak, HB_GOAL_DAYS) + '/' + HB_GOAL_DAYS + '</span></div>' +

    '<div class="hb-week">' + weekCells(h) + '</div>' +

    '<div class="hb-check-row">' +
    '<button class="btn hb-check' + (doneToday ? ' is-on' : '') + '" data-check="' + h.id + '"' + (doneToday ? ' disabled' : '') + '>' + SL.icon('check', 24) + '</button>' +
    '<span class="hb-check-txt"><strong>' + (doneToday ? '今日已打卡，保持住！' : '今天还没打卡') + '</strong>' +
    '<span>连续第 ' + streak + ' 天 · 打卡 +2 币</span></span>' +
    '</div></div>';
}

/* 近 7 天格子：已打=绿色，未打=灰。昨天起 6 天内未打可点补卡；今天不可预打 */
function weekCells(h) {
  const records = h.records || {};
  const today = SL.helpers.todayKey();
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = SL.fmt.date(d);
    const done = !!records[key];
    const isToday = key === today;
    if (done) {
      out.push('<button type="button" class="hb-cell is-done" style="background:' + SL.esc(h.color || HB_COLORS[0]) + ';" title="' + key + ' 已打卡" disabled>' + SL.icon('check', 13) + '</button>');
    } else if (!isToday && i >= 1) {
      out.push('<button type="button" class="hb-cell is-miss" data-fix="' + h.id + '" data-date="' + key + '" title="' + key + ' · 点击补卡（-2 自律币）">' + SL.icon('plus', 13) + '</button>');
    } else {
      out.push('<button type="button" class="hb-cell" title="' + (isToday ? '今天' : key) + '" disabled></button>');
    }
  }
  return out.join('');
}

/* 今日打卡 */
async function checkToday(btn, id) {
  const today = SL.helpers.todayKey();
  const exists = (SL.getData('habits').items || []).some(x => x.id === id && !(x.records && x.records[today]));
  if (!exists || btn.classList.contains('is-on')) return; // 已打卡/已删除则不重复入队
  btn.disabled = true;
  const d = SL.getData('habits');
  const t = d.items.find(x => x.id === id);
  if (!t) return;
  t.records = t.records || {};
  if (t.records[today]) return;
  const prevStreak = SL.helpers.streakOf(t.records);
  t.records[today] = true;
  SL.setData('habits', d); // 整体 setData 广播（不能只改 records 不广播）
  SL.earnCoin('习惯打卡', 2);

  btn.classList.add('is-on');
  const r = btn.getBoundingClientRect();
  SL.confetti(r.left + r.width / 2, r.top + r.height / 2);
  const streak = SL.helpers.streakOf(t.records);
  const card = btn.closest('.hb-card');
  if (card) {
    const num = card.querySelector('.hb-streak__num');
    if (num) SL.animNum(num, streak, 400);
    card.querySelector('.hb-week').innerHTML = weekCells(t);
    card.querySelectorAll('.hb-cell.is-miss:not(:disabled)[data-fix]').forEach(cell => {
      cell.addEventListener('click', ev => fixMiss(ev.currentTarget, cell.dataset.fix, cell.dataset.date));
    });
    const strong = card.querySelector('.hb-check-txt strong');
    if (strong) strong.textContent = '今日已打卡，保持住！';
    const sub = card.querySelector('.hb-check-txt span');
    if (sub) sub.textContent = '连续第 ' + streak + ' 天 · 打卡 +2 币';
    const pct = Math.min(100, Math.round(streak / HB_GOAL_DAYS * 100));
    const bar = card.querySelector('.hb-progress__bar');
    if (bar) bar.style.width = pct + '%';
    const ptxt = card.querySelector('.hb-progress-txt');
    if (ptxt) ptxt.textContent = Math.min(streak, HB_GOAL_DAYS) + '/' + HB_GOAL_DAYS;
    if (streak >= HB_GOAL_DAYS && !card.querySelector('.hb-grown')) {
      const nameEl = card.querySelector('.hb-card__name');
      if (nameEl) nameEl.insertAdjacentHTML('afterend',
        '<span class="hb-grown">' + SL.icon('trophy', 12) + '已养成</span>');
    }
  }
  // 顶部统计微刷新（不整页重渲染，保留打卡动画）
  const after = SL.getData('habits').items || [];
  const elToday = document.getElementById('hbToday');
  const elTotal = document.getElementById('hbTotal');
  const elBest = document.getElementById('hbBest');
  if (elToday) elToday.textContent = SL.fmt.num(after.filter(x => x.records && x.records[today]).length) + ' / ' + SL.fmt.num(after.length);
  if (elTotal) elTotal.textContent = SL.fmt.num(after.reduce((s, x) => s + Object.keys(x.records || {}).length, 0));
  if (elBest) elBest.textContent = SL.fmt.num(after.reduce((m, x) => Math.max(m, bestStreakOf(x.records || {})), 0));

  if (streak >= HB_GOAL_DAYS && prevStreak < HB_GOAL_DAYS) {
    SL.toast('「' + t.name + '」已连续 21 天，习惯养成！', 'success');
  } else {
    SL.toast('打卡成功，+2 自律币', 'success');
  }
}

/* 补卡：近 7 天内（不含今天），消耗 2 自律币 */
async function fixMiss(cell, id, dateKey) {
  const h = findHabit(id);
  if (!h || !dateKey) return;
  if (h.records && h.records[dateKey]) return;
  if (SL.getData('shop').coin < HB_FIX_COST) {
    SL.toast('自律币不足（补卡需 ' + HB_FIX_COST + ' 币），先去番茄钟赚点吧', 'error');
    return;
  }
  if (!(await SL.confirm('为「' + h.name + '」补打 ' + dateKey + '？将消耗 ' + HB_FIX_COST + ' 自律币。'))) return;
  const d = SL.getData('habits');
  const t = d.items.find(x => x.id === id);
  if (!t || (t.records && t.records[dateKey])) return;
  t.records = t.records || {};
  // 先扣币，扣失败（余额被并发操作花掉）就不写打卡
  if (!SL.spendCoin('补卡 · ' + t.name, HB_FIX_COST)) return;
  t.records[dateKey] = true;
  SL.setData('habits', d);
  SL.toast('补卡成功', 'success');
  render(viewRoot, viewParams);
}

/* 最长连续纪录（历史最长，非当前） */
function bestStreakOf(records) {
  const keys = Object.keys(records).filter(k => records[k]).sort();
  let best = 0, cur = 0, prev = null;
  for (const k of keys) {
    if (prev) {
      const p = new Date(prev + 'T00:00:00');
      p.setDate(p.getDate() + 1);
      cur = (SL.fmt.date(p) === k) ? cur + 1 : 1;
    } else {
      cur = 1;
    }
    prev = k;
    if (cur > best) best = cur;
  }
  return best;
}

/* 新建 / 编辑习惯 */
function openEditor(habit) {
  const isNew = !habit;
  const name = isNew ? '' : (habit.name || '');
  const icon = isNew ? 'star' : (habit.icon || 'star');
  const color = isNew ? HB_COLORS[0] : (habit.color || HB_COLORS[0]);
  const iconChoices = SL.iconNames.slice(0, 20);

  const close = SL.modal({
    title: isNew ? '新建习惯' : '编辑习惯',
    body:
      '<div class="field"><label>习惯名称</label>' +
      '<input class="input" id="hbName" maxlength="20" placeholder="例如：每天背 50 个单词" value="' + SL.esc(name) + '"></div>' +

      '<div class="field"><label>快捷选择</label><div class="hb-chips" id="hbChips">' +
      ['早起', '背单词', '读书30分钟', '不喝奶茶', '23点前睡'].map(t =>
        '<button type="button" class="chip" data-t="' + t + '">' + SL.esc(t) + '</button>').join('') +
      '</div></div>' +

      '<div class="field"><label>图标</label><div class="hb-icon-grid" id="hbIcons">' +
      iconChoices.map(n =>
        '<button type="button" class="hb-icon-opt' + (n === icon ? ' is-on' : '') + '" data-v="' + n + '">' + SL.icon(n, 17) + '</button>').join('') +
      '</div></div>' +

      '<div class="field"><label>颜色</label><div class="hb-color-row" id="hbColors">' +
      HB_COLORS.map(c =>
        '<button type="button" class="hb-color-opt' + (c === color ? ' is-on' : '') + '" data-v="' + c + '" style="background:' + c + ';" aria-label="' + c + '"></button>').join('') +
      '</div></div>',

    actions: [
      { label: '取消', onClick: () => close() },
      { label: isNew ? '创建（+2 币打卡从今天开始）' : '保存', primary: true, onClick: () => {
          const nm = document.getElementById('hbName').value.trim();
          if (!nm) { SL.toast('先给习惯起个名字', 'error'); return; }
          const ic = document.querySelector('#hbIcons .is-on')?.dataset.v || 'star';
          const co = document.querySelector('#hbColors .is-on')?.dataset.v || HB_COLORS[0];
          const d = SL.getData('habits');
          if (isNew) {
            d.items.push({ id: SL.id(), name: nm, icon: ic, color: co, records: {}, goal: HB_GOAL_DAYS });
            SL.toast('习惯已创建，今天开始打卡吧', 'success');
          } else {
            const t = d.items.find(x => x.id === habit.id);
            if (t) Object.assign(t, { name: nm, icon: ic, color: co });
            SL.toast('已保存', 'success');
          }
          SL.setData('habits', d);
          close();
          render(viewRoot, viewParams);
        } }
    ]
  });

  setTimeout(() => {
    document.querySelectorAll('#hbChips .chip').forEach(b => b.addEventListener('click', () => {
      const inp = document.getElementById('hbName');
      inp.value = b.dataset.t;
      inp.focus();
    }));
    const bindPick = (sel, cb) => document.querySelectorAll(sel).forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll(sel).forEach(x => x.classList.remove('is-on'));
      b.classList.add('is-on');
      if (cb) cb(b.dataset.v);
    }));
    bindPick('#hbIcons .hb-icon-opt');
    bindPick('#hbColors .hb-color-opt', c => {
      const inp = document.getElementById('hbName');
      inp.style.borderColor = c;
      setTimeout(() => { inp.style.borderColor = ''; }, 350);
    });
  }, 60);
}

export { render, destroy, meta };
