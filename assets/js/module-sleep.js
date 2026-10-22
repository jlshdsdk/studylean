/**
 * Module: 睡眠记录 (module-sleep.js)
 * Contractor: SA-16
 * Contract: ARCHITECTURE v2.0
 */
'use strict';

const meta = { id: 'sleep', title: '睡眠记录', icon: 'moon', order: 10 };

let viewRoot = null, viewParams = {};

function render(container, params) {
  viewRoot = container; viewParams = params || {};
  const d = SL.getData('sleep');
  const entries = (d.entries || []).slice().sort((a, b) => b.date.localeCompare(a.date));
  const last = entries[0];

  container.innerHTML =
    '<div class="view-header fade-up"><h1>睡眠记录</h1>' +
    '<div class="view-sub">睡够 7 小时，记忆才会存盘 · 记录昨晚的休息质量</div></div>' +

    '<div class="sl-stats stagger">' +
      statCard('昨晚时长', last ? last.hours : null, 'sl-stat--last') +
      statCard('平均时长', entries.length ? avgHours(entries) : null, 'sl-stat--avg') +
      '<div class="card card--pad sl-stat">' +
        '<div class="sl-stat__label">质量分布</div>' +
        '<div class="sl-dist" id="slDist">' + (entries.length ? distHtml(entries) : '<div class="sl-dist__empty">暂无数据</div>') + '</div>' +
      '</div>' +
    '</div>' +

    '<div class="sl-grid">' +
      '<div class="card card--pad">' +
        '<div class="card-title">' + SL.icon('bed', 18) + ' 记昨晚睡眠</div>' +
        '<div class="sl-form">' +
          '<div class="sl-form__row">' +
            '<div class="field"><label>就寝时间</label><input class="input" id="slBed" type="time" value="23:30"></div>' +
            '<div class="field"><label>起床时间</label><input class="input" id="slWake" type="time" value="07:00"></div>' +
          '</div>' +
          '<div class="sl-hours-preview" id="slPreview">时长 <b>7.5</b> 小时</div>' +
          '<div class="field"><label>睡眠质量</label><div class="sl-stars" id="slStars"></div></div>' +
          '<button class="btn btn--primary btn--lg sl-save" id="slSave">' + SL.icon('moon', 18) + ' 保存记录</button>' +
        '</div>' +
      '</div>' +
      '<div class="card card--pad">' +
        '<div class="card-title">' + SL.icon('chart', 18) + ' 近 7 日时长</div>' +
        '<div class="sl-chart" id="slChart"></div>' +
        '<div class="sl-advice" id="slAdvice"></div>' +
      '</div>' +
    '</div>' +

    '<div class="card card--pad" style="margin-top:16px;">' +
      '<div class="card-title">' + SL.icon('list', 18) + ' 最近记录</div>' +
      '<div id="slList"></div>' +
    '</div>';

  // 表单状态（quality 允许 1-5，历史脏数据钳制防标签数组越界）
  let quality = Math.min(5, Math.max(1, Math.round(last ? (last.quality || 3) : 3)));
  const bedEl = container.querySelector('#slBed');
  const wakeEl = container.querySelector('#slWake');
  const starsEl = container.querySelector('#slStars');
  const previewEl = container.querySelector('#slPreview');

  const renderStars = () => {
    starsEl.innerHTML = [1, 2, 3, 4, 5].map(i =>
      '<button type="button" class="sl-star' + (i <= quality ? ' is-on' : '') + '" data-q="' + i + '" aria-label="' + i + ' 星">' +
      SL.icon('star', 26) + '</button>').join('') +
      '<span class="sl-star__text">' + ['很差', '较差', '一般', '不错', '很好'][quality - 1] + '</span>';
    starsEl.querySelectorAll('.sl-star').forEach(b =>
      b.addEventListener('click', () => { quality = parseInt(b.dataset.q, 10); renderStars(); }));
  };
  renderStars();

  const updPreview = () => {
    const h = calcHours(bedEl.value, wakeEl.value);
    if (h === null) { previewEl.innerHTML = '请选择完整时间'; return; }
    previewEl.innerHTML = '时长 <b>' + h.toFixed(1) + '</b> 小时' +
      (h < 7 ? '<span class="sl-hours-warn">（不足 7h，注意休息）</span>' : '');
  };
  bedEl.addEventListener('input', updPreview);
  wakeEl.addEventListener('input', updPreview);
  updPreview();

  // 保存
  container.querySelector('#slSave').addEventListener('click', () => {
    const today = SL.fmt.date(new Date());
    const hours = calcHours(bedEl.value, wakeEl.value);
    if (!bedEl.value || !wakeEl.value || hours === null) { SL.toast('请选择就寝和起床时间', 'error'); return; }
    if (hours < 1 || hours > 16) { SL.toast('时长 ' + hours.toFixed(1) + 'h 不合理，请检查时间', 'error'); return; }
    const data = SL.getData('sleep');
    data.entries = data.entries || [];
    const exist = data.entries.find(e => e.date === today);
    if (exist) {
      Object.assign(exist, { bedtime: bedEl.value, wake: wakeEl.value, hours, quality });
      SL.toast('已更新今天的睡眠记录', 'success');
    } else {
      data.entries.unshift({ id: SL.id(), date: today, bedtime: bedEl.value, wake: wakeEl.value, hours, quality });
      SL.toast('已记录，昨晚睡了 ' + hours.toFixed(1) + ' 小时', 'success');
    }
    SL.setData('sleep', data);
    render(viewRoot, viewParams);
  });

  if (viewRoot && document.contains(viewRoot)) renderChart();
  renderList();
  SL.bindCardSwipe?.();
  SL.refreshBadges?.();
}

function destroy() { viewRoot = null; viewParams = null; }

/* ===== 私有 ===== */
function statCard(label, hours, cls) {
  let val = '—', warn = '';
  if (typeof hours === 'number') {
    val = hours.toFixed(1) + 'h';
    warn = hours < 7 ? ' sl-stat__val--warn' : (hours >= 7 && hours <= 9 ? ' sl-stat__val--ok' : '');
  }
  return '<div class="card card--pad sl-stat ' + (cls || '') + '">' +
    '<div class="sl-stat__label">' + label + '</div>' +
    '<div class="sl-stat__val' + warn + '">' + val + '</div>' +
    (typeof hours === 'number' && hours < 7 ? '<div class="sl-stat__note">睡眠不足，白天效率会打折</div>' : '') +
    '</div>';
}

function calcHours(bed, wake) {
  if (!bed || !wake) return null;
  const [bh, bm] = bed.split(':').map(Number);
  const [wh, wm] = wake.split(':').map(Number);
  let mins = (wh * 60 + wm) - (bh * 60 + bm);
  if (mins < 0) mins += 24 * 60; // 跨天：wake < bedtime 则 +24h
  return Math.round(mins / 6) / 10; // 0.1h 精度
}

function avgHours(entries) {
  return entries.reduce((s, e) => s + (e.hours || 0), 0) / entries.length;
}

function distHtml(entries) {
  const labels = ['', '很差', '较差', '一般', '不错', '很好'];
  const colors = ['', '#EF4444', '#F59E0B', '#94A3B8', '#38BDF8', '#10B981'];
  const total = entries.length;
  return [1, 2, 3, 4, 5].map(q => {
    const n = entries.filter(e => e.quality === q).length;
    const pct = total ? Math.round(n / total * 100) : 0;
    return '<div class="sl-dist__row">' +
      '<span class="sl-dist__name">' + labels[q] + '</span>' +
      '<div class="sl-dist__track"><div class="sl-dist__fill" style="width:' + pct + '%;background:' + colors[q] + '"></div></div>' +
      '<span class="sl-dist__n">' + n + '</span></div>';
  }).join('');
}

function renderChart() {
  const el = viewRoot && viewRoot.querySelector('#slChart');
  if (!el) return;
  const entries = SL.getData('sleep').entries || [];
  const byDate = {};
  entries.forEach(e => { byDate[e.date] = e.hours; });
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(); dt.setDate(dt.getDate() - i);
    const key = SL.fmt.date(dt);
    days.push({ key, h: byDate[key], wd: '日一二三四五六'[dt.getDay()], isToday: i === 0 });
  }
  const has = days.some(x => typeof x.h === 'number');
  if (!has) {
    el.innerHTML = '<div class="sl-chart__empty">连续记录几天，这里会长出你的睡眠曲线</div>';
  } else {
    const max = Math.max(10, ...days.map(x => x.h || 0));
    el.innerHTML = days.map(x => {
      const hp = typeof x.h === 'number' ? Math.max(4, x.h / max * 82) : 0;
      const ok = typeof x.h === 'number' && x.h >= 7 && x.h <= 9;
      const warn = typeof x.h === 'number' && x.h < 7;
      return '<div class="sl-bar" title="' + x.key + (typeof x.h === 'number' ? '：' + x.h.toFixed(1) + 'h' : '：未记录') + '">' +
        '<span class="sl-bar__val">' + (typeof x.h === 'number' ? x.h.toFixed(1) : '') + '</span>' +
        '<div class="sl-bar__col' + (ok ? ' is-ok' : '') + (warn ? ' is-warn' : '') + '" style="height:' + hp + '%"></div>' +
        '<span class="sl-bar__label' + (x.isToday ? ' is-today' : '') + '">' + (x.isToday ? '今天' : x.wd) + '</span></div>';
    }).join('');
  }
  // 建议文案（entries 未必有序，取日期最新一条）
  const adv = viewRoot && viewRoot.querySelector('#slAdvice');
  if (adv) {
    const rec = entries.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
    if (!rec) {
      adv.innerHTML = adviceLine('moon', '考研人建议 23:00-24:00 之间入睡，保证 7-9 小时，记忆巩固才充分。');
    } else if (rec.hours < 7) {
      adv.innerHTML = adviceLine('zap', '昨晚只有 ' + rec.hours.toFixed(1) + 'h，今天午间可小憩 20 分钟补一补。建议今晚 23:00 前入睡。');
    } else if (rec.hours > 9) {
      adv.innerHTML = adviceLine('clock', '昨晚睡 ' + rec.hours.toFixed(1) + 'h 偏多，白天容易昏沉。保持 7-9 小时即可，别赖床哦。');
    } else {
      adv.innerHTML = adviceLine('checkCircle', '昨晚 ' + rec.hours.toFixed(1) + 'h，作息健康。继续保持 23:00-24:00 入睡的好节奏。');
    }
  }
}

function adviceLine(icon, text) {
  return '<div class="sl-advice__item">' + SL.icon(icon, 16) + '<span>' + text + '</span></div>';
}

function renderList() {
  const el = viewRoot && viewRoot.querySelector('#slList');
  if (!el) return;
  const entries = (SL.getData('sleep').entries || []).slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14);
  if (!entries.length) {
    el.innerHTML = '<div class="empty-state">' + SL.icon('moon', 52) +
      '<p>还没有睡眠记录<br>用左侧表单记下昨晚的入睡和起床时间</p>' +
      '<button class="btn btn--primary" id="slFirstBtn">记第一晚</button></div>';
    el.querySelector('#slFirstBtn')?.addEventListener('click', () => {
      viewRoot && viewRoot.querySelector('#slBed')?.focus();
    });
    return;
  }
  el.innerHTML = entries.map(e => {
    const warn = e.hours < 7;
    return '<div class="sl-item">' +
      '<span class="sl-item__date">' + SL.esc(e.date) + ' ' + SL.esc(SL.fmt.weekday(new Date(e.date))) + '</span>' +
      '<span class="sl-item__time">' + SL.icon('moon', 14) + SL.esc(e.bedtime) + ' → ' + SL.icon('sun', 14) + SL.esc(e.wake) + '</span>' +
      '<span class="sl-item__hours' + (warn ? ' sl-item__hours--warn' : '') + '">' + (e.hours || 0).toFixed(1) + 'h</span>' +
      '<span class="sl-item__stars">' + starsMini(e.quality) + '</span>' +
      '<button class="btn btn--ghost btn--sm sl-item__del" data-sldel="' + e.id + '" aria-label="删除">' + SL.icon('trash', 14) + '</button>' +
      '</div>';
  }).join('');
  el.querySelectorAll('[data-sldel]').forEach(b => b.addEventListener('click', async () => {
    const d = SL.getData('sleep');
    const t = d.entries.find(x => x.id === b.dataset.sldel);
    if (!t) return;
    if (await SL.confirm('删除 ' + t.date + ' 的睡眠记录？')) {
      d.entries = d.entries.filter(x => x.id !== t.id);
      SL.setData('sleep', d);
      render(viewRoot, viewParams);
      SL.toast('已删除', 'info');
    }
  }));
}

function starsMini(q) {
  let out = '';
  for (let i = 1; i <= 5; i++) {
    out += '<i class="sl-mini-star' + (i <= q ? ' is-on' : '') + '">' + SL.icon('star', 12) + '</i>';
  }
  return out;
}

export { render, destroy, meta };
