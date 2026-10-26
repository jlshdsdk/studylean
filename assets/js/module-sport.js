/**
 * Module: 运动消耗 (module-sport.js)
 * Contractor: SA-15
 * Contract: ARCHITECTURE v2.0
 */
'use strict';

import { SPORTS, SPORT_CATS, calcKcal } from './data/sports.js';

const meta = { id: 'sport', title: '运动消耗', icon: 'run', order: 17 };

let viewRoot = null;
let viewParams = {};
let unsub = null;

const QUICK_SPORTS = [
  { name: '快走', minutes: 30 },
  { name: '慢跑', minutes: 30 },
  { name: '跳绳（中速）', minutes: 30 },
  { name: '力量训练（一般）', minutes: 30 }
];

function render(container, params) {
  viewRoot = container;
  viewParams = params || {};

  container.innerHTML =
    '<div class="view-header fade-up"><h1>运动消耗</h1>' +
    '<div class="view-sub">迈开腿，每一滴汗都有数 · 记录运动换算消耗</div></div>' +

    '<div class="sport-top stagger" id="spTop"></div>' +

    '<div class="card card--pad sport-quick fade-up">' +
    '<div class="sport-quick__title">' + SL.icon('zap', 15) + ' 一键记录 30 分钟</div>' +
    '<div class="sport-quick__row" id="spQuickRow"></div>' +
    '</div>' +

    '<div class="sport-toolbar fade-up">' +
    '<button class="btn btn--primary" id="spAdd">' + SL.icon('plus', 16) + ' 记录运动</button>' +
    '<div class="muted" id="spTip" style="font-size:12px;"></div>' +
    '</div>' +

    '<div id="spList" class="stagger"></div>';

  container.querySelector('#spAdd').addEventListener('click', () => openRecorder(null));
  container.querySelector('#spQuickRow').addEventListener('click', e => {
    const b = e.target.closest('[data-quick]');
    if (!b) return;
    const conf = QUICK_SPORTS[Number(b.dataset.quick)];
    if (conf) addEntry(conf.name, conf.minutes);
  });

  if (unsub) unsub();
  unsub = SL.on('data:sport', renderAll);

  renderAll();
  SL.bindCardSwipe?.(container);
  SL.refreshBadges?.();
}

function destroy() {
  if (unsub) { unsub(); unsub = null; }
  viewRoot = null;
}

/* ===== 私有：数据 ===== */
function getEntries() { return SL.getData('sport').entries || []; }
function todayKey() { return SL.fmt.date(new Date()); }

function weightKg() {
  const w = SL.getData('weight');
  const recs = (w && w.records) || [];
  if (recs.length) {
    const latest = recs.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))[0];
    if (latest && latest.kg > 0) return latest.kg;
  }
  if (w && w.profile && w.profile.targetKg > 0) return w.profile.targetKg;
  return 60;
}

function sportOf(name) {
  return SPORTS.find(s => s.name === name) || { name, met: 0 };
}

function findSport(name) { return SPORTS.find(s => s.name === name); }

/* ===== 顶部：今日消耗 + 本周合计 ===== */
function renderTop() {
  const el = viewRoot && viewRoot.querySelector('#spTop');
  if (!el) return;
  const entries = getEntries();
  const today = todayKey();
  const kcalToday = entries.reduce((s, r) => s + (r.date === today ? (r.kcal || 0) : 0), 0);
  // 本周：从本周第一天（周一）起
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const mondayKey = SL.fmt.date(monday);
  const kcalWeek = entries.reduce((s, r) => {
    if (r.date >= mondayKey && r.date <= today) return s + (r.kcal || 0);
    return s;
  }, 0);
  const minToday = entries.reduce((s, r) => s + (r.date === today ? (r.minutes || 0) : 0), 0);

  el.innerHTML =
    '<div class="card card--pad sport-hero">' +
    '<div class="sport-hero__label">' + SL.icon('flame', 16) + ' 今日消耗</div>' +
    '<div class="sport-hero__num"><span id="spKcalToday">' + Math.round(kcalToday) + '</span><small>千卡</small></div>' +
    '<div class="sport-hero__sub">今日运动 ' + SL.fmt.dur(minToday) + ' · 按 ' + SL.fmt.num(weightKg(), 1) + ' kg 估算</div>' +
    '</div>' +
    '<div class="card card--pad sport-week">' +
    '<div class="sport-week__label">' + SL.icon('chart', 16) + ' 本周合计</div>' +
    '<div class="sport-week__num"><span id="spKcalWeek">' + Math.round(kcalWeek) + '</span><small>千卡</small></div>' +
    '<div class="sport-week__bar"><i id="spWeekBar" style="width:' + Math.min(100, Math.round(kcalWeek / 1500 * 100)) + '%"></i></div>' +
    '<div class="sport-week__sub">目标 1500 千卡 / 周（约等于 ' + SL.fmt.num(kcalWeek / 7700, 2) + ' kg 脂肪）</div>' +
    '</div>';

  SL.animNum(el.querySelector('#spKcalToday'), Math.round(kcalToday), 500);
  SL.animNum(el.querySelector('#spKcalWeek'), Math.round(kcalWeek), 600);
}

/* ===== 快捷卡 ===== */
function renderQuick() {
  const row = viewRoot && viewRoot.querySelector('#spQuickRow');
  if (!row) return;
  const wk = weightKg();
  row.innerHTML = QUICK_SPORTS.map((q, i) => {
    const sp = sportOf(q.name);
    const kcal = calcKcal(sp, q.minutes, wk);
    return '<button class="sport-quickcard" data-quick="' + i + '">' +
      '<span class="sport-quickcard__icon">' + SL.icon(sp.icon || 'run', 20) + '</span>' +
      '<span class="sport-quickcard__name">' + SL.esc(q.name) + '</span>' +
      '<span class="sport-quickcard__meta">' + q.minutes + ' 分钟 · 约 ' + kcal + ' 千卡</span>' +
      '</button>';
  }).join('');
}

/* ===== 今日记录列表 ===== */
function renderList() {
  const el = viewRoot && viewRoot.querySelector('#spList');
  if (!el) return;
  const today = todayKey();
  const todayEntries = getEntries().filter(r => r.date === today);

  const tip = viewRoot.querySelector('#spTip');
  if (tip) tip.textContent = todayEntries.length
    ? '今天已记录 ' + todayEntries.length + ' 条运动'
    : '';

  if (!todayEntries.length) {
    el.innerHTML =
      '<div class="empty-state">' + SL.icon('run', 52) +
      '<p>今天还没有运动记录<br>散步 30 分钟也能消耗约 80 千卡，动起来吧</p>' +
      '<button class="btn btn--primary" id="spEmptyAdd">' + SL.icon('plus', 16) + ' 记录第一次运动</button></div>';
    const b = el.querySelector('#spEmptyAdd');
    if (b) b.addEventListener('click', () => openRecorder(null));
    return;
  }

  el.innerHTML =
    '<div class="card sport-day card--pad">' +
    '<div class="sport-day__head"><h3>' + SL.icon('calendar', 15) + ' 今日记录</h3>' +
    '<span class="sport-day__count">' + todayEntries.length + ' 条</span></div>' +
    '<div class="sport-day__list">' +
    todayEntries.map(e => {
      const sp = sportOf(e.type);
      return '<div class="sport-row swipeable" data-id="' + e.id + '">' +
        '<span class="sport-row__icon">' + SL.icon(sp.icon || 'run', 17) + '</span>' +
        '<div class="sport-row__main">' +
        '<div class="sport-row__name">' + SL.esc(e.type) + '</div>' +
        '<div class="sport-row__meta">' + SL.fmt.dur(e.minutes) + ' · MET ' + SL.fmt.num(sp.met || 0, 1) + '</div>' +
        '</div>' +
        '<div class="sport-row__kcal">' + Math.round(e.kcal || 0) + '<small> 千卡</small></div>' +
        '<button class="btn btn--ghost btn--sm sport-row__del" data-del="' + e.id + '" title="删除">' + SL.icon('trash', 14) + '</button>' +
        '</div>';
    }).join('') +
    '</div></div>';

  el.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
    const entry = getEntries().find(r => r.id === b.dataset.del);
    if (!entry) return;
    if (await SL.confirm('删除「' + entry.type + ' ' + SL.fmt.dur(entry.minutes) + '」这条记录？')) {
      const data = SL.getData('sport');
      data.entries = data.entries.filter(x => x.id !== entry.id);
      SL.setData('sport', data); // data:sport 事件会触发 renderAll 刷新
      SL.toast('已删除', 'info');
    }
  }));
  SL.bindCardSwipe?.(el);
}

function renderAll() {
  if (!viewRoot || !document.contains(viewRoot)) return;
  renderTop();
  renderQuick();
  renderList();
}

/* ===== 添加记录 ===== */
function addEntry(type, minutes) {
  const sp = findSport(type) || sportOf(type);
  // 时长钳制 1-600 分钟，防快捷连点/异常输入产生离谱 kcal
  const mins = Math.min(600, Math.max(1, Math.round(minutes)));
  const kcal = calcKcal(sp, mins, weightKg());
  const data = SL.getData('sport');
  data.entries.unshift({ id: SL.id(), date: todayKey(), type, minutes: mins, kcal }); // 同运动同日多条为并列记录，顶部 sum 聚合
  SL.setData('sport', data);
  SL.toast('已记录 ' + type + '，消耗约 ' + kcal + ' 千卡', 'success');
}

/* ===== 记录模态 ===== */
function openRecorder() {
  let selName = '';
  const wk = weightKg();

  const catBlocks = SPORT_CATS.map(cat => {
    const list = SPORTS.filter(s => s.cat === cat);
    return '<div class="sport-cat"><div class="sport-cat__name">' + SL.esc(cat) + '</div>' +
      '<div class="sport-chips">' +
      list.map(s => '<button type="button" class="sport-chip' + (s.name === selName ? ' is-on' : '') + '" data-sport="' + SL.esc(s.name) + '">' + SL.icon(s.icon || 'run', 14) + SL.esc(s.name) + '</button>').join('') +
      '</div></div>';
  }).join('');

  const close = SL.modal({
    title: '记录运动',
    body:
      '<div class="sport-modal">' +
      '<div class="sport-modal__scroll">' + catBlocks + '</div>' +
      '<div class="field"><label>运动时长（分钟）</label>' +
      '<input class="input" id="spMin" type="number" min="1" max="600" step="1" value="30" inputmode="numeric"></div>' +
      '<div class="sport-preview" id="spPreview">' +
      '<div class="sport-preview__label">预计消耗</div>' +
      '<div class="sport-preview__num"><span id="spPreviewKcal">0</span><small> 千卡</small></div>' +
      '<div class="sport-preview__sub" id="spPreviewSub">按体重 ' + SL.fmt.num(wk, 1) + ' kg 估算 · 先选一项运动</div>' +
      '</div></div>',
    actions: [
      { label: '取消', onClick: () => close() },
      {
        label: '确认添加', primary: true, onClick: () => {
          if (!selName) { SL.toast('请先选择一项运动', 'error'); return; }
          const minutes = Math.round(SL.parseNum(document.getElementById('spMin').value, 0));
          if (!minutes || minutes <= 0) { SL.toast('请填写有效的运动时长', 'error'); return; }
          addEntry(selName, minutes);
          close();
        }
      }
    ]
  });

  setTimeout(() => {
    const overlay = document.querySelector('.sl-modal-overlay:last-of-type');
    if (!overlay) return;
    const previewKcal = overlay.querySelector('#spPreviewKcal');
    const previewSub = overlay.querySelector('#spPreviewSub');
    const minInput = overlay.querySelector('#spMin');

    const updPreview = () => {
      const sp = findSport(selName);
      const minutes = SL.parseNum(minInput.value, 0);
      const kcal = calcKcal(sp, minutes, wk);
      previewKcal.textContent = kcal;
      previewSub.textContent = sp && sp.met
        ? 'MET ' + SL.fmt.num(sp.met, 1) + ' × ' + SL.fmt.num(wk, 1) + ' kg × ' + SL.fmt.num(minutes / 60, 2) + ' 小时'
        : '按体重 ' + SL.fmt.num(wk, 1) + ' kg 估算 · 先选一项运动';
    };

    overlay.querySelector('.sport-modal__scroll').addEventListener('click', e => {
      const chip = e.target.closest('[data-sport]');
      if (!chip) return;
      selName = chip.dataset.sport;
      overlay.querySelectorAll('.sport-chip').forEach(x => x.classList.toggle('is-on', x === chip));
      updPreview();
    });
    minInput.addEventListener('input', updPreview);
    updPreview();
  }, 60);
}

export { render, destroy, meta };
