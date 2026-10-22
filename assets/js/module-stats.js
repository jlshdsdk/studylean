/**
 * Module: 数据统计 (module-stats.js)
 * Contractor: SA-17
 * Contract: ARCHITECTURE v2.0
 */
'use strict';

const meta = { id: 'stats', title: '数据统计', icon: 'chart', order: 18 };

let cleanup = [];

/* ================= 渲染入口 ================= */
function render(container, params) {
  params = params || {};
  cleanup.forEach(fn => fn());
  cleanup = [];

  const firstDay = (SL.getData('settings') || {}).firstDay === 0 ? 0 : 1; // 0=周日 1=周一
  const reportMode = params.mode === 'month' ? 'month' : 'week';

  container.innerHTML =
    '<div class="view-header fade-up"><h1>数据统计</h1>' +
    '<div class="view-sub">把每一分钟的专注，都变成看得见的曲线</div></div>' +

    '<div class="stats-toolbar">' +
    '<div class="seg" id="stSeg">' +
    '<button class="seg__btn' + (reportMode === 'week' ? ' is-on' : '') + '" data-mode="week">本周</button>' +
    '<button class="seg__btn' + (reportMode === 'month' ? ' is-on' : '') + '" data-mode="month">本月</button>' +
    '</div>' +
    '<span style="flex:1;"></span>' +
    '<button class="btn btn--ghost btn--sm" id="stExport">' + SL.icon('download', 15) + ' 导出数据</button>' +
    '</div>' +

    '<div id="stReportCard"></div>' +
    '<div class="card card--pad stats-card" id="stHeatCard">' +
    '<div class="stats-card__head"><span class="stats-card__icon">' + SL.icon('grid', 18) + '</span>' +
    '<b>学习热力图</b><span class="muted" style="font-size:11.5px;">近 26 周 · 颜色越深专注越久</span></div>' +
    '<div id="stHeat"></div>' +
    '<div class="stats-heat-legend"><span class="muted" style="font-size:11px;">少</span>' +
    '<span class="heat-cell heat-lv0"></span><span class="heat-cell heat-lv1"></span><span class="heat-cell heat-lv2"></span><span class="heat-cell heat-lv3"></span>' +
    '<span class="muted" style="font-size:11px;">多</span></div>' +
    '</div>' +

    '<div class="stats-grid2">' +
    '<div class="card card--pad stats-card" id="stKcalCard">' +
    '<div class="stats-card__head"><span class="stats-card__icon">' + SL.icon('food', 18) + '</span><b>卡路里 14 日趋势</b></div>' +
    '<div id="stKcal"></div></div>' +
    '<div class="card card--pad stats-card" id="stWeightCard">' +
    '<div class="stats-card__head"><span class="stats-card__icon">' + SL.icon('scale', 18) + '</span><b>体重趋势</b></div>' +
    '<div id="stWeight"></div></div>' +
    '</div>' +

    '<div class="stats-grid2">' +
    '<div class="card card--pad stats-card" id="stRingCard">' +
    '<div class="stats-card__head"><span class="stats-card__icon">' + SL.icon('checkCircle', 18) + '</span><b>本周打卡完成率</b></div>' +
    '<div id="stRing"></div></div>' +
    '</div>';

  renderReport(container.querySelector('#stReportCard'), reportMode);
  renderHeat(container.querySelector('#stHeat'), firstDay);
  renderKcalLine(container.querySelector('#stKcal'));
  renderWeightLine(container.querySelector('#stWeight'));
  renderHabitRing(container.querySelector('#stRing'));

  // 周期切换
  container.querySelectorAll('#stSeg .seg__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('is-on')) return;
      render(container, { mode: btn.dataset.mode });
    });
  });

  // 导出 → 跳转设置页数据管理区
  container.querySelector('#stExport').addEventListener('click', () => {
    SL.go('settings', { sec: 'data' });
  });

  // 跨模块跳转聚焦：SL.go('stats') 后 SL.emit('stats:focus', {chart:'heat'|'kcal'|'weight'|'ring'})
  const onStatsFocus = payload => {
    const target = (payload && payload.chart) || (params && params.chart) || '';
    const map = { heat: '#stHeatCard', kcal: '#stKcalCard', weight: '#stWeightCard', ring: '#stRingCard', report: '#stReportCard' };
    const sel = map[target];
    if (!sel) return;
    const card = container.querySelector(sel);
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('is-focus');
    setTimeout(() => card.classList.remove('is-focus'), 1600);
  };
  const onStatsFocusEvent = payload => onStatsFocus(payload);
  SL.on('stats:focus', onStatsFocusEvent);
  if (params.chart) onStatsFocus(params.chart);

  // 数据变化局部刷新（仅当仍在 stats 视图）
  const dataKeys = ['timer', 'calories', 'weight', 'habits', 'diary', 'sport', 'water'];
  dataKeys.forEach(k => {
    const fn = () => rerenderScoped(container, params);
    SL.on('data:' + k, fn);
    cleanup.push(() => SL.off('data:' + k, fn));
  });
  cleanup.push(() => SL.off('stats:focus', onStatsFocusEvent));

  SL.bindCardSwipe?.(container);
  SL.refreshBadges?.();
  SL.staggerIn?.(container);
}

function rerenderScoped(container, params) {
  if (location.hash.indexOf('#/stats') !== 0) return;
  cleanup.forEach(fn => fn());
  cleanup = [];
  render(container, params);
}

function destroy() {
  cleanup.forEach(fn => fn());
  cleanup = [];
}

/* ================= 周期汇总卡 ================= */
function periodRange(mode) {
  const today = new Date();
  let start, end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
  if (mode === 'month') {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
  } else {
    // 周起始跟随设置 firstDay（1=周一 0=周日），与日历/热力图一致
    const firstDay = (SL.getData('settings') || {}).firstDay === 0 ? 0 : 1;
    const dow = today.getDay(); // 0=周日
    start = new Date(today);
    start.setDate(today.getDate() - (firstDay === 1 ? (dow + 6) % 7 : dow));
  }
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function sumPeriod(mode) {
  const { start, end } = periodRange(mode);
  const sKey = SL.fmt.date(start);
  const eKey = SL.fmt.date(end);

  const timerHist = SL.getData('timer').history || [];
  const focusMin = timerHist.reduce((s, r) => {
    const k = SL.fmt.date(new Date(r.start));
    return (k >= sKey && k <= eKey) ? s + (r.minutes || 0) : s;
  }, 0);
  const pomodoros = timerHist.reduce((s, r) => {
    const k = SL.fmt.date(new Date(r.start));
    return (k >= sKey && k <= eKey && (r.type === 'focus' || !r.type)) ? s + 1 : s;
  }, 0);

  // 打卡天数：当天至少 1 个习惯打卡
  const habitItems = SL.getData('habits').items || [];
  const checkDates = {};
  habitItems.forEach(h => {
    Object.keys(h.records || {}).forEach(d => { if (h.records[d]) checkDates[d] = true; });
  });
  const checkDays = Object.keys(checkDates).filter(d => d >= sKey && d <= eKey).length;

  const diaryCount = (SL.getData('diary').entries || []).filter(e => e.date >= sKey && e.date <= eKey).length;

  const calEntries = SL.getData('calories').entries || [];
  const kcalByDate = {};
  calEntries.forEach(e => {
    if (e.date >= sKey && e.date <= eKey) kcalByDate[e.date] = (kcalByDate[e.date] || 0) + (e.kcal || 0);
  });
  const kcalDays = Object.keys(kcalByDate);
  const kcalAvg = kcalDays.length ? Math.round(kcalDays.reduce((s, d) => s + kcalByDate[d], 0) / kcalDays.length) : 0;

  const sportEntries = SL.getData('sport').entries || [];
  const sportKcal = sportEntries.reduce((s, e) => {
    // e.date 已是 YYYY-MM-DD 本地键；经 new Date() 解析会在西时区偏移一天，直接用字符串比较
    const k = typeof e.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.date)
      ? e.date : SL.fmt.date(new Date(e.date));
    return (k >= sKey && k <= eKey) ? s + (e.kcal || 0) : s;
  }, 0);

  const waterDaily = SL.getData('water').daily || {};
  const waterGoal = SL.getData('water').goal || 2000;
  let waterOk = 0;
  Object.keys(waterDaily).forEach(d => { if (d >= sKey && d <= eKey && (waterDaily[d] || 0) >= waterGoal) waterOk++; });

  return { focusMin, pomodoros, checkDays, diaryCount, kcalAvg, sportKcal, waterOk, days: kcalDays.length || 1 };
}

function renderReport(el, mode) {
  const s = sumPeriod(mode);
  const label = mode === 'month' ? '本月' : '本周';
  el.innerHTML =
    '<div class="stats-report stagger">' +
    statCell(SL.icon('timer', 20), '专注总时长', SL.fmt.dur(s.focusMin), label) +
    statCell(SL.icon('zap', 20), '番茄数', s.pomodoros + ' 个', label) +
    statCell(SL.icon('flame', 20), '打卡天数', s.checkDays + ' 天', label) +
    statCell(SL.icon('diary', 20), '日记篇数', s.diaryCount + ' 篇', label) +
    statCell(SL.icon('food', 20), '平均摄入', s.kcalAvg ? s.kcalAvg + ' kcal' : '—', label) +
    statCell(SL.icon('run', 20), '运动消耗', s.sportKcal ? s.sportKcal + ' kcal' : '—', label) +
    statCell(SL.icon('water', 20), '饮水达标', s.waterOk + ' 天', label) +
    '</div>';
}

function statCell(icon, label, value, tag) {
  return '<div class="card card--pad stats-cell">' +
    '<div class="stats-cell__top"><span class="stats-card__icon">' + icon + '</span><span class="muted" style="font-size:11.5px;">' + tag + '</span></div>' +
    '<div class="stats-cell__value">' + SL.esc(value) + '</div>' +
    '<div class="muted" style="font-size:12px;">' + SL.esc(label) + '</div></div>';
}

/* ================= 学习热力图 ================= */
// 返回 map: {'YYYY-MM-DD': 分钟数}
function focusMinutesByDate() {
  const map = {};
  (SL.getData('timer').history || []).forEach(r => {
    const k = SL.fmt.date(new Date(r.start));
    map[k] = (map[k] || 0) + (r.minutes || 0);
  });
  return map;
}

function heatLevel(min) {
  if (!min) return 0;
  if (min < 30) return 1;
  if (min < 90) return 2;
  return 3;
}

function renderHeat(el, firstDay) {
  const map = focusMinutesByDate();
  const today = SL.fmt.date(new Date());

  // 计算起点：从本周（按 firstDay 对齐）往前推 25 周的同一起始日，共 26 列
  const now = new Date();
  const dow = now.getDay(); // 0=周日
  const weekStartOffset = firstDay === 1 ? (dow === 0 ? 6 : dow - 1) : dow;
  const anchor = new Date(now.getFullYear(), now.getMonth(), now.getDate() - weekStartOffset);
  const days = [];
  for (let w = 0; w < 26; w++) {
    for (let d = 0; d < 7; d++) {
      const dt = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - (25 - w) * 7 + d);
      days.push(dt);
    }
  }

  // 表头：列对齐（每列 7 行，月标签在每月第一列出现时显示）
  let cells = '';
  let monthSpans = [];
  let lastMonth = -1, spanStart = 0;
  days.forEach((dt, i) => {
    if (i % 7 === 0) {
      const m = dt.getMonth();
      if (m !== lastMonth) {
        if (lastMonth !== -1) monthSpans.push({ label: (lastMonth + 1) + '月', from: spanStart, to: i / 7 - 1 });
        lastMonth = m; spanStart = i / 7;
      }
    }
  });
  monthSpans.push({ label: (lastMonth + 1) + '月', from: spanStart, to: 25 });

  let headerCells = '';
  monthSpans.forEach(sp => {
    const cols = sp.to - sp.from + 1;
    // 每列实际占位 = 15px 格宽 + 3px 列间距；最后一块不含尾随 gap
    headerCells += '<span class="heat-month" style="width:' + (cols * 18 - 3) + 'px;">' + sp.label + '</span>';
  });

  let html = '<div class="stats-heat-scroll"><div class="stats-heat"><div class="heat-months">' + headerCells + '</div><div class="heat-body">';

  // 星期行标签
  const dayLabels = firstDay === 1 ? ['一', '三', '五', '日'] : ['日', '二', '四', '六'];
  html += '<div class="heat-wdlabels">';
  const wdShow = firstDay === 1 ? ['一', '', '三', '', '五', '', '日'] : ['日', '', '二', '', '四', '', '六'];
  for (let d = 0; d < 7; d++) {
    html += '<span class="heat-wdlabel">' + wdShow[d] + '</span>';
  }
  html += '</div>';

  // 列主序：heat 列使用 CSS grid-auto-flow: column
  cells = days.map(dt => {
    const k = SL.fmt.date(dt);
    const lv = heatLevel(map[k]);
    const mins = map[k] || 0;
    const cls = 'heat-cell heat-lv' + lv + (k === today ? ' is-today' : '');
    return '<span class="' + cls + '" title="' + k + ' · ' + (mins ? '专注 ' + mins + ' 分钟' : '未记录') + '"></span>';
  }).join('');

  html += '<div class="heat-grid">' + cells + '</div>';
  html += '</div></div></div>';

  const hasAny = Object.keys(map).length > 0;
  el.innerHTML = html;
  if (!hasAny) {
    el.insertAdjacentHTML('beforeend',
      '<div class="stats-empty-hint">' + SL.icon('chart', 32) + '<p>还没有专注记录<br>记录几天后这里会出现你的热力图</p></div>');
  }
}

/* ================= 折线图（纯 SVG） ================= */
function lineChartSVG(points, opts) {
  // points: [{x label, y value, raw}]，空缺 y=null 断线
  opts = opts || {};
  const W = 560, H = 220;
  const padL = 46, padR = 14, padT = 16, padB = 30;
  const iw = W - padL - padR, ih = H - padT - padB;
  const n = points.length;
  if (!n) return '<div class="empty-state empty-state--sm">' + SL.icon(opts.icon || 'chart', 36) + '<p>记录几天后这里会出现你的曲线</p></div>';

  const vals = points.map(p => p.y).filter(v => v != null);
  const hasData = vals.length > 0;
  let min = hasData ? Math.min.apply(null, vals) : 0;
  let max = hasData ? Math.max.apply(null, vals) : 1;
  if (hasData && min === max) { min = min - 1; max = max + 1; }
  const pad = (max - min) * 0.12;
  min = Math.max(0, min - pad);
  max = max + pad;
  const yOf = v => padT + ih - ((v - min) / (max - min || 1)) * ih;
  const xOf = i => padL + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);

  // 网格 + Y 轴刻度
  let g = '';
  for (let i = 0; i <= 3; i++) {
    const y = padT + (ih / 3) * i;
    const v = max - ((max - min) / 3) * i;
    g += '<line x1="' + padL + '" y1="' + y.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + y.toFixed(1) + '" class="ln-grid"/>';
    g += '<text x="' + (padL - 7) + '" y="' + (y + 4).toFixed(1) + '" class="ln-tick" text-anchor="end">' + (opts.yFmt ? opts.yFmt(v) : Math.round(v)) + '</text>';
  }

  // X 轴标签（最多 7 个）
  const step = Math.max(1, Math.ceil(n / 7));
  points.forEach((p, i) => {
    if (i % step === 0 || i === n - 1) {
      g += '<text x="' + xOf(i).toFixed(1) + '" y="' + (H - 8) + '" class="ln-tick" text-anchor="middle">' + SL.esc(p.x) + '</text>';
    }
  });

  // 折线（跳过空缺）
  let line = '', dots = '', area = '';
  if (hasData) {
    let seg = [];
    const flush = () => {
      if (seg.length > 1) {
        const ptsStr = seg.map(p => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
        line += '<polyline points="' + ptsStr + '" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>';
        if (opts.area) {
          const first = seg[0], last = seg[seg.length - 1];
          area += '<polygon points="' + first.x.toFixed(1) + ',' + (padT + ih) + ' ' + ptsStr + ' ' + last.x.toFixed(1) + ',' + (padT + ih) + '" fill="var(--accent)" opacity="0.08"/>';
        }
      }
      if (seg.length === 1) {
        dots += '<circle cx="' + seg[0].x.toFixed(1) + '" cy="' + seg[0].y.toFixed(1) + '" r="3" class="ln-dot"/>';
      }
      seg = [];
    };
    points.forEach((p, i) => {
      if (p.y == null) { flush(); return; }
      seg.push({ x: xOf(i), y: yOf(p.y) });
      dots += '<circle cx="' + xOf(i).toFixed(1) + '" cy="' + yOf(p.y).toFixed(1) + '" r="2.6" class="ln-dot"><title>' + SL.esc(p.title || p.x) + '</title></circle>';
    });
    flush();
  }

  return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="ln-svg" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' + SL.esc(opts.label || '') + '">' +
    g + area + line + dots + '</svg>' +
    (hasData ? '' : '<div class="stats-empty-hint stats-empty-hint--overlay">' + SL.icon(opts.icon || 'chart', 32) + '<p>记录几天后这里会出现你的曲线</p></div>');
}

function last14Dates() {
  const arr = [];
  const t = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() - i);
    arr.push(SL.fmt.date(d));
  }
  return arr;
}

function renderKcalLine(el) {
  const byDate = {};
  (SL.getData('calories').entries || []).forEach(e => {
    if (e.date) byDate[e.date] = (byDate[e.date] || 0) + (e.kcal || 0);
  });
  const points = last14Dates().map(k => ({
    x: Number(k.slice(8)) + '日',
    y: byDate[k] != null && byDate[k] > 0 ? Math.round(byDate[k]) : null,
    title: k + ' · ' + Math.round(byDate[k] || 0) + ' kcal'
  }));
  const anyData = Object.keys(byDate).length > 0;
  el.innerHTML = anyData
    ? lineChartSVG(points, { area: true, label: '近 14 日卡路里摄入', icon: 'food', yFmt: v => Math.round(v) })
    : '<div class="empty-state empty-state--sm">' + SL.icon('food', 36) + '<p>记录几天后这里会出现你的曲线</p></div>';
}

function renderWeightLine(el) {
  const recs = (SL.getData('weight').records || []).slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (!recs.length) {
    el.innerHTML = '<div class="empty-state empty-state--sm">' + SL.icon('scale', 36) + '<p>记录几天后这里会出现你的曲线</p></div>';
    return;
  }
  const recent = recs.slice(-30);
  const points = recent.map(r => ({
    x: (r.date || '').slice(5),
    y: parseFloat(r.kg) || 0,
    title: (r.date || '') + ' · ' + (r.kg || 0) + ' kg' + (r.bodyFat ? ' / 体脂 ' + r.bodyFat + '%' : '')
  }));
  el.innerHTML = lineChartSVG(points, { area: true, label: '体重趋势', icon: 'scale', yFmt: v => v.toFixed(1) });
}

/* ================= 打卡完成率环形图 ================= */
function renderHabitRing(el) {
  const items = SL.getData('habits').items || [];
  const { start } = periodRange('week');
  const sKey = SL.fmt.date(start);
  const todayKey = SL.fmt.date(new Date());

  // 本周计划：每个习惯 × 从周一到今天（含）的天数
  let done = 0, total = 0;
  if (items.length) {
    // 先数日期范围
    const range = [];
    const t = new Date();
    for (let d = new Date(start); d <= t; d.setDate(d.getDate() + 1)) range.push(SL.fmt.date(d));
    items.forEach(h => {
      range.forEach(k => {
        total++;
        if (h.records && h.records[k]) done++;
      });
    });
  }
  const pct = total ? Math.round(done / total * 100) : 0;

  if (!items.length) {
    el.innerHTML = '<div class="empty-state empty-state--sm">' + SL.icon('flame', 36) +
      '<p>还没有习惯<br>创建习惯后这里会显示本周完成率</p></div>';
    return;
  }

  const R = 54, C = 2 * Math.PI * R;
  const off = C * (1 - Math.min(1, pct / 100));
  el.innerHTML =
    '<div class="stats-ring-wrap">' +
    '<svg viewBox="0 0 140 140" width="150" height="150" role="img" aria-label="本周打卡完成率 ' + pct + '%">' +
    '<circle cx="70" cy="70" r="' + R + '" class="ring-bg"/>' +
    '<circle cx="70" cy="70" r="' + R + '" class="ring-fg" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 70 70)"/>' +
    '<text x="70" y="66" class="ring-num" text-anchor="middle">' + pct + '%</text>' +
    '<text x="70" y="86" class="ring-sub" text-anchor="middle">完成率</text>' +
    '</svg>' +
    '<div class="stats-ring-side">' +
    '<div class="dash-mini"><span>已完成</span><b>' + done + '</b> 次</div>' +
    '<div class="dash-mini"><span>计划中</span><b>' + total + '</b> 次</div>' +
    '<div class="muted" style="font-size:12px;margin-top:6px;">自 ' + sKey + ' 起至' + (sKey === todayKey ? '今日' : '今日') + '</div>' +
    '</div></div>';
}

export { render, destroy, meta };
