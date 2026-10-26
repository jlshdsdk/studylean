/**
 * Module: 日历总览 (module-calendar.js)
 * Contractor: SA-17
 * Contract: ARCHITECTURE v2.0
 */
'use strict';

const meta = { id: 'calendar', title: '日历总览', icon: 'calendar', order: 19 };

let cleanup = [];
let curYear = 0, curMonth = 0;   // curMonth: 0-11
let selDate = '';                // 'YYYY-MM-DD'

/* ================= 渲染入口 ================= */
function render(container, params) {
  params = params || {};
  cleanup.forEach(fn => fn());
  cleanup = [];

  const today = new Date();
  if (!curYear) { curYear = today.getFullYear(); curMonth = today.getMonth(); }
  selDate = params.date || selDate || SL.fmt.date(today);

  container.innerHTML =
    '<div class="view-header fade-up"><h1>日历总览</h1>' +
    '<div class="view-sub">每一天的努力，都留在这里</div></div>' +

    '<div class="cal-statbar card card--pad" id="calStatBar"></div>' +

    '<div class="cal-layout">' +
    '<div class="card card--pad cal-card">' +
    '<div class="cal-nav">' +
    '<button class="btn btn--ghost btn--sm" id="calPrev" aria-label="上个月">' + SL.icon('chevronL', 16) + '</button>' +
    '<b id="calTitle"></b>' +
    '<span style="flex:1;"></span>' +
    '<button class="btn btn--ghost btn--sm" id="calToday">今天</button>' +
    '<button class="btn btn--ghost btn--sm" id="calNext" aria-label="下个月">' + SL.icon('chevronR', 16) + '</button>' +
    '</div>' +
    '<div class="cal-weekrow" id="calWeekRow"></div>' +
    '<div class="cal-grid" id="calGrid"></div>' +
    '<div class="cal-legend">' +
    calLegendDot('var(--c-green)', '打卡') +
    calLegendDot('var(--c-blue)', '专注') +
    calLegendDot('var(--c-orange)', '饮食') +
    calLegendDot('var(--c-purple)', '日记') +
    '</div>' +
    '</div>' +
    '<div class="cal-detail card card--pad" id="calDetail"></div>' +
    '</div>';

  drawAll(container);

  container.querySelector('#calPrev').addEventListener('click', () => shiftMonth(container, -1));
  container.querySelector('#calNext').addEventListener('click', () => shiftMonth(container, 1));
  container.querySelector('#calToday').addEventListener('click', () => {
    const t = new Date();
    curYear = t.getFullYear(); curMonth = t.getMonth(); selDate = SL.fmt.date(t);
    drawAll(container);
  });

  // 数据变化刷新（仅当仍在 calendar 视图）
  ['timer', 'habits', 'calories', 'diary', 'weight'].forEach(k => {
    const fn = () => rerenderScoped(container, params);
    SL.on('data:' + k, fn);
    cleanup.push(() => SL.off('data:' + k, fn));
  });

  SL.bindCardSwipe?.(container);
  SL.refreshBadges?.();
  SL.staggerIn?.(container);
}

function rerenderScoped(container, params) {
  if (location.hash.indexOf('#/calendar') !== 0) return;
  cleanup.forEach(fn => fn());
  cleanup = [];
  render(container, params);
}

function destroy() {
  cleanup.forEach(fn => fn());
  cleanup = [];
}

/* ================= 绘制 ================= */
function drawAll(container) {
  drawStatBar(container.querySelector('#calStatBar'));
  drawGrid(container);
  drawDetail(container.querySelector('#calDetail'), selDate);
}

function shiftMonth(container, dir) {
  curMonth += dir;
  if (curMonth < 0) { curMonth = 11; curYear--; }
  if (curMonth > 11) { curMonth = 0; curYear++; }
  drawAll(container);
}

function calLegendDot(color, label) {
  return '<span class="cal-legend__item"><span class="cal-legend__dot" style="background:' + color + ';"></span>' + label + '</span>';
}

/* --- 每日事件聚合 --- */
// 返回 { marks: {green,blue,orange,purple} 数量, focusMin, checkCount, kcal, diary: [entry], weight }
function dayInfo(dateKey) {
  const timerHist = Array.isArray(SL.getData('timer').history) ? SL.getData('timer').history : [];
  let focusMin = 0, hasFocus = false;
  timerHist.forEach(r => {
    if (r && r.start != null && SL.fmt.date(new Date(r.start)) === dateKey) { focusMin += r.minutes || 0; hasFocus = true; }
  });

  let checkCount = 0, hasCheck = false;
  (SL.getData('habits').items || []).forEach(h => {
    if (h && h.records && h.records[dateKey]) { checkCount++; hasCheck = true; }
  });

  let kcal = 0, hasKcal = false;
  (SL.getData('calories').entries || []).forEach(e => {
    if (e && e.date === dateKey) { kcal += e.kcal || 0; hasKcal = true; }
  });

  const diaryEntries = (SL.getData('diary').entries || []).filter(e => e && e.date === dateKey);
  const weightRec = (SL.getData('weight').records || []).find(r => r && r.date === dateKey);

  return {
    focusMin, hasFocus, checkCount, hasCheck,
    kcal: Math.round(kcal), hasKcal,
    diary: diaryEntries, weight: weightRec
  };
}

function drawStatBar(el) {
  // 本月统计：专注小时 / 打卡天数 / 日记数
  const prefix = curYear + '-' + SL.fmt.pad(curMonth + 1);
  let focusTotal = 0;
  (Array.isArray(SL.getData('timer').history) ? SL.getData('timer').history : []).forEach(r => {
    if (r && r.start != null && (SL.fmt.date(new Date(r.start)) || '').indexOf(prefix) === 0) focusTotal += r.minutes || 0;
  });

  const checkDates = {};
  (SL.getData('habits').items || []).forEach(h => {
    if (!h || !h.records) return;
    Object.keys(h.records).forEach(d => {
      if (h.records[d] && d.indexOf(prefix) === 0) checkDates[d] = true;
    });
  });

  const diaryCount = (SL.getData('diary').entries || []).filter(e => e && e.date && e.date.indexOf(prefix) === 0).length;

  el.innerHTML =
    '<div class="cal-statbar__inner">' +
    calStat(SL.icon('timer', 18), '本月专注', SL.fmt.dur(focusTotal)) +
    calStat(SL.icon('flame', 18), '打卡天数', Object.keys(checkDates).length + ' 天') +
    calStat(SL.icon('diary', 18), '日记', diaryCount + ' 篇') +
    '</div>';
}

function calStat(icon, label, value) {
  return '<div class="cal-stat"><span class="cal-stat__icon">' + icon + '</span>' +
    '<div><div class="cal-stat__value">' + SL.esc(value) + '</div>' +
    '<div class="muted" style="font-size:11.5px;">' + SL.esc(label) + '</div></div></div>';
}

function drawGrid(container) {
  const firstDay = (SL.getData('settings') || {}).firstDay === 0 ? 0 : 1; // 0=周日 1=周一
  const todayKey = SL.fmt.date(new Date());

  container.querySelector('#calTitle').textContent = curYear + ' 年 ' + (curMonth + 1) + ' 月';

  const weekLabels = firstDay === 1
    ? ['一', '二', '三', '四', '五', '六', '日']
    : ['日', '一', '二', '三', '四', '五', '六'];
  container.querySelector('#calWeekRow').innerHTML =
    weekLabels.map(w => '<span class="cal-weekrow__cell">' + w + '</span>').join('');

  const first = new Date(curYear, curMonth, 1);
  const lead = firstDay === 1 ? (first.getDay() === 0 ? 6 : first.getDay() - 1) : first.getDay();
  const gridEl = container.querySelector('#calGrid');
  let html = '';

  // 上月补位
  for (let i = 0; i < lead; i++) html += '<span class="cal-cell cal-cell--pad"></span>';

  const dim = new Date(curYear, curMonth + 1, 0).getDate();
  for (let d = 1; d <= dim; d++) {
    const key = curYear + '-' + SL.fmt.pad(curMonth + 1) + '-' + SL.fmt.pad(d);
    const info = dayInfo(key);
    const marks = [];
    if (info.hasCheck) marks.push('var(--c-green)');
    if (info.hasFocus) marks.push('var(--c-blue)');
    if (info.hasKcal) marks.push('var(--c-orange)');
    if (info.diary.length) marks.push('var(--c-purple)');
    const shown = marks.slice(0, 3);
    const extra = marks.length - shown.length;

    html +=
      '<button class="cal-cell' + (key === todayKey ? ' is-today' : '') + (key === selDate ? ' is-sel' : '') +
      '" data-date="' + key + '" title="' + key + '">' +
      '<span class="cal-cell__num">' + d + '</span>' +
      '<span class="cal-cell__dots">' +
      shown.map(c => '<span class="cal-dot" style="background:' + c + ';"></span>').join('') +
      (extra > 0 ? '<span class="cal-dot cal-dot--more">+' + extra + '</span>' : '') +
      '</span></button>';
  }

  // 下月补位（补满整周）
  const used = lead + dim;
  const trail = (7 - (used % 7)) % 7;
  for (let i = 0; i < trail; i++) html += '<span class="cal-cell cal-cell--pad"></span>';

  gridEl.innerHTML = html;
  gridEl.querySelectorAll('.cal-cell[data-date]').forEach(cell => {
    cell.addEventListener('click', () => {
      selDate = cell.dataset.date;
      gridEl.querySelectorAll('.cal-cell').forEach(c => c.classList.remove('is-sel'));
      cell.classList.add('is-sel');
      drawDetail(container.querySelector('#calDetail'), selDate);
    });
  });
}

/* --- 当日详情面板 --- */
function drawDetail(el, dateKey) {
  if (!dateKey) return;
  const info = dayInfo(dateKey);
  // 兜底：非法/残缺日期键不解析崩溃
  const d = new Date(dateKey + 'T00:00:00');
  if (isNaN(d.getTime())) return;
  const todayKey = SL.fmt.date(new Date());
  const dateLabel = (dateKey === todayKey ? '今天 · ' : '') +
    SL.fmt.pad(d.getMonth() + 1) + ' 月 ' + SL.fmt.pad(d.getDate()) + ' 日 · 周' + SL.fmt.weekday(d);

  let rows = '';

  // 专注
  rows += detailRow(SL.icon('timer', 16), '专注',
    info.hasFocus ? SL.fmt.dur(info.focusMin) : '未记录');
  // 打卡
  rows += detailRow(SL.icon('flame', 16), '打卡',
    info.hasCheck ? info.checkCount + ' 个习惯完成' : '未打卡');
  // 饮食
  rows += detailRow(SL.icon('food', 16), '摄入',
    info.hasKcal ? info.kcal + ' kcal' : '未记录');
  // 体重
  rows += detailRow(SL.icon('scale', 16), '体重',
    info.weight ? (info.weight.kg || 0) + ' kg' + (info.weight.bodyFat ? ' · 体脂 ' + info.weight.bodyFat + '%' : '') : '未记录');

  // 日记
  let diaryHtml = '';
  if (info.diary.length) {
    diaryHtml = info.diary.map(e => {
      const content = e.content || '';
      const excerpt = content.slice(0, 50) + (content.length > 50 ? '…' : '');
      return '<div class="cal-diary-item">' +
        '<div class="cal-diary-item__title">' + SL.icon('diary', 14) + ' ' + SL.esc(e.title || '无标题日记') + '</div>' +
        '<p class="cal-diary-item__excerpt">' + SL.esc(excerpt) + '</p>' +
        '<button class="btn btn--ghost btn--sm" data-read="' + e.id + '">查看全文</button>' +
        '</div>';
    }).join('');
  } else {
    diaryHtml = '<div class="muted" style="font-size:12px;">这天没有日记</div>';
  }

  const hasAny = info.hasFocus || info.hasCheck || info.hasKcal || info.diary.length || info.weight;
  el.innerHTML =
    '<div class="cal-detail__head"><b>' + SL.esc(dateLabel) + '</b></div>' +
    (hasAny
      ? '<div class="cal-detail__rows">' + rows + '</div>' +
        '<div class="cal-detail__sec">日记</div>' + diaryHtml
      : '<div class="empty-state empty-state--sm">' + SL.icon('calendar', 36) +
        '<p>这一天还没有记录<br>回到各模块记一笔，这里就会亮起来</p></div>');

  el.querySelectorAll('[data-read]').forEach(btn => {
    btn.addEventListener('click', () => {
      const ent = (SL.getData('diary').entries || []).find(x => x.id === btn.dataset.read);
      if (ent) SL.go('diary', { search: ent.title || '' });
    });
  });
}

function detailRow(icon, label, value) {
  return '<div class="cal-detail__row">' +
    '<span class="cal-detail__icon">' + icon + '</span>' +
    '<span class="cal-detail__label">' + SL.esc(label) + '</span>' +
    '<b class="cal-detail__value">' + SL.esc(value) + '</b>' +
    '</div>';
}

export { render, destroy, meta };
