/**
 * Module: 体重管理 (module-weight.js)
 * Contractor: SA-13
 * Contract: ARCHITECTURE v2.0
 */
'use strict';

const meta = { id: 'weight', title: '体重管理', icon: 'scale', order: 13 };

let viewRoot = null, viewParams = {};

/* ===== 渲染入口 ===== */
function render(container, params) {
  viewRoot = container; viewParams = params || {};
  const data = SL.getData('weight');
  const records = (data.records || []).slice().sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  const profile = data.profile || {};

  container.innerHTML =
    '<div class="view-header fade-up"><h1>体重管理</h1>' +
    '<div class="view-sub">记录每一次变化，看见坚持的形状 · 每次记录 +2 自律币</div></div>' +

    '<div class="wt-toolbar">' +
    '<button class="btn btn--primary" id="wtAdd">' + SL.icon('plus', 16) + ' 记录体重</button>' +
    '<button class="btn btn--ghost" id="wtProfile">' + SL.icon('user', 16) + ' 个人资料</button>' +
    '</div>' +

    '<div class="wt-cards stagger">' +
    '<div class="card card--pad wt-card" id="wtCur"></div>' +
    '<div class="card card--pad wt-card" id="wtBmi"></div>' +
    '<div class="card card--pad wt-card" id="wtBf"></div>' +
    '<div class="card card--pad wt-card" id="wtGoal"></div>' +
    '</div>' +

    '<div class="card card--pad wt-chart-card" id="wtChartWrap"></div>' +

    '<div class="wt-bottom">' +
    '<div class="card card--pad" id="wtProfileCard"></div>' +
    '<div class="card card--pad" id="wtList"></div>' +
    '</div>';

  renderStatCards(records, profile);
  renderChart(records, profile);
  renderProfileCard(profile, records);
  renderList();

  container.querySelector('#wtAdd').addEventListener('click', ev => openRecordModal(ev.currentTarget));
  container.querySelector('#wtProfile').addEventListener('click', () => openProfileModal());
  container.querySelector('#wtList').addEventListener('click', onListClick);

  SL.bindCardSwipe?.();
  SL.refreshBadges?.();
}

function destroy() {}

/* ===== 数据与计算 ===== */
function getRecords() {
  return (SL.getData('weight').records || []).slice()
    .sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
}

function calcBmi(kg, heightCm) {
  const h = (heightCm || 170) / 100;
  if (!kg || !isFinite(h) || h <= 0) return null;
  return kg / (h * h);
}

function bmiClass(bmi) {
  if (bmi == null) return '';
  if (bmi < 18.5) return 'wt-tag--thin';
  if (bmi < 24) return 'wt-tag--normal';
  if (bmi < 28) return 'wt-tag--over';
  return 'wt-tag--obese';
}

function bmiLabel(bmi) {
  if (bmi == null) return '—';
  if (bmi < 18.5) return '偏瘦';
  if (bmi < 24) return '正常';
  if (bmi < 28) return '超重';
  return '肥胖';
}

// Deurenberg 公式估体脂率
function estimateBf(bmi, profile) {
  if (bmi == null) return null;
  const age = profile.age || 22;
  const sexMale = (profile.gender || 'male') === 'male' ? 1 : 0;
  return 1.2 * bmi + 0.23 * age - 10.8 * sexMale - 5.4;
}

// Mifflin-St Jeor BMR
function calcBmr(kg, profile) {
  const h = profile.heightCm || 170, age = profile.age || 22;
  const base = 10 * (kg || 65) + 6.25 * h - 5 * age;
  return Math.round((profile.gender || 'male') === 'male' ? base + 5 : base - 161);
}

const ACTIVITY_LABELS = { 1.2: '久坐', 1.375: '轻度', 1.55: '中度', 1.725: '高度' };

/* ===== 顶部统计卡 ===== */
function renderStatCards(records, profile) {
  const curEl = document.getElementById('wtCur');
  const bmiEl = document.getElementById('wtBmi');
  const bfEl = document.getElementById('wtBf');
  const goalEl = document.getElementById('wtGoal');
  if (!curEl || !bmiEl || !bfEl || !goalEl) return;

  if (!records.length) {
    curEl.innerHTML = '<div class="wt-stat"><div class="wt-stat__label">当前体重</div>' +
      '<div class="wt-stat__num">--<small> kg</small></div>' +
      '<div class="wt-stat__sub muted">还没有记录，先称一次吧</div></div>';
  } else {
    const cur = records[records.length - 1];
    const prev = records.length > 1 ? records[records.length - 2] : null;
    const diff = prev ? +(cur.kg - prev.kg).toFixed(1) : 0;
    const arrow = diff > 0 ? '<span class="wt-delta wt-delta--up">▲ +' + diff.toFixed(1) + '</span>'
      : diff < 0 ? '<span class="wt-delta wt-delta--down">▼ ' + diff.toFixed(1) + '</span>'
      : '<span class="wt-delta">— 持平</span>';
    curEl.innerHTML = '<div class="wt-stat"><div class="wt-stat__label">当前体重</div>' +
      '<div class="wt-stat__num" id="wtCurNum">0<small> kg</small></div>' +
      '<div class="wt-stat__sub">' + arrow + ' <span class="muted">较上次 · ' + SL.esc(cur.date) + '</span></div></div>';
    SL.animNum(document.getElementById('wtCurNum'), cur.kg);
  }

  const curKg = records.length ? records[records.length - 1].kg : null;
  const bmi = calcBmi(curKg, profile.heightCm);
  bmiEl.innerHTML = '<div class="wt-stat"><div class="wt-stat__label">BMI 指数</div>' +
    '<div class="wt-stat__num">' + (bmi != null ? bmi.toFixed(1) : '--') + '</div>' +
    (bmi != null ? '<div class="wt-stat__sub"><span class="wt-tag ' + bmiClass(bmi) + '">' + bmiLabel(bmi) + '</span></div>' : '<div class="wt-stat__sub muted">先完善身高资料</div>') +
    '</div>';

  const recBf = records.length ? records[records.length - 1].bodyFat : null;
  // 体脂实测值须为 3-70 的有限数字，脏数据/null 一律走 BMI 估算或 '--'
  const bfValid = recBf != null && isFinite(recBf) && recBf >= 3 && recBf <= 70;
  const bfVal = bfValid ? recBf : estimateBf(bmi, profile);
  bfEl.innerHTML = '<div class="wt-stat"><div class="wt-stat__label">体脂率</div>' +
    '<div class="wt-stat__num">' + (bfVal != null ? bfVal.toFixed(1) + '<small> %</small>' : '--') + '</div>' +
    '<div class="wt-stat__sub muted">' + (bfValid ? '来自最近一次实测' : '按 BMI 估算，可实测校准') + '</div></div>';

  const target = profile.targetKg || 65;
  if (curKg == null) {
    goalEl.innerHTML = '<div class="wt-stat"><div class="wt-stat__label">距目标</div>' +
      '<div class="wt-stat__num">--<small> kg</small></div>' +
      '<div class="wt-stat__sub muted">目标 ' + SL.esc(String(target)) + ' kg</div></div>';
  } else {
    const gap = +(curKg - target).toFixed(1);
    const done = gap <= 0;
    goalEl.innerHTML = '<div class="wt-stat"><div class="wt-stat__label">距目标</div>' +
      '<div class="wt-stat__num' + (done ? ' wt-stat__num--hit' : '') + '">' + (done ? '达成!' : Math.abs(gap).toFixed(1) + '<small> kg</small>') + '</div>' +
      '<div class="wt-stat__sub muted">' + (done ? '目标 ' + SL.esc(String(target)) + ' kg，太棒了' : (gap > 0 ? '还需减 ' + Math.abs(gap).toFixed(1) + ' kg 到目标' : '低于目标 ' + Math.abs(gap).toFixed(1) + ' kg')) + '</div></div>';
  }
}

/* ===== SVG 折线图 ===== */
function renderChart(records, profile) {
  const wrap = document.getElementById('wtChartWrap');
  if (!wrap) return;

  if (records.length < 1) {
    wrap.innerHTML =
      '<div class="empty-state">' + SL.icon('chart', 52) +
      '<p>还没有体重数据<br>记录第一次体重，开始绘制你的曲线</p>' +
      '<button class="btn btn--primary" id="wtChartEmptyCta">' + SL.icon('plus', 16) + ' 记录第一次体重</button></div>';
    wrap.querySelector('#wtChartEmptyCta').addEventListener('click', () => openRecordModal(wrap.querySelector('#wtChartEmptyCta')));
    return;
  }

  // 最近 30 条
  const pts = records.slice(-30);
  const target = profile.targetKg || 65;
  const W = 640, H = 240, PL = 44, PR = 14, PT = 18, PB = 30;
  const kgs = pts.map(r => r.kg).concat([target]);
  let min = Math.min.apply(null, kgs), max = Math.max.apply(null, kgs);
  const padY = Math.max((max - min) * 0.15, 0.8);
  min -= padY; max += padY;
  const xAt = i => PL + (i / Math.max(pts.length - 1, 1)) * (W - PL - PR);
  const yAt = v => PT + (1 - (v - min) / (max - min)) * (H - PT - PB);

  const line = pts.map((r, i) => xAt(i).toFixed(1) + ',' + yAt(r.kg).toFixed(1)).join(' ');
  // 仅 2 点及以上画面积/折线；单点画会得到退化竖线伪影
  const area = pts.length >= 2
    ? ' points="' + line + ' ' + xAt(pts.length - 1).toFixed(1) + ',' + (H - PB) + ' ' + xAt(0).toFixed(1) + ',' + (H - PB) + '"'
    : '';

  let gridY = '';
  for (let g = 0; g <= 3; g++) {
    const v = min + (max - min) * (g / 3);
    const y = yAt(v).toFixed(1);
    gridY += '<line x1="' + PL + '" y1="' + y + '" x2="' + (W - PR) + '" y2="' + y + '" class="wt-chart-grid"/>' +
      '<text x="' + (PL - 7) + '" y="' + y + '" class="wt-chart-ylabel">' + v.toFixed(1) + '</text>';
  }

  const dots = pts.map((r, i) =>
    '<circle class="wt-chart-dot" cx="' + xAt(i).toFixed(1) + '" cy="' + yAt(r.kg).toFixed(1) + '" r="3.5">' +
    '<title>' + SL.esc(r.date) + '：' + r.kg + ' kg' + (r.bodyFat != null && r.bodyFat !== '' ? ' · 体脂 ' + r.bodyFat + '%' : '') + '</title></circle>'
  ).join('');

  const xLabels = pts.length > 1
    ? '<text x="' + xAt(0).toFixed(1) + '" y="' + (H - 8) + '" class="wt-chart-xlabel">' + SL.esc(pts[0].date.slice(5)) + '</text>' +
      '<text x="' + xAt(pts.length - 1).toFixed(1) + '" y="' + (H - 8) + '" class="wt-chart-xlabel" text-anchor="end">' + SL.esc(pts[pts.length - 1].date.slice(5)) + '</text>'
    : '<text x="' + xAt(0).toFixed(1) + '" y="' + (H - 8) + '" class="wt-chart-xlabel">' + SL.esc(pts[0].date) + '</text>';

  const ty = yAt(target).toFixed(1);
  wrap.innerHTML =
    '<div class="wt-chart-head"><h3>' + SL.icon('chart', 18) + ' 体重趋势</h3>' +
    '<span class="muted" style="font-size:11.5px;">最近 ' + pts.length + ' 条记录 · 虚线为目标 ' + SL.esc(String(target)) + ' kg</span></div>' +
    '<svg class="wt-chart" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="体重趋势折线图">' +
    gridY +
    (pts.length >= 2 ? '<polygon' + area + ' class="wt-chart-area"/>' : '') +
    '<line x1="' + PL + '" y1="' + ty + '" x2="' + (W - PR) + '" y2="' + ty + '" class="wt-chart-target"/>' +
    '<text x="' + (W - PR) + '" y="' + (parseFloat(ty) - 5) + '" class="wt-chart-target-label" text-anchor="end">目标 ' + target + '</text>' +
    (pts.length >= 2 ? '<polyline points="' + line + '" class="wt-chart-line"/>' : '') +
    dots + xLabels +
    '</svg>';
}

/* ===== 个人资料卡 ===== */
function renderProfileCard(profile, records) {
  const el = document.getElementById('wtProfileCard');
  if (!el) return;
  const curKg = records.length ? records[records.length - 1].kg : null;
  const bmr = calcBmr(curKg, profile);
  const tdee = Math.round(bmr * (profile.activity || 1.375));
  el.innerHTML =
    '<h3 class="wt-panel-title">' + SL.icon('user', 18) + ' 个人资料</h3>' +
    '<div class="wt-profile-grid">' +
    '<div><span class="muted">身高</span><b>' + SL.esc(String(profile.heightCm || '--')) + ' cm</b></div>' +
    '<div><span class="muted">性别</span><b>' + ((profile.gender || 'male') === 'male' ? '男' : '女') + '</b></div>' +
    '<div><span class="muted">年龄</span><b>' + SL.esc(String(profile.age || '--')) + ' 岁</b></div>' +
    '<div><span class="muted">活动系数</span><b>' + SL.esc(ACTIVITY_LABELS[profile.activity] || '轻度') + '</b></div>' +
    '<div><span class="muted">目标体重</span><b>' + SL.esc(String(profile.targetKg || '--')) + ' kg</b></div>' +
    '<div><button class="btn btn--ghost btn--sm" id="wtProfileEdit">' + SL.icon('edit', 14) + ' 编辑</button></div>' +
    '</div>' +
    '<div class="wt-bmr-row">' +
    '<div class="wt-bmr-cell"><span>BMR 基础代谢</span><b>' + bmr + ' <small>kcal/天</small></b></div>' +
    '<div class="wt-bmr-cell"><span>TDEE 每日消耗</span><b>' + tdee + ' <small>kcal/天</small></b></div>' +
    '</div>' +
    '<div class="muted" style="font-size:11px;margin-top:6px;">Mifflin-St Jeor 公式估算 · TDEE = BMR × 活动系数，可配合卡路里模块参考</div>';
  el.querySelector('#wtProfileEdit').addEventListener('click', () => openProfileModal());
}

/* ===== 记录列表 ===== */
function renderList() {
  const el = document.getElementById('wtList');
  if (!el) return;
  const records = getRecords().slice().reverse(); // 日期倒序
  if (!records.length) {
    el.innerHTML = '<div class="empty-state">' + SL.icon('scale', 52) +
      '<p>还没有体重记录<br>每次记录 +2 自律币</p></div>';
    return;
  }
  el.innerHTML = '<h3 class="wt-panel-title">' + SL.icon('scale', 18) + ' 记录历史 <span class="muted" style="font-weight:400;font-size:12px;">' + records.length + ' 条</span></h3>' +
    '<div class="wt-records">' +
    records.map(r => {
      return '<div class="wt-record" data-id="' + SL.esc(r.id) + '">' +
        '<span class="wt-record__date">' + SL.icon('calendar', 14) + ' ' + SL.esc(r.date) + '</span>' +
        '<b class="wt-record__kg">' + r.kg + ' <small>kg</small></b>' +
        '<span class="muted">' + (r.bodyFat != null && r.bodyFat !== '' ? '体脂 ' + SL.esc(String(r.bodyFat)) + '%' : '—') + '</span>' +
        '<button class="btn btn--ghost btn--sm wt-record__del" data-del="' + SL.esc(r.id) + '" title="删除">' + SL.icon('trash', 14) + '</button>' +
        '</div>';
    }).join('') +
    '</div>';
}

function onListClick(ev) {
  const btn = ev.target.closest('[data-del]');
  if (!btn) return;
  const id = btn.dataset.del;
  (async () => {
    const rec = getRecords().find(r => r.id === id);
    if (!rec) return;
    if (!(await SL.confirm('删除 ' + rec.date + ' 的体重记录（' + rec.kg + ' kg）？'))) return;
    const d = SL.getData('weight');
    d.records = (d.records || []).filter(r => r.id !== id);
    SL.setData('weight', d);
    SL.toast('已删除该记录', 'info');
    rerender();
  })();
}

/* ===== 记录模态 ===== */
function openRecordModal(triggerEl) {
  const today = SL.fmt.date(new Date());
  const close = SL.modal({
    title: '记录体重',
    body:
      '<div class="field"><label>体重 (kg)</label><input class="input" id="wtKg" type="number" step="0.1" min="20" max="300" placeholder="例如 65.5" autofocus></div>' +
      '<div class="field"><label>体脂率 (%) · 可选</label><input class="input" id="wtBfInput" type="number" step="0.1" min="3" max="70" placeholder="有体脂秤就填，没有可留空"></div>' +
      '<div class="field"><label>日期</label><input class="input" id="wtDate" type="date" value="' + today + '"></div>',
    actions: [
      { label: '取消', onClick: () => close() },
      { label: '保存记录', primary: true, onClick: () => {
          const kg = SL.parseNum(document.getElementById('wtKg').value, NaN);
          if (!kg || kg < 20 || kg > 300) { SL.toast('请输入有效体重（20-300 kg）', 'error'); return; }
          if (!isFinite(kg)) { SL.toast('请输入有效体重（20-300 kg）', 'error'); return; }
          const bfRaw = document.getElementById('wtBfInput').value.trim();
          const bf = bfRaw === '' ? null : SL.parseNum(bfRaw, NaN);
          if (bf != null && (isNaN(bf) || bf < 3 || bf > 70)) { SL.toast('体脂率需在 3-70 之间', 'error'); return; }
          const date = document.getElementById('wtDate').value || today;
          const d = SL.getData('weight');
          d.records = d.records || [];
          d.records.push({ id: SL.id(), date, kg: +kg.toFixed(1), bodyFat: bf != null ? +bf.toFixed(1) : null });
          SL.setData('weight', d);
          close();
          SL.earnCoin('记录体重', 2);
          const rect = triggerEl ? triggerEl.getBoundingClientRect() : null;
          SL.confetti(rect ? rect.left + rect.width / 2 : window.innerWidth / 2, rect ? rect.top + rect.height / 2 : window.innerHeight / 2);
          SL.toast('已记录 ' + kg.toFixed(1) + ' kg，+2 自律币', 'success');
          checkMilestones(d.records);
          rerender();
        } }
    ]
  });
}

/* ===== 减重里程碑：距起始体重每累计 -1/-5/-10kg 祝贺一次 ===== */
function checkMilestones(records) {
  const sorted = records.slice().sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  if (sorted.length < 2) return;
  const startKg = sorted[0].kg;
  const curKg = sorted[sorted.length - 1].kg;
  const prevKgs = sorted.slice(0, -1).map(r => r.kg);
  const prevBestLoss = startKg - Math.min.apply(null, prevKgs);
  const curLoss = startKg - curKg;
  [1, 5, 10].forEach(m => {
    if (curLoss >= m && prevBestLoss < m) {
      SL.toast('里程碑达成！距起始体重已减 ' + m + ' kg，继续加油！', 'success');
    }
  });
}

/* ===== 个人资料编辑模态 ===== */
function openProfileModal() {
  const p = (SL.getData('weight').profile) || {};
  const close = SL.modal({
    title: '个人资料',
    body:
      '<div class="wt-form-grid">' +
      '<div class="field"><label>身高 (cm)</label><input class="input" id="wtPH" type="number" step="1" min="100" max="250" value="' + SL.esc(String(p.heightCm || 170)) + '"></div>' +
      '<div class="field"><label>目标体重 (kg)</label><input class="input" id="wtPT" type="number" step="0.1" min="30" max="200" value="' + SL.esc(String(p.targetKg || 65)) + '"></div>' +
      '</div>' +
      '<div class="wt-form-grid">' +
      '<div class="field"><label>性别</label><select class="input" id="wtPG">' +
      '<option value="male"' + ((p.gender || 'male') === 'male' ? ' selected' : '') + '>男</option>' +
      '<option value="female"' + (p.gender === 'female' ? ' selected' : '') + '>女</option>' +
      '</select></div>' +
      '<div class="field"><label>年龄</label><input class="input" id="wtPA" type="number" step="1" min="10" max="100" value="' + SL.esc(String(p.age || 22)) + '"></div>' +
      '</div>' +
      '<div class="field"><label>活动系数</label><select class="input" id="wtPAct">' +
      [1.2, 1.375, 1.55, 1.725].map(a =>
        '<option value="' + a + '"' + (p.activity === a ? ' selected' : '') + '>' + a + ' · ' + ACTIVITY_LABELS[a] + '</option>'
      ).join('') +
      '</select></div>',
    actions: [
      { label: '取消', onClick: () => close() },
      { label: '保存', primary: true, onClick: () => {
          const heightCm = SL.parseNum(document.getElementById('wtPH').value, 170);
          const targetKg = SL.parseNum(document.getElementById('wtPT').value, 65);
          const age = SL.parseNum(document.getElementById('wtPA').value, 22);
          if (heightCm < 100 || heightCm > 250) { SL.toast('身高需在 100-250 cm 之间', 'error'); return; }
          if (targetKg < 30 || targetKg > 200) { SL.toast('目标体重需在 30-200 kg 之间', 'error'); return; }
          if (age < 10 || age > 100) { SL.toast('年龄需在 10-100 之间', 'error'); return; }
          const d = SL.getData('weight');
          d.profile = {
            heightCm,
            targetKg: +targetKg.toFixed(1),
            gender: document.getElementById('wtPG').value,
            age: Math.round(age),
            activity: parseFloat(document.getElementById('wtPAct').value) || 1.375
          };
          SL.setData('weight', d);
          close();
          SL.toast('资料已保存', 'success');
          rerender();
        } }
    ]
  });
}

/* ===== 重渲染 ===== */
function rerender() {
  if (viewRoot && document.getElementById('wtCur')) render(viewRoot, viewParams);
}

export { render, destroy, meta };
