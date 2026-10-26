/**
 * Module: 仪表盘 (module-dashboard.js)
 * Contractor: SA-08 (Director)
 * Contract: ARCHITECTURE v2.0
 */
'use strict';

const meta = { id: 'dashboard', title: '仪表盘', icon: 'home', order: 1 };

let cleanup = [];

function render(container, params) {
  const today = SL.fmt.date(new Date());
  const exam = nearestExam();
  const focusMin = SL.helpers.timerTodayMin();
  const kcal = SL.helpers.kcalToday();
  const water = (SL.getData('water').daily || {})[today] || 0;
  const waterGoal = SL.getData('water').goal || 2000;
  const habits = SL.getData('habits').items || [];
  const habitDone = SL.helpers.habitsDoneToday();
  const shop = SL.getData('shop');
  const user = SL.state.user || { name: '同学' };
  const q = todayQuote();

  container.innerHTML =
    '<div class="view-header fade-up">' +
    '<h1>' + greet() + '，' + SL.esc(user.name || '同学') + '</h1>' +
    '<div class="view-sub">今天也要离目标更近一点 · 第 ' + dayCount() + ' 天自律日</div></div>' +

    '<div class="grid stagger" style="grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:16px;">' +

    /* 考试倒计时卡 */
    '<div class="card card--pad dash-card dash-card--exam">' +
    (exam
      ? '<div class="dash-card__head"><span class="dash-card__icon">' + SL.icon('countdown', 20) + '</span><b>' + SL.esc(exam.name) + '</b>' +
        '<span class="tag tag--red">' + phaseLabel(exam) + '</span></div>' +
        '<div class="dash-countdown" id="dashCd">' + countdownHTML(exam) + '</div>' +
        '<div class="progress-bar" style="margin-top:14px;"><div class="progress-bar__fill" style="width:' + examProgress(exam) + '%"></div></div>' +
        '<div class="muted" style="font-size:11.5px;margin-top:6px;">' + SL.esc(exam.date) + ' · 总进度 ' + Math.round(examProgress(exam)) + '%</div>'
      : '<div class="empty-state empty-state--sm">' + SL.icon('countdown', 36) + '<p>还没有考试倒计时</p>' +
        '<button class="btn btn--primary btn--sm" data-go="countdown">去设置</button></div>') +
    '</div>' +

    /* 专注卡 */
    '<div class="card card--pad dash-card">' +
    '<div class="dash-card__head"><span class="dash-card__icon">' + SL.icon('timer', 20) + '</span><b>今日专注</b></div>' +
    '<div class="dash-big"><span class="anim-num" id="dashFocus" data-v="0">' + focusMin + '</span><span class="dash-big__unit">分钟</span></div>' +
    '<div class="muted" style="font-size:12px;">≈ ' + (focusMin / 60).toFixed(1) + ' 小时 · 累计番茄 ' + totalPomodoros() + ' 个</div>' +
    '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">' +
    '<button class="btn btn--primary btn--sm" data-go="timer" data-act="start">' + SL.icon('zap', 15) + ' 开始专注</button>' +
    '<button class="btn btn--ghost btn--sm" data-go="noise">白噪音</button></div>' +
    '</div>' +

    /* 卡路里环卡 */
    '<div class="card card--pad dash-card">' +
    '<div class="dash-card__head"><span class="dash-card__icon">' + SL.icon('food', 20) + '</span><b>今日摄入</b>' +
    '<span class="tag tag--warm">' + kcalBudgetStatus(kcal).label + '</span></div>' +
    '<div style="display:flex;align-items:center;gap:18px;">' +
    '<div class="dash-ring" id="dashKcalRing">' + kcalRingHTML(kcal) + '</div>' +
    '<div style="flex:1;min-width:0;">' +
    '<div class="dash-mini"><span>已摄入</span><b class="anim-num">' + kcal + '</b> kcal</div>' +
    '<div class="dash-mini"><span>运动消耗</span><b class="anim-num">' + sportKcalToday() + '</b> kcal</div>' +
    '<div class="dash-mini"><span>预算</span><b>' + kcalBudget() + '</b> kcal</div>' +
    '</div></div>' +
    '<button class="btn btn--ghost btn--sm" style="margin-top:12px;width:100%;" data-go="calories">记录饮食 →</button>' +
    '</div>' +

    /* 习惯打卡卡 */
    '<div class="card card--pad dash-card">' +
    '<div class="dash-card__head"><span class="dash-card__icon">' + SL.icon('flame', 20) + '</span><b>今日打卡</b>' +
    '<span class="tag">' + habitDone + '/' + habits.length + '</span></div>' +
    (habits.length
      ? '<div class="dash-habits">' + habits.slice(0, 5).map(h => {
          const on = h.records && h.records[today];
          return '<button class="dash-habit ' + (on ? 'is-on' : '') + '" data-habit="' + SL.esc(h.id) + '">' +
            '<span class="dash-habit__mark">' + SL.icon('check', 13) + '</span>' + SL.esc(h.name) + '</button>';
        }).join('') + '</div>' +
        (habits.length > 5 ? '<div class="muted" style="font-size:11.5px;margin-top:8px;">还有 ' + (habits.length - 5) + ' 个习惯，点击查看全部</div>' : '')
      : '<div class="empty-state empty-state--sm">' + SL.icon('flame', 36) + '<p>还没有习惯</p><button class="btn btn--primary btn--sm" data-go="habits">创建第一个</button></div>') +
    '</div>' +

    /* 水滴卡 */
    '<div class="card card--pad dash-card">' +
    '<div class="dash-card__head"><span class="dash-card__icon">' + SL.icon('water', 20) + '</span><b>今日饮水</b></div>' +
    '<div class="dash-big"><span class="anim-num">' + water + '</span><span class="dash-big__unit">/ ' + waterGoal + ' ml</span></div>' +
    '<div class="progress-bar"><div class="progress-bar__fill" style="width:' + Math.min(100, water / waterGoal * 100) + '%"></div></div>' +
    '<div style="display:flex;gap:8px;margin-top:12px;">' +
    [150, 250, 500].map(ml => '<button class="btn btn--ghost btn--sm" data-water="' + ml + '" style="flex:1;">+' + ml + 'ml</button>').join('') +
    '</div></div>' +

    /* 语录卡 */
    '<div class="card card--pad dash-card dash-card--quote">' +
    '<div class="dash-quote-mark">' + SL.icon('quote', 26) + '</div>' +
    '<p class="dash-quote-text" id="dashQuote">' + SL.esc(q.text) + '</p>' +
    '<div class="muted" style="font-size:12px;">— ' + SL.esc(q.by || '研轻') + '</div>' +
    '<div style="display:flex;gap:8px;margin-top:10px;">' +
    '<button class="btn btn--ghost btn--sm" id="dashQuoteBtn">' + SL.icon('refresh', 14) + ' 换一句</button>' +
    '<button class="btn btn--ghost btn--sm" id="dashQuoteFav">' + SL.icon('heart', 14) + ' 收藏</button></div>' +
    '</div>' +

    /* 今日优先卡 */
    '<div class="card card--pad dash-card">' +
    '<div class="dash-card__head"><span class="dash-card__icon">' + SL.icon('list', 20) + '</span><b>今日优先</b></div>' +
    priorityHTML() +
    '</div>' +

    /* 自律币卡 */
    '<div class="card card--pad dash-card dash-card--coin">' +
    '<div class="dash-card__head"><span class="dash-card__icon">' + SL.icon('wallet', 20) + '</span><b>自律币</b></div>' +
    '<div class="dash-big"><span class="anim-num">' + shop.coin + '</span><span class="dash-big__unit">枚</span></div>' +
    '<div class="muted" style="font-size:12px;">专注/打卡/日记/成就都能赚币</div>' +
    '<button class="btn btn--ghost btn--sm" style="margin-top:12px;width:100%;" data-go="shop">去商城兑换奖励 →</button>' +
    '</div>' +

    /* 快速操作 */
    '</div>' +
    '<div class="card card--pad" style="margin-top:16px;">' +
    '<div class="dash-card__head"><span class="dash-card__icon">' + SL.icon('zap', 20) + '</span><b>快速操作</b></div>' +
    '<div class="dash-quick">' +
    quickActions.map(a =>
      '<button class="dash-quick__btn" data-go="' + a.go + '"' + (a.act ? ' data-act="' + a.act + '"' : '') + '>' +
      SL.icon(a.icon, 22) + '<span>' + a.label + '</span></button>').join('') +
    '</div></div>';

  /* ===== 交互绑定 ===== */
  container.querySelectorAll('[data-go]').forEach(btn => {
    btn.addEventListener('click', () => {
      const go = btn.dataset.go, act = btn.dataset.act;
      if (go === 'timer' && act === 'start') SL.go('timer', { autoStart: true });
      else SL.go(go);
    });
  });
  container.querySelectorAll('[data-water]').forEach(btn => {
    btn.addEventListener('click', () => {
      const w = SL.getData('water');
      w.daily[today] = (w.daily[today] || 0) + Number(btn.dataset.water);
      SL.setData('water', w);
      SL.toast('+' + btn.dataset.water + 'ml 已记录', 'success');
      rerenderScoped(container, params);
    });
  });
  container.querySelectorAll('[data-habit]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      toggleHabit(btn.dataset.habit, e, btn);
    });
  });
  const qBtn = container.querySelector('#dashQuoteBtn');
  if (qBtn) qBtn.addEventListener('click', () => {
    const data = SL.getData('quote');
    data.todayIndex = -1;
    SL.setData('quote', data, true);
    const nq = todayQuote();
    const qEl = container.querySelector('#dashQuote');
    if (qEl) qEl.textContent = nq.text;
  });
  const favBtn = container.querySelector('#dashQuoteFav');
  if (favBtn) favBtn.addEventListener('click', () => {
    const data = SL.getData('quote');
    const q = todayQuote();
    if (!data.favs.some(f => f.text === q.text)) { data.favs.unshift({ ...q, ts: Date.now() }); SL.setData('quote', data, true); SL.toast('已收藏', 'success'); }
    else SL.toast('已经收藏过了', 'info');
  });

  /* 数据变化局部刷新（不整页重渲） */
  const onTimer = () => { const el = container.querySelector('#dashFocus'); if (el) SL.animNum(el, SL.helpers.timerTodayMin()); };
  const onCal = () => { rerenderScoped(container, params); };
  const onHabit = () => { rerenderScoped(container, params); };
  SL.on('data:timer', onTimer);
  SL.on('data:calories', onCal);
  SL.on('data:habits', onHabit);
  cleanup.push(() => { SL.off('data:timer', onTimer); SL.off('data:calories', onCal); SL.off('data:habits', onHabit); });

  /* 倒计时每分钟刷新 */
  const onTick = () => {
    const el = container.querySelector('#dashCd');
    const ex = nearestExam();
    if (el && ex) el.innerHTML = countdownHTML(ex);
  };
  SL.on('tick', onTick);
  cleanup.push(() => SL.off('tick', onTick));
}

function rerenderScoped(container, params) {
  // 仅在仍处于该视图时重渲
  if (document.querySelector('.sl-nav__item.is-active')?.dataset.view !== 'dashboard') return;
  cleanup.forEach(fn => fn()); cleanup = [];
  render(container, params);
}

function destroy() {
  cleanup.forEach(fn => fn());
  cleanup = [];
}

/* ===== 私有工具 ===== */
const quickActions = [
  { icon: 'timer', label: '开始专注', go: 'timer', act: 'start' },
  { icon: 'food', label: '记录饮食', go: 'calories' },
  { icon: 'scale', label: '记录体重', go: 'weight' },
  { icon: 'diary', label: '写日记', go: 'diary' },
  { icon: 'flame', label: '习惯打卡', go: 'habits' },
  { icon: 'run', label: '记运动', go: 'sport' }
];

function greet() {
  const h = new Date().getHours();
  if (h < 5) return '夜深了';
  if (h < 9) return '早上好';
  if (h < 12) return '上午好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  if (h < 23) return '晚上好';
  return '夜深了';
}
function dayCount() {
  const u = SL.state.user || {};
  const created = u.createdAt || Number(localStorage.getItem('sl_created_at')) || Date.now();
  return Math.max(1, Math.floor((Date.now() - created) / 86400000) + 1);
}
function nearestExam() {
  const exams = (SL.getData('countdown').exams || []).filter(e => isFinite(new Date((e.date || '') + 'T23:59:59').getTime()));
  const now = Date.now();
  exams.sort((a, b) => new Date(a.date + 'T23:59:59').getTime() - new Date(b.date + 'T23:59:59').getTime());
  return exams.find(e => new Date(e.date + 'T23:59:59').getTime() >= now) || exams[exams.length - 1] || null;
}
function phaseLabel(exam) {
  const ts = new Date(exam.date + 'T23:59:59').getTime();
  if (!isFinite(ts)) return '日期无效';
  const days = Math.ceil((ts - Date.now()) / 86400000);
  if (days < 0) return '已结束';
  if (days <= 30) return '考前冲刺';
  if (days <= 100) return '强化期';
  if (days <= 200) return '基础期';
  return '长线备战';
}
function countdownHTML(exam) {
  const target = new Date(exam.date + 'T23:59:59').getTime();
  if (!isFinite(target)) {
    return '<div class="muted" style="padding:8px 0;">考试日期无效，请编辑修正</div>';
  }
  const diff = Math.max(0, target - Date.now());
  const d = Math.floor(diff / 86400000);
  const h = Math.floor(diff % 86400000 / 3600000);
  const m = Math.floor(diff % 3600000 / 60000);
  const s = Math.floor(diff % 60000 / 1000);
  const cell = (v, label) => '<div class="dash-cd__cell"><b>' + SL.fmt.pad(v).toString().padStart(2, '0') + '</b><span>' + label + '</span></div>';
  return '<div class="dash-cd">' +
    cell(d, '天') + cell(h, '时') + cell(m, '分') + cell(s, '秒') +
    '</div><div class="muted" style="font-size:11px;margin-top:4px;">距考试还有 <b style="color:var(--accent)">' + d + '</b> 天</div>';
}
function examProgress(exam) {
  const created = exam.createdAt || new Date(exam.date).getTime() - 300 * 86400000;
  const end = new Date(exam.date + 'T23:59:59').getTime();
  const span = end - created;
  // 已结束/非法日期：span ≤ 0 或 NaN 时避免除零与 NaN 传播
  if (!isFinite(span) || span <= 0) return 100;
  const p = (Date.now() - created) / span * 100;
  return Math.max(0, Math.min(100, p));
}
function totalPomodoros() {
  return (SL.getData('timer').history || []).filter(r => r.type === 'focus').length;
}
function sportKcalToday() {
  const today = SL.fmt.date(new Date());
  return Math.round((SL.getData('sport').entries || []).reduce((s, r) => s + (r.date === today ? (r.kcal || 0) : 0), 0));
}
function kcalBudget() {
  const w = SL.getData('weight') || {};
  const p = w.profile || {};
  // Mifflin-St Jeor，体重取最新记录 kg，无记录兜底 65（与 calories 模块统一）
  const recs = (w.records || []).slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const kg = recs.length ? (parseFloat(recs[recs.length - 1].kg) || 65) : 65;
  // profile 字段可能缺失/为非法值：逐一兜底，防 NaN 传播到预算与进度环
  const hCm = parseFloat(p.heightCm) || 170;
  const age = parseFloat(p.age) || 22;
  const act = parseFloat(p.activity) || 1.375;
  const bmr = 10 * kg + 6.25 * hCm - 5 * age + (p.gender === 'female' ? -161 : 5);
  // 下限 1 防止 profile 异常（activity=0 等）导致除零 / 负预算
  return Math.max(1, Math.round(bmr * act - 300));
}
function kcalBudgetStatus(kcal) {
  const b = kcalBudget();
  if (kcal === 0) return { label: '未记录' };
  if (kcal <= b) return { label: '预算内' };
  return { label: '已超 ' + (kcal - b) + ' kcal', over: true };
}
function kcalRingHTML(kcal) {
  const b = kcalBudget();
  const pct = Math.min(1, kcal / b);
  const R = 34, C = 2 * Math.PI * R;
  const color = kcal > b ? 'var(--warning)' : 'var(--accent)';
  return '<svg width="84" height="84" viewBox="0 0 84 84">' +
    '<circle cx="42" cy="42" r="' + R + '" fill="none" stroke="var(--bg-inset)" stroke-width="8"/>' +
    '<circle cx="42" cy="42" r="' + R + '" fill="none" stroke="' + color + '" stroke-width="8" stroke-linecap="round" ' +
    'stroke-dasharray="' + C + '" stroke-dashoffset="' + (C * (1 - pct)) + '" transform="rotate(-90 42 42)" style="transition:stroke-dashoffset .8s ease"/>' +
    '<text x="42" y="40" text-anchor="middle" font-size="14" font-weight="700" fill="var(--fg)">' + Math.round(pct * 100) + '%</text>' +
    '<text x="42" y="54" text-anchor="middle" font-size="8" fill="var(--fg-muted)">预算</text></svg>';
}
let quoteLoading = false;
const QUOTE_FALLBACK = { text: '自律者，先自律于今日。', by: '研轻' };
function todayQuote() {
  const data = SL.getData('quote');
  if (data.todayIndex == null || data.todayIndex < 0) {
    // 加载守卫：避免连续两次 render 触发并发 import，互相覆盖 todayText
    if (!quoteLoading) {
      quoteLoading = true;
      import('./data/quotes.js').then(({ QUOTES }) => {
        quoteLoading = false;
        const i = Math.floor(Math.random() * QUOTES.length);
        const d = SL.getData('quote');
        d.todayIndex = i; d.todayText = QUOTES[i];
        SL.setData('quote', d, true);
        const el = document.getElementById('dashQuote');
        if (el) el.textContent = QUOTES[i].text;
      }).catch(() => { quoteLoading = false; });
    }
    return data.todayText || QUOTE_FALLBACK;
  }
  return data.todayText || QUOTE_FALLBACK;
}
function priorityHTML() {
  const todos = (SL.getData('todo').items || []).filter(t => !t.done).slice(0, 3);
  const today = SL.fmt.date(new Date());
  const habits = (SL.getData('habits').items || []).filter(h => !(h.records && h.records[today])).slice(0, 3);
  if (!todos.length && !habits.length) {
    return '<div class="empty-state empty-state--sm">' + SL.icon('checkCircle', 36) + '<p>全部完成，太棒了！</p>' +
      '<button class="btn btn--primary btn--sm" data-go="todo">添加待办</button></div>';
  }
  let html = '<div class="dash-prio">';
  todos.forEach(t => {
    const pri = { high: 'tag--red', mid: 'tag--warm', low: '' }[t.priority || 'mid'] || '';
    html += '<button class="dash-prio__row" data-go="todo"><span class="tag ' + pri + '">' + priLabel(t.priority) + '</span><span class="dash-prio__text">' + SL.esc(t.text) + '</span>' + SL.icon('chevronR', 14) + '</button>';
  });
  habits.forEach(h => {
    html += '<button class="dash-prio__row" data-go="habits"><span class="tag tag--green">习惯</span><span class="dash-prio__text">' + SL.esc(h.name) + '</span>' + SL.icon('chevronR', 14) + '</button>';
  });
  return html + '</div>';
}
function priLabel(p) { return { high: '高', mid: '中', low: '低' }[p || 'mid']; }

function toggleHabit(habitId, evt, btnEl) {
  const data = SL.getData('habits');
  const h = (data.items || []).find(x => x.id === habitId);
  if (!h) return;
  const today = SL.fmt.date(new Date());
  h.records = h.records || {};
  if (h.records[today]) {
    delete h.records[today];
    SL.setData('habits', data);
    btnEl.classList.remove('is-on');
  } else {
    // 先取坐标再写数据：setData 会同步触发 data:habits → rerenderScoped，
    // 之后 btnEl 已脱离 DOM，getBoundingClientRect 会变成全 0
    const rect = btnEl.getBoundingClientRect();
    h.records[today] = true;
    SL.setData('habits', data);
    SL.earnCoin('习惯打卡：' + h.name, 2);
    SL.confetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
    SL.toast('打卡成功 +2 自律币', 'success');
  }
  SL.refreshBadges();
}

export { render, destroy, meta };
