/**
 * Module: 番茄专注钟 (module-timer.js)
 * Contractor: SA-10 (Director)
 * Contract: ARCHITECTURE v2.0
 */
'use strict';

const meta = { id: 'timer', title: '番茄专注', icon: 'timer', order: 3 };

let state = {
  running: false,
  paused: false,
  mode: 'focus',          // focus | break
  endAt: 0,               // 结束时间戳（暂停时冻结）
  remainMs: 0,
  label: '',
  interval: null
};
let viewRoot = null;
let viewParams = {};

function render(container, params) {
  viewRoot = container;
  viewParams = params || {};
  const s = SL.getData('timer').settings;
  const history = SL.getData('timer').history || [];
  const todayMin = SL.helpers.timerTodayMin();
  const week = weekStats();

  container.innerHTML =
    '<div class="view-header fade-up"><h1>番茄专注</h1>' +
    '<div class="view-sub">一次只做一件事 · 完成 +5 自律币</div></div>' +

    '<div class="tm-layout stagger">' +
    '<div class="card card--pad tm-main">' +
    '<div class="tm-tabs">' +
    '<button class="tm-tab is-on" data-mode="focus">专注 ' + s.focusMin + '′</button>' +
    '<button class="tm-tab" data-mode="break">休息 ' + s.breakMin + '′</button>' +
    '<button class="tm-tab" data-mode="custom">自定义</button></div>' +

    '<div class="tm-ring-wrap">' +
    '<div class="tm-ring" id="tmRing">' +
    '<svg width="230" height="230" viewBox="0 0 230 230">' +
    '<circle cx="115" cy="115" r="104" fill="none" stroke="var(--bg-inset)" stroke-width="10"/>' +
    '<circle id="tmArc" cx="115" cy="115" r="104" fill="none" stroke="var(--accent)" stroke-width="10" stroke-linecap="round" ' +
    'stroke-dasharray="653.45" stroke-dashoffset="0" transform="rotate(-90 115 115)" style="transition:stroke-dashoffset .5s linear;"/>' +
    '</svg>' +
    '<div class="tm-ring__center">' +
    '<div class="tm-clock" id="tmClock">25:00</div>' +
    '<div class="tm-ring__label" id="tmLabel">准备开始专注</div>' +
    '</div></div></div>' +

    '<input class="input tm-label-input" id="tmInputLabel" maxlength="20" placeholder="这次专注做什么？（如：数学真题第三章）">' +

    '<div class="tm-controls">' +
    '<button class="btn btn--primary btn--lg tm-btn-start" id="tmStart">' + SL.icon('zap', 18) + ' 开始专注</button>' +
    '<button class="btn btn--ghost btn--lg tm-btn-pause hidden" id="tmPause">暂停</button>' +
    '<button class="btn btn--ghost btn--lg tm-btn-resume hidden" id="tmResume">继续</button>' +
    '<button class="btn btn--danger btn--lg tm-btn-stop hidden" id="tmStop">结束</button>' +
    '</div>' +

    '<div class="tm-settings muted">' +
    '<button class="btn btn--ghost btn--sm" id="tmGear">' + SL.icon('settings', 14) + ' 时长设置</button>' +
    '<span>今日 ' + todayMin + ' 分钟 · 累计 ' + history.length + ' 个番茄</span></div>' +
    '</div>' +

    '<div class="tm-side">' +
    '<div class="card card--pad">' +
    '<h3>' + SL.icon('chart', 16) + ' 本周概览</h3>' +
    '<div class="tm-week">' + week.days.map(d =>
      '<div class="tm-week__col"><div class="tm-week__bar" style="height:' + Math.min(100, d.min / 300 * 100) + '%;" title="' + d.label + ' ' + d.min + '分钟"></div><span>' + d.label + '</span></div>').join('') +
    '</div>' +
    '<div class="muted" style="font-size:12px;margin-top:10px;">本周合计 <b style="color:var(--accent)">' + week.total + '</b> 分钟</div></div>' +

    '<div class="card card--pad">' +
    '<h3>' + SL.icon('music', 16) + ' 专注氛围</h3>' +
    '<p class="muted" style="font-size:12.5px;margin:4px 0 10px;">配合白噪音，进入心流更快</p>' +
    '<button class="btn btn--ghost btn--sm" id="tmNoise">' + SL.icon('music', 14) + ' 打开白噪音</button></div>' +
    '</div></div>' +

    '<div class="card card--pad" style="margin-top:16px;">' +
    '<h3>' + SL.icon('clock', 16) + ' 今日记录</h3><div id="tmHistory">' + historyHTML() + '</div></div>';

  // 绑定
  container.querySelectorAll('.tm-tab').forEach(t => t.addEventListener('click', () => {
    if (state.running) { SL.toast('进行中，请先结束当前番茄', 'error'); return; }
    const mode = t.dataset.mode;
    container.querySelectorAll('.tm-tab').forEach(x => x.classList.remove('is-on'));
    t.classList.add('is-on');
    state.mode = mode;
    resetClock(mode === 'focus' ? SL.getData('timer').settings.focusMin : mode === 'break' ? SL.getData('timer').settings.breakMin : 45);
  }));
  container.querySelector('#tmStart').addEventListener('click', () => start());
  container.querySelector('#tmPause').addEventListener('click', () => pause());
  container.querySelector('#tmResume').addEventListener('click', () => resume());
  container.querySelector('#tmStop').addEventListener('click', () => stop(true));
  container.querySelector('#tmGear').addEventListener('click', openGear);
  container.querySelector('#tmNoise').addEventListener('click', () => SL.go('noise'));

  // 入参：自动开始（来自 dashboard 快捷按钮）。消费一次后即清除，
  // 防止后续因设置保存/数据刷新触发的重渲意外再自动开始一个番茄
  if (viewParams.autoStart && !state.running) {
    delete viewParams.autoStart;
    state.mode = 'focus';
    container.querySelectorAll('.tm-tab').forEach(x => x.classList.toggle('is-on', x.dataset.mode === 'focus'));
    setTimeout(() => start(), 300);
  } else if (!state.running) {
    resetClock(s.focusMin);
  } else {
    // destroy() 清掉了 interval，但番茄仍在后台计时：重进视图需恢复 tickLoop，
    // 否则倒计时冻结且自然完成不会触发 saveHistory/earnCoin/种树
    // 注意：暂停态的 endAt 已冻结在暂停时刻，不能用 now 重算 remainMs，
    // 否则暂停期间离开视图的时间会被错误扣掉（暂停半小时回来倒计时直接清零）
    if (!state.paused) state.remainMs = Math.max(0, state.endAt - Date.now());
    if (!state.paused) tickLoop();
    syncUI();
  }
}

function destroy() {
  clearInterval(state.interval);
  state.interval = null;
  // 不清 running 状态：切换视图后番茄仍在后台跑
}

/* ===== 核心逻辑 ===== */
function currentMinutes() {
  if (state.mode === 'focus') return SL.getData('timer').settings.focusMin;
  if (state.mode === 'break') return SL.getData('timer').settings.breakMin;
  return state.customMin || 45;
}

function resetClock(minutes) {
  state.remainMs = minutes * 60000;
  updateClockUI();
}

function start() {
  state.label = document.getElementById('tmInputLabel')?.value.trim() || '';
  state.running = true;
  state.paused = false;
  state.endAt = Date.now() + state.remainMs;
  tickLoop();
  syncUI();
}

function pause() {
  state.paused = true;
  clearInterval(state.interval);
  state.remainMs = Math.max(0, state.endAt - Date.now());
  syncUI();
}

function resume() {
  state.paused = false;
  state.endAt = Date.now() + state.remainMs;
  tickLoop();
  syncUI();
}

function stop(byUser) {
  clearInterval(state.interval);
  state.interval = null;
  // 无论当前是否在 timer 视图，都要把倒计时标题恢复（updateClockUI 在视图外会提前 return）
  document.title = '研轻 StudyLean — 上岸，也上秤。';
  const elapsedMin = state.mode === 'focus'
    ? Math.round((currentMinutes() * 60000 - Math.max(0, state.endAt - Date.now())) / 60000)
    : 0;
  const wasRunning = state.running;
  const finishedLabel = state.label;
  state.running = false;
  state.paused = false;

  if (wasRunning && state.mode === 'focus') {
    if (elapsedMin >= 1) {
      saveHistory(elapsedMin, finishedLabel);
      SL.earnCoin('完成番茄：' + (finishedLabel || '专注'), 5);
      // 种树
      const forest = SL.getData('forest');
      forest.trees.push({ id: SL.id(), date: SL.fmt.date(new Date()), minutes: elapsedMin, species: pickSpecies(elapsedMin) });
      SL.setData('forest', forest, true);
      SL.toast('专注 ' + elapsedMin + ' 分钟，+5 自律币，森林 +1 棵树 🌳', 'success');
      if (window.Notification && Notification.permission === 'granted') {
        try { new Notification('研轻 · 番茄完成', { body: '专注 ' + elapsedMin + ' 分钟，休息一下吧' }); } catch (e) {}
      }
    } else if (byUser) {
      SL.toast('专注不足 1 分钟，未计入', 'info');
    }
  } else if (wasRunning && state.mode === 'break' && !byUser) {
    SL.toast('休息结束，开始下一个番茄吧', 'info');
  }
  state.remainMs = currentMinutes() * 60000;
  syncUI();
  // 刷新今日记录区
  const hEl = document.getElementById('tmHistory');
  if (hEl) hEl.innerHTML = historyHTML();
}

function tickLoop() {
  clearInterval(state.interval);
  state.interval = setInterval(() => {
    if (state.paused) return;
    const remain = state.endAt - Date.now();
    if (remain <= 0) {
      if (state.mode === 'focus') { stop(false); autoSwitchToBreak(); }
      else { stop(false); }
      return;
    }
    state.remainMs = remain;
    updateClockUI();
  }, 500);
}

function autoSwitchToBreak() {
  state.mode = 'break';
  state.remainMs = SL.getData('timer').settings.breakMin * 60000;
  viewRoot?.querySelectorAll('.tm-tab').forEach(x => x.classList.toggle('is-on', x.dataset.mode === 'break'));
  // stop(false) 后 autoSwitch 改了 mode/remainMs，需要同步一次 UI（按钮态/标题/时钟）
  syncUI();
  SL.toast('进入休息模式', 'info');
}

function updateClockUI() {
  const clock = document.getElementById('tmClock');
  const arc = document.getElementById('tmArc');
  if (!clock) return;
  const total = currentMinutes() * 60000;
  const remain = Math.max(0, state.remainMs);
  const mm = Math.floor(remain / 60000);
  const ss = Math.floor(remain % 60000 / 1000);
  clock.textContent = SL.fmt.pad(mm) + ':' + SL.fmt.pad(ss);
  if (arc) {
    const C = 2 * Math.PI * 104;
    arc.setAttribute('stroke-dashoffset', String(C * (1 - remain / total)));
    arc.setAttribute('stroke', state.mode === 'break' ? 'var(--success)' : 'var(--accent)');
  }
  document.title = state.running && !state.paused ? SL.fmt.pad(mm) + ':' + SL.fmt.pad(ss) + ' · 研轻' : '研轻 StudyLean — 上岸，也上秤。';
}

function syncUI() {
  const start = document.getElementById('tmStart');
  const pauseB = document.getElementById('tmPause');
  const resume = document.getElementById('tmResume');
  const stopB = document.getElementById('tmStop');
  const label = document.getElementById('tmLabel');
  if (!start) return;
  if (state.running && !state.paused) {
    start.classList.add('hidden'); pauseB.classList.remove('hidden');
    resume.classList.add('hidden'); stopB.classList.remove('hidden');
    if (label) label.textContent = state.mode === 'focus' ? '专注中…' : '休息中…';
    document.title = '专注中 · 研轻';
  } else if (state.running && state.paused) {
    start.classList.add('hidden'); pauseB.classList.add('hidden');
    resume.classList.remove('hidden'); stopB.classList.remove('hidden');
    if (label) label.textContent = '已暂停';
  } else {
    start.classList.remove('hidden'); pauseB.classList.add('hidden');
    resume.classList.add('hidden'); stopB.classList.add('hidden');
    if (label) label.textContent = state.mode === 'focus' ? '准备开始专注' : '准备休息';
    document.title = '研轻 StudyLean — 上岸，也上秤。';
  }
  updateClockUI();
}

function saveHistory(minutes, label) {
  const t = SL.getData('timer');
  t.history.unshift({ id: SL.id(), start: Date.now() - minutes * 60000, end: Date.now(), minutes, label: label || '', type: 'focus' });
  if (t.history.length > 2000) t.history.length = 2000;
  SL.setData('timer', t);
}

function pickSpecies(minutes) {
  if (minutes >= 90) return 'ginkgo';
  if (minutes >= 50) return 'oak';
  if (minutes >= 30) return 'pine';
  return 'sprout';
}

/* ===== 视图子区块 ===== */
function historyHTML() {
  const today = SL.fmt.date(new Date());
  const list = (SL.getData('timer').history || []).filter(r => SL.fmt.date(new Date(r.start)) === today);
  if (!list.length) {
    return '<div class="empty-state empty-state--sm">' + SL.icon('timer', 36) + '<p>今天还没有专注记录<br>点击上方按钮开始第一个番茄</p></div>';
  }
  return '<div>' + list.slice(0, 12).map(r =>
    '<div class="row"><span>' + SL.icon('timer', 15) + ' ' + SL.esc(r.label || '专注') + '</span>' +
    '<span class="muted" style="font-size:12px;">' + SL.fmt.time(new Date(r.end)) + ' · ' + r.minutes + ' 分钟</span></div>'
  ).join('') + '</div>';
}

function weekStats() {
  const days = [];
  let total = 0;
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = SL.fmt.date(d);
    const min = (SL.getData('timer').history || []).reduce((s, r) => s + (SL.fmt.date(new Date(r.start)) === key ? r.minutes : 0), 0);
    total += min;
    days.push({ label: ['日', '一', '二', '三', '四', '五', '六'][d.getDay()], min });
  }
  return { days, total };
}

function openGear() {
  const s = SL.getData('timer').settings;
  const close = SL.modal({
    title: '番茄时长设置',
    body:
      '<div class="field"><label>专注时长（分钟）</label><input class="input" id="tmFocusMin" type="number" min="5" max="180" value="' + s.focusMin + '"></div>' +
      '<div class="field"><label>休息时长（分钟）</label><input class="input" id="tmBreakMin" type="number" min="1" max="60" value="' + s.breakMin + '"></div>' +
      '<p class="muted" style="font-size:12px;">经典配置 25/5，深度学习推荐 45/10 或 50/10。</p>',
    actions: [
      { label: '取消', onClick: () => close() },
      { label: '保存', primary: true, onClick: () => {
          const f = SL.parseNum(document.getElementById('tmFocusMin').value, 25);
          const b = SL.parseNum(document.getElementById('tmBreakMin').value, 5);
          if (f < 5 || f > 180 || b < 1 || b > 60) { SL.toast('范围：专注 5-180，休息 1-60', 'error'); return; }
          const t = SL.getData('timer');
          t.settings = { focusMin: f, breakMin: b };
          SL.setData('timer', t);
          close();
          if (!state.running) { state.mode = 'focus'; resetClock(f); }
          render(document.getElementById('view'), viewParams);
          SL.toast('已保存', 'success');
        } }
    ]
  });
}

export { render, destroy, meta };
