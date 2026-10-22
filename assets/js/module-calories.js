/**
 * Module: 卡路里 (module-calories.js)
 * Contractor: SA-12
 * Contract: ARCHITECTURE v2.0
 */
'use strict';

const meta = { id: 'calories', title: '卡路里', icon: 'food', order: 7 };

let viewRoot = null, viewParams = {};

const MEALS = [
  { key: 'breakfast', label: '早餐', icon: 'coffee' },
  { key: 'lunch', label: '午餐', icon: 'food' },
  { key: 'dinner', label: '晚餐', icon: 'food' },
  { key: 'snack', label: '加餐', icon: 'sparkles' }
];

const MACROS = [
  { key: 'protein', label: '蛋白质', pct: 0.25, per: 4, color: '#10B981' },
  { key: 'carb', label: '碳水', pct: 0.45, per: 4, color: 'var(--accent)' },
  { key: 'fat', label: '脂肪', pct: 0.30, per: 9, color: '#F59E0B' }
];

const HEALTH_COLORS = { green: '#10B981', yellow: '#F59E0B', red: '#EF4444' };

/* ===== 私有工具 ===== */
function num(v, def) {
  const n = parseFloat(v);
  return isNaN(n) ? (def || 0) : n;
}
function todayKey() { return SL.fmt.date(new Date()); }
function getCal() { return SL.getData('calories'); }
function entriesOn(date) {
  return (getCal().entries || []).filter(e => e.date === date);
}
function sumOn(date, field) {
  return entriesOn(date).reduce((s, e) => s + (num(e[field || 'kcal'])), 0);
}
function last7Values() {
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(Math.round(sumOn(SL.fmt.date(d), 'kcal')));
  }
  return out;
}
/* 预算 = 10×体重 + 6.25×身高 - 5×年龄 + (男5 / 女-161)，× 活动系数 - 300 */
function budgetKcal() {
  const w = SL.getData('weight') || {};
  const p = w.profile || {};
  const recs = (w.records || []).slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  // 契约统一：体重取最新记录 kg，无记录兜底 65（与 dashboard kcalBudget 一致）
  const kg = recs.length ? num(recs[recs.length - 1].kg) : 65;
  const h = num(p.heightCm, 170), age = num(p.age, 22);
  const genderFix = p.gender === 'female' ? -161 : 5;
  const act = num(p.activity, 1.375) || 1.375;
  const bmr = 10 * kg + 6.25 * h - 5 * age + genderFix;
  return Math.max(800, Math.round(bmr * act - 300));
}
function macroTargets(budget) {
  const t = {};
  MACROS.forEach(m => { t[m.key] = Math.round(budget * m.pct / m.per); });
  return t;
}

/* foods.js 容错加载（SA-04 可能未交付，失败不阻塞自定义录入） */
let foodsCache = null, foodsFailed = false;
async function loadFoods() {
  if (foodsCache) return foodsCache;
  if (foodsFailed) return [];
  try {
    const mod = await import('./data/foods.js');
    const raw = mod.FOODS || (mod.default && mod.default.FOODS) || (Array.isArray(mod.default) ? mod.default : []);
    foodsCache = raw.map(normFood);
    return foodsCache;
  } catch (err) {
    foodsFailed = true;
    return [];
  }
}
function normFood(f) {
  return {
    name: f.name || f.foodName || f.title || '未知食物',
    kcal: num(f.kcal !== undefined ? f.kcal : (f.calories !== undefined ? f.calories : f.kcal100)),
    protein: num(f.protein !== undefined ? f.protein : f.protein100),
    carb: num(f.carb !== undefined ? f.carb : (f.carbs !== undefined ? f.carbs : f.carbohydrate)),
    fat: num(f.fat !== undefined ? f.fat : f.fat100),
    tag: f.tag || f.category || f.cat || '',
    health: f.health || f.level || '',
    unit: num(f.unitGram !== undefined ? f.unitGram : (f.defaultGram !== undefined ? f.defaultGram : (typeof f.unit === 'number' ? f.unit : undefined)), 0) || 100
  };
}
function allCustomFoods() {
  return (getCal().customFoods || []).map(f => Object.assign(normFood(f), { custom: true }));
}
function healthDot(f) {
  // foods.js 契约：health 1=少吃(红) 2=适量(黄) 3=推荐(绿)；兼容字符串 green/yellow/red
  const HEALTH_MAP = { 1: 'red', 2: 'yellow', 3: 'green', green: 'green', yellow: 'yellow', red: 'red' };
  const key = HEALTH_MAP[f.health] || '';
  const c = HEALTH_COLORS[key];
  if (!c) return '';
  return '<span class="cal-hdot" style="background:' + c + ';" title="' + SL.esc(String(f.health)) + '"></span>';
}

/* ===== 渲染 ===== */
function render(container, params) {
  viewRoot = container; viewParams = params || {};
  const entries = getCal().entries || [];

  container.innerHTML =
    '<div class="view-header fade-up"><h1>卡路里</h1>' +
    '<div class="view-sub">吃进去的每一口都算数 · 记录饮食，掌握摄入</div></div>' +

    '<div id="calStats" class="stagger"></div>' +

    '<div class="cal-toolbar">' +
    '<button class="btn btn--primary" id="calAdd">' + SL.icon('plus', 16) + ' 记一笔</button>' +
    '<button class="btn btn--ghost" id="calCustom">' + SL.icon('edit', 16) + ' 自定义食物</button>' +
    '</div>' +

    '<div id="calTrend" class="card card--pad cal-trend stagger"></div>' +
    '<div id="calMeals" class="stagger"></div>';

  container.querySelector('#calAdd').addEventListener('click', () => openAddModal(null));
  container.querySelector('#calCustom').addEventListener('click', () => openCustomModal());

  renderStats(container.querySelector('#calStats'));
  renderTrend(container.querySelector('#calTrend'));
  renderMeals(container.querySelector('#calMeals'));

  SL.bindCardSwipe?.();
  SL.refreshBadges?.();
}

function destroy() {}

/* ===== 顶部统计条：今日摄入 + 环形进度 + 三大营养素 ===== */
function renderStats(el) {
  const today = todayKey();
  const kcal = Math.round(sumOn(today, 'kcal'));
  const budget = budgetKcal();
  const pct = Math.min(1, kcal / budget);
  const r = 54, C = 2 * Math.PI * r;
  const targets = macroTargets(budget);
  const over = kcal > budget;

  const ring =
    '<div class="progress-ring cal-ring">' +
    '<svg width="128" height="128" viewBox="0 0 128 128">' +
    '<circle class="ring-track" cx="64" cy="64" r="' + r + '" fill="none" stroke-width="10"/>' +
    '<circle class="ring-value" cx="64" cy="64" r="' + r + '" fill="none" stroke-width="10"' +
    ' stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - pct)).toFixed(1) + '"' +
    (over ? ' style="stroke:var(--danger);"' : '') + '/>' +
    '</svg>' +
    '<div class="cal-ring__label"><strong id="calKcal">' + kcal + '</strong><span>/ ' + budget + ' kcal</span></div>' +
    '</div>';

  const macroBars = MACROS.map(m => {
    const got = Math.round(sumOn(today, m.key));
    const target = targets[m.key];
    const p = target ? Math.min(100, Math.round(got / target * 100)) : 0;
    return '<div class="cal-macro">' +
      '<div class="cal-macro__head"><span>' + SL.esc(m.label) + '</span>' +
      '<span class="cal-macro__num">' + got + ' / ' + target + ' g</span></div>' +
      '<div class="progress-bar"><span class="bar-fill" style="width:' + p + '%;background:' + m.color + ';"></span></div>' +
      '</div>';
  }).join('');

  const remain = budget - kcal;
  const hint = over
    ? '<span class="cal-hint cal-hint--over">今日已超预算 ' + (kcal - budget) + ' kcal，明天少吃点</span>'
    : '<span class="cal-hint">还可摄入 <strong>' + remain + '</strong> kcal</span>';

  el.innerHTML =
    '<div class="card card--pad cal-stat">' +
    ring +
    '<div class="cal-stat__right">' +
    '<div class="cal-stat__title">' + SL.icon('flame', 16) + ' 今日总摄入</div>' +
    hint +
    macroBars +
    '</div></div>';

  const big = el.querySelector('#calKcal');
  if (big) SL.animNum(big, kcal, 600);
}

/* ===== 7 日趋势 ===== */
function renderTrend(el) {
  const vals = last7Values();
  const avg = Math.round(vals.reduce((a, b) => a + b, 0) / 7);
  el.innerHTML =
    '<div class="cal-trend__head">' +
    '<div class="cal-trend__title">' + SL.icon('chart', 16) + ' 近 7 日摄入趋势</div>' +
    '<div class="cal-trend__avg">日均 <strong>' + avg + '</strong> kcal</div></div>' +
    '<div class="cal-trend__body">' +
    (SL.sparkline(vals, 260, 44) || '<span class="muted" style="font-size:12px;">记录满 2 天后展示趋势线</span>') +
    '</div>' +
    '<div class="cal-trend__days">' + vals.map(v => '<span>' + v + '</span>').join('') + '</div>';
}

/* ===== 四餐分区 ===== */
function renderMeals(el) {
  const entries = getCal().entries || [];
  if (!entries.length) {
    el.innerHTML =
      '<div class="empty-state">' + SL.icon('food', 52) +
      '<p>还没有饮食记录<br>记下今天的第一餐，开始管理摄入吧</p>' +
      '<button class="btn btn--primary" id="calFirstMeal">' + SL.icon('plus', 16) + ' 记录第一餐</button></div>';
    el.querySelector('#calFirstMeal').addEventListener('click', () => openAddModal(null));
    return;
  }

  const today = todayKey();
  el.innerHTML = '<div class="cal-meal-grid">' + MEALS.map(m => {
    const list = entriesOn(today).filter(e => e.meal === m.key);
    const sub = Math.round(list.reduce((s, e) => s + num(e.kcal), 0));
    return '<div class="card card--pad cal-meal swipeable">' +
      '<div class="cal-meal__head">' + SL.icon(m.icon, 18) +
      '<span class="cal-meal__name">' + SL.esc(m.label) + '</span>' +
      '<span class="cal-meal__sub">' + sub + ' kcal</span></div>' +
      (list.length
        ? '<ul class="cal-entry-list">' + list.map(e =>
          '<li class="cal-entry">' +
          '<div class="cal-entry__info"><span class="cal-entry__name">' + SL.esc(e.foodName) + '</span>' +
          '<span class="cal-entry__gram">' + num(e.gram) + ' g · 蛋白 ' + num(e.protein, 0) + 'g</span></div>' +
          '<span class="cal-entry__kcal">' + Math.round(num(e.kcal)) + ' kcal</span>' +
          '<button class="btn btn--ghost btn--sm" data-del="' + e.id + '" aria-label="删除">' + SL.icon('trash', 14) + '</button>' +
          '</li>').join('') + '</ul>'
        : '<div class="cal-meal__empty">还没记录，点击下方按钮补一笔</div>') +
      '<button class="btn btn--ghost btn--sm cal-meal__add" data-meal="' + m.key + '">' + SL.icon('plus', 14) + ' 记一笔</button>' +
      '</div>';
  }).join('') + '</div>';

  el.querySelectorAll('[data-meal]').forEach(b =>
    b.addEventListener('click', () => openAddModal(b.dataset.meal)));
  el.querySelectorAll('[data-del]').forEach(b =>
    b.addEventListener('click', () => removeEntry(b.dataset.del)));
  SL.bindCardSwipe?.(el);
}

async function removeEntry(id) {
  const ent = (getCal().entries || []).find(e => e.id === id);
  if (!ent) return;
  if (await SL.confirm('删除「' + ent.foodName + '」这条记录？')) {
    const d = getCal();
    d.entries = d.entries.filter(x => x.id !== id);
    SL.setData('calories', d);
    rerender();
    SL.toast('已删除', 'info');
  }
}

function rerender() {
  if (viewRoot) render(viewRoot, viewParams);
}

/* ===== 记一笔模态 ===== */
let foodsReady = false;
function openAddModal(preMeal) {
  let selMeal = preMeal || 'breakfast';
  let selFood = null;
  let kw = '';

  const close = SL.modal({
    title: '记一笔饮食',
    body:
      '<div class="cal-m-meals" id="calMMeals">' +
      MEALS.map(m => '<button type="button" class="cal-m-meal' + (m.key === selMeal ? ' is-on' : '') + '" data-v="' + m.key + '">' + SL.icon(m.icon, 14) + SL.esc(m.label) + '</button>').join('') +
      '</div>' +
      '<div class="cal-m-search">' + SL.icon('search', 16) +
      '<input class="input" id="calMSearch" placeholder="搜索食物名，如：鸡胸肉 / 米饭…" value="' + SL.esc(kw) + '">' +
      '</div>' +
      '<div id="calMHint" class="cal-m-hint" style="display:none;"></div>' +
      '<div id="calMResults" class="cal-m-results"><div class="cal-m-loading">正在加载食物库…</div></div>' +
      '<div id="calMDetail" class="cal-m-detail" style="display:none;"></div>',
    actions: [
      { label: '关闭', onClick: () => close() }
    ]
  });

  const overlays = document.querySelectorAll('.sl-modal-overlay');
  const root = overlays[overlays.length - 1] || document;
  const searchEl = root.querySelector('#calMSearch');
  const resultsEl = root.querySelector('#calMResults');
  const detailEl = root.querySelector('#calMDetail');
  const hintEl = root.querySelector('#calMHint');

  root.querySelectorAll('#calMMeals .cal-m-meal').forEach(b => {
    b.addEventListener('click', () => {
      selMeal = b.dataset.v;
      root.querySelectorAll('#calMMeals .cal-m-meal').forEach(x => x.classList.remove('is-on'));
      b.classList.add('is-on');
    });
  });

  function showHint(msg) {
    hintEl.textContent = msg;
    hintEl.style.display = 'block';
  }
  function hideHint() { hintEl.style.display = 'none'; }

  function matchFood(list) {
    const k = kw.trim().toLowerCase();
    const pool = list.concat(allCustomFoods());
    if (!k) return pool.slice(0, 12);
    return pool.filter(f => f.name.toLowerCase().includes(k)).slice(0, 12);
  }

  function renderResults(list) {
    const items = matchFood(list);
    if (!items.length) {
      resultsEl.innerHTML = '<div class="cal-m-loading">没有找到「' + SL.esc(kw) + '」，试试自定义食物</div>';
      return;
    }
    resultsEl.innerHTML = items.map((f, i) =>
      '<div class="cal-m-item" data-i="' + i + '">' +
      '<div class="cal-m-item__name">' + healthDot(f) + SL.esc(f.name) +
      (f.custom ? ' <span class="badge cal-m-badge">自定义</span>' : (f.tag ? ' <span class="badge cal-m-badge">' + SL.esc(f.tag) + '</span>' : '')) +
      '</div>' +
      '<span class="cal-m-item__kcal">' + Math.round(f.kcal) + ' kcal/100g</span>' +
      '</div>').join('');
    resultsEl.querySelectorAll('.cal-m-item').forEach(el => {
      el.addEventListener('click', () => selectFood(items[parseInt(el.dataset.i, 10)]));
    });
  }

  function selectFood(f) {
    selFood = f;
    resultsEl.style.display = 'none';
    detailEl.style.display = 'block';
    const g = f.unit;
    detailEl.innerHTML =
      '<div class="cal-m-detail__head">' + healthDot(f) + '<strong>' + SL.esc(f.name) + '</strong>' +
      '<button type="button" class="btn btn--ghost btn--sm" id="calMBack">' + SL.icon('chevronL', 14) + ' 返回</button></div>' +
      '<div class="cal-m-nut">每 100g：' +
      '<span>热量 ' + Math.round(f.kcal) + ' kcal</span>' +
      '<span>蛋白 ' + f.protein + 'g</span>' +
      '<span>碳水 ' + f.carb + 'g</span>' +
      '<span>脂肪 ' + f.fat + 'g</span></div>' +
      '<div class="cal-m-gram"><label>数量（克）</label>' +
      '<input class="input" id="calMGram" type="number" min="1" step="1" value="' + g + '"></div>' +
      '<div class="cal-m-preview" id="calMPreview"></div>' +
      '<button class="btn btn--primary cal-m-confirm" id="calMConfirm">' + SL.icon('check', 16) + ' 添加到' + SL.esc(mealLabel(selMeal)) + '</button>';

    detailEl.querySelector('#calMBack').addEventListener('click', () => {
      selFood = null;
      detailEl.style.display = 'none';
      resultsEl.style.display = 'block';
    });
    const gramEl = detailEl.querySelector('#calMGram');
    const preview = detailEl.querySelector('#calMPreview');
    const upd = () => {
      const gram = Math.max(0, num(gramEl.value, 0));
      const k = gram / 100;
      preview.innerHTML = '预计摄入：<strong>' + Math.round(f.kcal * k) + ' kcal</strong>' +
        ' · 蛋白 ' + (f.protein * k).toFixed(1) + 'g · 碳水 ' + (f.carb * k).toFixed(1) + 'g · 脂肪 ' + (f.fat * k).toFixed(1) + 'g';
    };
    gramEl.addEventListener('input', upd);
    upd();
    detailEl.querySelector('#calMConfirm').addEventListener('click', ev => {
      const gram = Math.max(1, num(gramEl.value, 1));
      const k = gram / 100;
      const d = getCal();
      d.entries = d.entries || [];
      d.entries.push({
        id: SL.id(),
        date: todayKey(),
        meal: selMeal,
        foodName: f.name,
        kcal: Math.round(f.kcal * k),
        protein: +(f.protein * k).toFixed(1),
        carb: +(f.carb * k).toFixed(1),
        fat: +(f.fat * k).toFixed(1),
        gram: gram,
        ts: Date.now()
      });
      SL.setData('calories', d);
      const rect = ev.target.getBoundingClientRect();
      SL.confetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      SL.toast('已记录 ' + f.name + '，记一笔成功', 'success');
      close();
      rerender();
    });
  }

  let searchTimer = null;
  searchEl.addEventListener('input', () => {
    kw = searchEl.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      const list = await loadFoods();
      if (!foodsReady) {
        foodsReady = true;
        if (foodsFailed) showHint('食物库加载失败，可用下方「自定义食物」录入');
      }
      if (foodsFailed) showHint('食物库加载失败，可用自定义食物');
      else hideHint();
      if (!selFood) renderResults(list);
    }, 200);
  });

  loadFoods().then(list => {
    foodsReady = true;
    if (foodsFailed) {
      showHint('食物库加载失败，可用自定义食物');
      resultsEl.innerHTML = '<div class="cal-m-loading">食物库不可用，可点击「自定义食物」手动录入</div>';
    } else {
      hideHint();
      renderResults(list);
    }
  });
}

function mealLabel(key) {
  const m = MEALS.find(x => x.key === key);
  return m ? m.label : key;
}

/* ===== 自定义食物模态 ===== */
function openCustomModal() {
  const close = SL.modal({
    title: '自定义食物（每 100g 营养）',
    body:
      '<div class="field"><label>食物名称</label><input class="input" id="calCName" maxlength="30" placeholder="如：妈妈牌蛋炒饭"></div>' +
      '<div class="field"><label>热量 kcal / 100g</label><input class="input" id="calCKcal" type="number" min="0" step="1" placeholder="如：180"></div>' +
      '<div class="cal-c-row">' +
      '<div class="field"><label>蛋白 g</label><input class="input" id="calCPro" type="number" min="0" step="0.1" placeholder="0"></div>' +
      '<div class="field"><label>碳水 g</label><input class="input" id="calCCarb" type="number" min="0" step="0.1" placeholder="0"></div>' +
      '<div class="field"><label>脂肪 g</label><input class="input" id="calCFat" type="number" min="0" step="0.1" placeholder="0"></div>' +
      '<div class="field"><label>常见份量 g</label><input class="input" id="calCUnit" type="number" min="1" step="1" value="100"></div>' +
      '</div>',
    actions: [
      { label: '取消', onClick: () => close() },
      {
        label: '保存', primary: true, onClick: () => {
          const name = document.getElementById('calCName').value.trim();
          const kcal = num(document.getElementById('calCKcal').value, -1);
          if (!name) { SL.toast('请填写食物名称', 'error'); return; }
          if (kcal < 0) { SL.toast('请填写热量（kcal/100g）', 'error'); return; }
          const d = getCal();
          d.customFoods = d.customFoods || [];
          d.customFoods.push({
            id: SL.id(),
            name: name,
            kcal: kcal,
            protein: num(document.getElementById('calCPro').value, 0),
            carb: num(document.getElementById('calCCarb').value, 0),
            fat: num(document.getElementById('calCFat').value, 0),
            unit: num(document.getElementById('calCUnit').value, 0) || 100
          });
          SL.setData('calories', d);
          SL.toast('自定义食物「' + name + '」已保存，可在记一笔中搜索', 'success');
          close();
          openAddModal(null);
        }
      }
    ]
  });
}

export { render, destroy, meta };
