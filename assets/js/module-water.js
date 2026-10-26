/**
 * Module: 喝水记录 (module-water.js)
 * Contractor: SA-16
 * Contract: ARCHITECTURE v2.0
 */
'use strict';

const meta = { id: 'water', title: '喝水记录', icon: 'water', order: 9 };

let viewRoot = null, viewParams = {};
let lastReached = false;

const CUP_TOP = 22, CUP_BOTTOM = 248, CUP_H = CUP_BOTTOM - CUP_TOP;

function render(container, params) {
  viewRoot = container; viewParams = params || {};
  const d = SL.getData('water');
  const goal = d.goal || 2000;

  container.innerHTML =
    '<div class="view-header fade-up"><h1>喝水记录</h1>' +
    '<div class="view-sub">每天 ' + (goal > 0 ? goal : 2000) + 'ml，大脑保持水润才好使 · 今日 ' + SL.fmt.date(new Date()) + '</div></div>' +

    '<div class="wt-grid">' +
    '<div class="card card--pad wt-cupcard" id="wtCupCard">' +
      '<svg class="wt-cup" id="wtCup" viewBox="0 0 200 270" role="img" aria-label="水杯进度">' +
        '<defs>' +
          '<linearGradient id="wtGrad" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#7DD3FC"/><stop offset="1" stop-color="#0EA5E9"/>' +
          '</linearGradient>' +
          '<clipPath id="wtClip"><path d="M42 ' + CUP_TOP + ' L158 ' + CUP_TOP + ' L149 244 Q148 254 138 254 L62 254 Q52 254 51 244 Z"/></clipPath>' +
        '</defs>' +
        '<g clip-path="url(#wtClip)">' +
          '<rect id="wtWater" class="wt-water" x="36" y="' + CUP_BOTTOM + '" width="128" height="0" fill="url(#wtGrad)"/>' +
          '<rect id="wtWave" class="wt-wave" x="36" y="' + CUP_BOTTOM + '" width="128" height="6" rx="3" fill="rgba(255,255,255,0.45)"/>' +
        '</g>' +
        '<path class="wt-cup-outline" d="M42 ' + CUP_TOP + ' L158 ' + CUP_TOP + ' L149 244 Q148 254 138 254 L62 254 Q52 254 51 244 Z"/>' +
        '<line class="wt-tick" x1="46" y1="98" x2="58" y2="98"/>' +
        '<line class="wt-tick" x1="46" y1="148" x2="58" y2="148"/>' +
        '<line class="wt-tick" x1="46" y1="198" x2="58" y2="198"/>' +
      '</svg>' +
      '<div class="wt-stats">' +
        '<div class="wt-big"><span id="wtNum">0</span><small> / ' + (goal > 0 ? goal : 2000) + ' ml</small></div>' +
        '<div class="wt-sub" id="wtSub">还差 ' + (goal > 0 ? goal : 2000) + ' ml 达成今日目标</div>' +
        '<div class="progress-bar wt-progress"><div class="progress-bar__fill" id="wtBar" style="width:0%"></div></div>' +
        '<div class="wt-empty-hint" id="wtHint">' + SL.icon('water', 20) + '<span>水杯还空着，从第一杯水开始今天的自律</span></div>' +
      '</div>' +
    '</div>' +

    '<div class="card card--pad">' +
      '<div class="card-title">' + SL.icon('plus', 18) + ' 记一笔</div>' +
      '<div class="wt-actions">' +
        '<button class="btn wt-quick" data-add="100">+100ml</button>' +
        '<button class="btn wt-quick" data-add="250">+250ml</button>' +
        '<button class="btn wt-quick" data-add="500">+500ml</button>' +
        '<button class="btn wt-quick" data-add="1000">+1000ml</button>' +
      '</div>' +
      '<div class="wt-custom">' +
        '<input class="input" id="wtCustom" type="number" min="1" max="3000" step="50" placeholder="自定义 ml，如 300">' +
        '<button class="btn btn--primary" id="wtAddCustom">添加</button>' +
      '</div>' +
      '<div class="wt-undo-row">' +
        '<button class="btn btn--ghost" id="wtUndo">' + SL.icon('minus', 16) + ' 撤销一杯（-250ml）</button>' +
        '<button class="btn btn--ghost" id="wtGoalBtn">' + SL.icon('target', 16) + ' 目标 ' + (goal > 0 ? goal : 2000) + 'ml</button>' +
      '</div>' +
      '<div class="wt-tip muted">常用参照：一次性纸杯约 200ml，普通矿泉水瓶约 550ml，保温杯约 400ml。</div>' +
    '</div>' +
    '</div>' +

    '<div class="card card--pad" style="margin-top:16px;">' +
      '<div class="card-title">' + SL.icon('chart', 18) + ' 近 7 日饮水量</div>' +
      '<div class="wt-days" id="wtChart"></div>' +
    '</div>';

  // 快捷加水量
  container.querySelectorAll('[data-add]').forEach(b =>
    b.addEventListener('click', () => { addMl(parseInt(b.dataset.add, 10)); }));
  // 自定义
  const customInput = container.querySelector('#wtCustom');
  const addCustom = () => {
    const v = Math.round(Number(customInput.value));
    if (!v || v < 1 || v > 3000) { SL.toast('请输入 1-3000 之间的毫升数', 'error'); return; }
    addMl(v);
    customInput.value = '';
  };
  container.querySelector('#wtAddCustom').addEventListener('click', addCustom);
  customInput.addEventListener('keydown', e => { if (e.key === 'Enter') addCustom(); });
  // 撤销
  container.querySelector('#wtUndo').addEventListener('click', () => {
    const cur = todayMl();
    if (cur <= 0) { SL.toast('今天还没有记录，不用撤销', 'info'); return; }
    addMl(-250);
  });
  // 目标设置
  container.querySelector('#wtGoalBtn').addEventListener('click', openGoalEditor);

  lastReached = todayMl() >= (goal > 0 ? goal : 2000);
  refresh(true);
  SL.bindCardSwipe?.();
  SL.refreshBadges?.();
}

function destroy() {
  viewRoot = null; viewParams = null; lastReached = false;
}

/* ===== 私有 ===== */
function todayMl() {
  const d = SL.getData('water');
  return (d.daily || {})[SL.fmt.date(new Date())] || 0;
}

function addMl(delta) {
  const d = SL.getData('water');
  const today = SL.fmt.date(new Date());
  d.daily = d.daily || {};
  // 上限 20000ml 防连点/输入异常导致数值失控；下限 0 防撤销为负
  const next = Math.min(20000, Math.max(0, (d.daily[today] || 0) + delta));
  d.daily[today] = next;
  SL.setData('water', d);
  if (delta > 0) SL.toast('已记录 +' + delta + 'ml，继续保持', 'success');
  else SL.toast('已撤销 250ml', 'info');
  refresh(false);
}

function refresh(firstLoad) {
  if (!viewRoot) return;
  const d = SL.getData('water');
  // 兜底：goal 为 0/负数/脏数据时回到 2000，防进度条与水位除零
  const goal = d.goal > 0 ? d.goal : 2000;
  const cur = todayMl();
  const pct = Math.min(100, Math.round(cur / goal * 100));
  const reached = cur >= goal;

  // 数字
  const numEl = viewRoot.querySelector('#wtNum');
  if (numEl) { firstLoad ? SL.animNum(numEl, cur) : (numEl.textContent = cur); }
  const subEl = viewRoot.querySelector('#wtSub');
  if (subEl) {
    subEl.innerHTML = reached
      ? '<span class="wt-done">' + SL.icon('checkCircle', 16) + ' 今日目标已达成， Waterfull！</span>'
      : '还差 ' + (goal - cur) + ' ml 达成今日目标（' + pct + '%）';
  }
  const barEl = viewRoot.querySelector('#wtBar');
  if (barEl) barEl.style.width = pct + '%';

  // 水位动画（SVG rect 几何属性过渡）
  const h = Math.min(1, cur / goal) * CUP_H;
  const water = viewRoot.querySelector('#wtWater');
  const wave = viewRoot.querySelector('#wtWave');
  if (water) {
    water.setAttribute('y', String(CUP_BOTTOM - h));
    water.setAttribute('height', String(Math.max(0, h)));
  }
  if (wave) wave.setAttribute('y', String(CUP_BOTTOM - h));

  // 达标泛蓝光 + 祝贺（只在跨过阈值时触发一次）
  const cupCard = viewRoot.querySelector('#wtCupCard');
  if (cupCard) cupCard.classList.toggle('is-goal', reached);
  const cup = viewRoot.querySelector('#wtCup');
  if (cup) cup.classList.toggle('is-goal', reached);
  if (reached && !lastReached) SL.toast('今日 ' + goal + 'ml 喝水目标达成，太棒了！', 'success');
  lastReached = reached;

  // 空状态提示
  const hint = viewRoot.querySelector('#wtHint');
  if (hint) hint.classList.toggle('is-show', cur === 0);

  renderChart(goal);
}

function renderChart(goal) {
  const el = viewRoot && viewRoot.querySelector('#wtChart');
  if (!el) return;
  const daily = SL.getData('water').daily || {};
  // goal 合法性兜底（防脏数据 0/负值导致 goalPct 计算异常）
  const g = goal > 0 ? goal : 2000;
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(); dt.setDate(dt.getDate() - i);
    const key = SL.fmt.date(dt);
    days.push({ key, ml: daily[key] || 0, wd: '日一二三四五六'[dt.getDay()], isToday: i === 0 });
  }
  const max = Math.max(g, ...days.map(x => x.ml), 500);
  const goalPct = Math.min(100, g / max * 100);
  el.innerHTML =
    '<div class="wt-goalline" style="bottom:' + (goalPct * 0.82 + 14) + '%;"><span>目标 ' + g + 'ml</span></div>' +
    days.map(x => {
      const hp = Math.max(2, x.ml / max * 82);
      return '<div class="wt-bar" title="' + x.key + '：' + x.ml + 'ml">' +
        '<span class="wt-bar__val">' + (x.ml || '') + '</span>' +
        '<div class="wt-bar__col' + (x.ml >= g ? ' is-goal' : '') + '" style="height:' + hp + '%"></div>' +
        '<span class="wt-bar__label' + (x.isToday ? ' is-today' : '') + '">' + (x.isToday ? '今天' : x.wd) + '</span>' +
        '</div>';
    }).join('');
}

function openGoalEditor() {
  const cur = SL.getData('water').goal || 2000;
  const close = SL.modal({
    title: '设置每日喝水目标',
    body:
      '<div class="field"><label>目标（ml）</label>' +
      '<input class="input" id="wtGoalInput" type="number" min="500" max="10000" step="100" value="' + cur + '">' +
      '<div class="muted" style="font-size:11.5px;margin-top:6px;">建议 1500-2500ml；运动日可适当上调。</div></div>',
    actions: [
      { label: '取消', onClick: () => close() },
      { label: '保存', primary: true, onClick: () => {
          const v = Math.round(Number(document.getElementById('wtGoalInput').value));
          if (!v || v < 500 || v > 10000) { SL.toast('目标需在 500-10000ml 之间', 'error'); return; }
          const d = SL.getData('water');
          d.goal = v;
          SL.setData('water', d);
          close();
          if (viewRoot && document.contains(viewRoot)) render(viewRoot, viewParams);
          SL.toast('目标已更新为 ' + v + 'ml', 'success');
        } }
    ]
  });
  setTimeout(() => document.getElementById('wtGoalInput')?.focus(), 60);
}

export { render, destroy, meta };
