/**
 * StudyLean app.js — 应用 Shell 引导
 * Contractor: SA-01 (Director) | Contract: ARCHITECTURE v2.0
 * 职责：路由(懒加载)/侧边栏/顶栏/移动端Tab+抽屉/主题引擎/Onboarding/提醒服务
 */
'use strict';

/* ===== 启动守卫与初始化 ===== */
// 云配置恢复（ARCHITECTURE §4.4）：设置页存于 localStorage sl_cloud_config，
// 启动时还原到 window.SL_CLOUD_CONFIG，否则刷新后云模式静默失效
try {
  const _cc = JSON.parse(localStorage.getItem('sl_cloud_config') || 'null');
  if (_cc && _cc.url && _cc.anonKey) window.SL_CLOUD_CONFIG = _cc;
} catch (e) { /* 无效配置忽略，走本地模式 */ }

SL.init();

if (!SL.state.user) {
  // 无会话 → 回入口页（auth.js 正常情况下已处理，此处兜底）
  location.replace('index.html');
}

/* ===== 主题引擎 ===== */
const mediaDark = window.matchMedia('(prefers-color-scheme: dark)');
let themeFirstApply = true; // 首次应用主题不做过场动画（避免首屏闪白/截图截到半程过渡）
function applyTheme() {
  const s = SL.getData('settings');
  const mode = s.themeMode === 'auto' ? (mediaDark.matches ? 'dark' : 'light') : s.themeMode;
  const html = document.documentElement;
  if (!themeFirstApply) html.classList.add('theme-transition');
  themeFirstApply = false;
  html.dataset.theme = mode;
  html.dataset.accent = s.accent || 'indigo';
  html.dataset.cozy = String(!!s.cozy);
  html.dataset.compact = String(!!s.compact);
  setTimeout(() => html.classList.remove('theme-transition'), 320);
  const btn = document.getElementById('btnTheme');
  if (btn) btn.innerHTML = SL.icon(mode === 'dark' ? 'sun' : 'moon', 18);
}
mediaDark.addEventListener('change', () => { if (SL.getData('settings').themeMode === 'auto') applyTheme(); });
SL.on('theme', applyTheme);
// settings 变化时同步主题（设置页改 accent/cozy/themeMode 走 data:settings，主题按钮除外防双触发）
SL.on('data:settings', applyTheme);

/* ===== 视图注册表（22 项） ===== */
const VIEWS = [
  { id: 'dashboard',    title: '仪表盘',   icon: 'home',      group: '首页', mod: () => import('./module-dashboard.js') },
  { id: 'countdown',    title: '考试倒计时', icon: 'countdown', group: '学习', mod: () => import('./module-countdown.js') },
  { id: 'timer',        title: '番茄专注',  icon: 'timer',     group: '学习', mod: () => import('./module-timer.js') },
  { id: 'noise',        title: '白噪音',   icon: 'music',     group: '学习', mod: () => import('./module-noise.js') },
  { id: 'todo',         title: '待办清单',  icon: 'list',      group: '学习', mod: () => import('./module-todo.js') },
  { id: 'knowledge',    title: '备考知识库', icon: 'book',     group: '学习', mod: () => import('./module-knowledge.js') },
  { id: 'calories',     title: '卡路里',   icon: 'food',      group: '体重', mod: () => import('./module-calories.js') },
  { id: 'weight',       title: '体重管理',  icon: 'scale',     group: '体重', mod: () => import('./module-weight.js') },
  { id: 'sport',        title: '运动消耗',  icon: 'run',       group: '体重', mod: () => import('./module-sport.js') },
  { id: 'water',        title: '喝水记录',  icon: 'water',     group: '体重', mod: () => import('./module-water.js') },
  { id: 'sleep',        title: '睡眠记录',  icon: 'bed',       group: '体重', mod: () => import('./module-sleep.js') },
  { id: 'diary',        title: '日记簿',    icon: 'diary',     group: '记录', mod: () => import('./module-diary.js') },
  { id: 'habits',       title: '习惯打卡',  icon: 'flame',     group: '记录', mod: () => import('./module-habits.js') },
  { id: 'calendar',     title: '日历总览',  icon: 'calendar',  group: '记录', mod: () => import('./module-calendar.js') },
  { id: 'stats',        title: '数据统计',  icon: 'chart',     group: '记录', mod: () => import('./module-stats.js') },
  { id: 'forest',       title: '专注森林',  icon: 'tree',      group: '记录', mod: () => import('./module-forest.js') },
  { id: 'goals',        title: '目标管理',  icon: 'target',    group: '记录', mod: () => import('./module-goals.js') },
  { id: 'achievements', title: '成就勋章',  icon: 'trophy',    group: '激励', mod: () => import('./module-achievements.js') },
  { id: 'shop',         title: '自律商城',  icon: 'wallet',    group: '激励', mod: () => import('./module-shop.js') },
  { id: 'quote',        title: '每日一句',  icon: 'quote',     group: '激励', mod: () => import('./module-quote.js') },
  { id: 'reminder',     title: '提醒中心',  icon: 'bell',      group: '系统', mod: () => import('./module-reminder.js') },
  { id: 'settings',     title: '设置',     icon: 'settings',  group: '系统', mod: () => import('./module-settings.js') }
];
const VIEW_MAP = Object.fromEntries(VIEWS.map(v => [v.id, v]));
const GROUP_ORDER = ['首页', '学习', '体重', '记录', '激励', '系统'];

/* ===== SL.go 增强（支持 params） ===== */
let pendingParams = null;
SL.go = function (view, params) {
  pendingParams = params || null;
  const target = '#/' + view;
  if (location.hash === target) { navigate(); }
  else location.hash = target;
};

/* ===== 快速连点导航竞态防护 ===== */
// navigate 为 async：连续两次 SL.go 时，先发出的 import 可能后完成并覆盖新视图。
// 每次 navigate 递增 seq，import 返回后校验 seq 未变才渲染，过期结果直接丢弃。
let navSeq = 0;

/* ===== 模块 CSS 懒加载 ===== */
function ensureCss(id) {
  if (!document.querySelector('link[data-mcss="' + id + '"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'assets/css/m/' + id + '.css';
    link.dataset.mcss = id;
    document.head.appendChild(link);
  }
}

/* ===== 路由 ===== */
const viewEl = document.getElementById('view');
let currentModule = null;
let currentViewId = null;

function parseHash() {
  const m = location.hash.match(/^#\/([a-z]+)/i);
  return m ? m[1] : 'dashboard';
}

async function navigate() {
  const id = parseHash();
  const def = VIEW_MAP[id];
  if (!def) { location.hash = '#/dashboard'; return; }
  const params = pendingParams; pendingParams = null;
  const seq = ++navSeq;

  // 卸载上一个模块
  if (currentModule && typeof currentModule.destroy === 'function') {
    try { currentModule.destroy(); } catch (e) { console.warn('[router] destroy error', e); }
  }
  currentModule = null;
  currentViewId = id;

  // 导航高亮 & 标题
  document.querySelectorAll('.sl-nav__item').forEach(el => el.classList.toggle('is-active', el.dataset.view === id));
  document.querySelectorAll('.sl-drawer__cell').forEach(el => el.classList.toggle('is-active', el.dataset.view === id));
  document.querySelectorAll('.sl-mobile-tab__item').forEach(el => el.classList.toggle('is-active', el.dataset.tab === tabGroupOf(id)));
  document.getElementById('viewTitle').textContent = def.title;

  ensureCss(id);
  viewEl.innerHTML = '<div class="view-loading" style="text-align:center;padding:60px 0;color:var(--fg-muted);">' + SL.icon('refresh', 22) + ' 加载中…</div>';
  try {
    const mod = await def.mod();
    if (seq !== navSeq) return; // 已有更新的导航发出，丢弃本次过期结果
    currentModule = mod;
    viewEl.innerHTML = '';
    await mod.render(viewEl, params || {});
    if (seq !== navSeq) return; // render 内部可能又触发跳转
    SL.staggerIn(viewEl);
    SL.bindCardSwipe(viewEl);
    SL.refreshBadges();
    viewEl.focus({ preventScroll: true });
  } catch (e) {
    if (seq !== navSeq) return;
    console.error('[router] load failed:', id, e);
    viewEl.innerHTML =
      '<div class="empty-state" style="padding:60px 0;">' + SL.icon('x', 44) +
      '<p>模块加载失败：' + SL.esc(def.title) + '</p>' +
      '<button class="btn btn--primary" onclick="location.reload()">刷新页面</button></div>';
  }
}
window.addEventListener('hashchange', navigate);

// 首次渲染标记：location.hash 赋值会触发 hashchange+navigate，避免 navigate() 再被手动调用一次
// 导致同一模块 render 两次、第一次实例的定时器/监听无法 destroy（内存泄漏）

function tabGroupOf(id) {
  const v = VIEW_MAP[id];
  if (!v) return 'home';
  if (v.group === '首页') return 'home';
  if (['学习'].includes(v.group)) return 'study';
  if (v.group === '体重') return 'body';
  if (v.group === '记录') return 'record';
  return 'more';
}

/* ===== 侧边栏渲染 ===== */
function renderSidebar() {
  const nav = document.getElementById('nav');
  let html = '';
  GROUP_ORDER.forEach(g => {
    html += '<div class="sl-nav__group"><div class="sl-nav__group-title">' + g + '</div>';
    VIEWS.filter(v => v.group === g).forEach(v => {
      html += '<button class="sl-nav__item" type="button" data-view="' + v.id + '">' +
        SL.icon(v.icon, 17) + '<span>' + v.title + '</span></button>';
    });
    html += '</div>';
  });
  nav.innerHTML = html;
  nav.querySelectorAll('.sl-nav__item').forEach(btn => {
    btn.addEventListener('click', () => { SL.go(btn.dataset.view); closeDrawer(); });
  });
}

/* ===== 侧边栏进度环 & 徽章 ===== */
SL._implRefreshBadges = function () {
  const wrap = document.getElementById('sideProgress');
  if (!wrap) return;
  const items = SL.getData('habits').items || [];
  const today = SL.fmt.date(new Date());
  const done = items.filter(h => h.records && h.records[today]).length;
  const total = items.length;
  const pct = total ? done / total : 0;
  const R = 17, C = 2 * Math.PI * R;
  const color = total && done === total ? 'var(--success)' : 'var(--accent)';
  wrap.innerHTML =
    '<svg width="44" height="44" viewBox="0 0 44 44">' +
    '<circle cx="22" cy="22" r="' + R + '" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="4"/>' +
    '<circle cx="22" cy="22" r="' + R + '" fill="none" stroke="' + color + '" stroke-width="4" stroke-linecap="round" ' +
    'stroke-dasharray="' + C + '" stroke-dashoffset="' + (C * (1 - pct)) + '" transform="rotate(-90 22 22)" style="transition:stroke-dashoffset .6s ease"/>' +
    '<text x="22" y="26" text-anchor="middle" fill="#fff" font-size="11" font-weight="700">' + done + '</text></svg>' +
    '<div class="sl-sidebar__progress-text">今日打卡 <b>' + done + '/' + total + '</b><br>专注 ' + SL.helpers.timerTodayMin() + ' 分钟</div>';
};

/* ===== 用户卡 ===== */
function dayCount() {
  const u = SL.state.user || {};
  let created = u.createdAt;
  if (!created) {
    created = Number(localStorage.getItem('sl_created_at')) || Date.now();
    localStorage.setItem('sl_created_at', String(created));
    u.createdAt = created;
  }
  return Math.max(1, Math.floor((Date.now() - created) / 86400000) + 1);
}
function renderUserCard() {
  const u = SL.state.user || { name: '同学' };
  const el = document.getElementById('userCard');
  el.innerHTML =
    '<span class="sl-usercard__avatar">' + SL.esc((u.name || '同').charAt(0).toUpperCase()) + '</span>' +
    '<span><span class="sl-usercard__name">' + SL.esc(u.name || '同学') + '</span>' +
    '<br><span class="sl-usercard__sub">第 ' + dayCount() + ' 天自律日' + (u.guest ? ' · 游客' : '') + '</span></span>';
}
SL.on('user', renderUserCard);

function openAccountModal() {
  const u = SL.state.user || { name: '' };
  const close = SL.modal({
    title: '账号设置',
    body:
      '<div class="field"><label>昵称</label><input class="input" id="accName" maxlength="16" value="' + SL.esc(u.name || '') + '"></div>' +
      '<p class="muted" style="font-size:12.5px;margin:6px 0 0;">' + (u.guest ? '当前为游客模式，数据仅存本机。' : '账号数据保存在本浏览器。') + '</p>' +
      '<p class="muted" style="font-size:12.5px;">云同步与更多选项请前往 <a href="javascript:void 0" id="accToSettings">设置</a>。</p>',
    actions: [
      { label: '登出', danger: true, onClick: async () => {
          close();
          await SL.confirm('确定登出吗？本地数据会保留，登录后可继续使用。') && doLogout();
        } },
      { label: '保存', primary: true, onClick: () => {
          const name = document.getElementById('accName').value.trim();
          if (name) {
            SL.state.user.name = name;
            localStorage.setItem('sl_session', JSON.stringify(SL.state.user));
            if (SL.auth && SL.auth.persistName) SL.auth.persistName(name);
            SL.emit('user');
            SL.toast('昵称已更新', 'success');
          }
          close();
        } }
    ]
  });
  setTimeout(() => {
    const link = document.getElementById('accToSettings');
    if (link) link.onclick = () => { close(); SL.go('settings'); };
  }, 50);
}
async function doLogout() {
  try { if (SL.auth && SL.auth.logout) await SL.auth.logout(); } catch (e) { console.warn(e); }
  location.replace('index.html');
}
document.getElementById('userCard').addEventListener('click', openAccountModal);
document.getElementById('btnUser').addEventListener('click', openAccountModal);

/* ===== 顶栏 ===== */
function renderTopbarDate() {
  const d = new Date();
  document.getElementById('viewDate').textContent =
    d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 · 周' + SL.fmt.weekday(d);
}
SL.on('tick', renderTopbarDate);

// 顶栏按钮图标注入（app.html 中按钮为空壳，SL.icon 统一填充）
function renderTopbarIcons() {
  const setSearch = (id, name) => {
    const el = document.getElementById(id);
    if (el && !el.innerHTML.trim()) el.innerHTML = SL.icon(name, 18);
  };
  setSearch('btnSearch', 'search');
  setSearch('btnBell', 'bell');
  setSearch('btnUser', 'user');
  // btnTheme 的图标由 applyTheme 按当前模式填充
}

document.getElementById('btnTheme').addEventListener('click', () => {
  const s = SL.getData('settings');
  const order = ['light', 'dark', 'auto'];
  s.themeMode = order[(order.indexOf(s.themeMode) + 1) % 3];
  SL.setData('settings', s);
  SL.emit('theme'); // 触发 applyTheme，否则顶栏切主题视觉不变
  const label = { light: '浅色', dark: '深色', auto: '跟随系统' }[s.themeMode];
  SL.toast('主题：' + label, 'info');
});
document.getElementById('btnBell').addEventListener('click', () => SL.go('reminder'));
document.getElementById('btnSearch').addEventListener('click', () => {
  // MP-04：prompt() 在部分移动浏览器（iOS Safari 限制/隐私模式）被禁用或体验极差，
  // 改为 SL.modal 输入框（与全站 confirm/modal 一致的交互）
  const close = SL.modal({
    title: '搜索日记',
    body:
      '<div class="field"><label>关键词</label>' +
      '<input class="input" id="slSearchKw" placeholder="搜索日记标题/内容…" maxlength="60"></div>',
    actions: [
      { label: '取消', onClick: () => close() },
      { label: '搜索', primary: true, onClick: () => {
          const kw = (document.getElementById('slSearchKw')?.value || '').trim();
          close();
          if (kw) SL.go('diary', { search: kw });
        } }
    ]
  });
  setTimeout(() => {
    const inp = document.getElementById('slSearchKw');
    if (!inp) return;
    inp.focus({ preventScroll: true });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const kw = inp.value.trim();
        close();
        if (kw) SL.go('diary', { search: kw });
      }
    });
  }, 80);
});

/* ===== 移动端 Tab & 抽屉 ===== */
function renderMobileTab() {
  const tab = document.getElementById('mobileTab');
  const tabs = [
    { key: 'home', icon: 'home', label: '仪表盘', view: 'dashboard' },
    { key: 'study', icon: 'timer', label: '学习', view: 'timer' },
    { key: 'body', icon: 'food', label: '体重', view: 'calories' },
    { key: 'record', icon: 'diary', label: '记录', view: 'diary' },
    { key: 'more', icon: 'grid', label: '更多', view: null }
  ];
  tab.innerHTML = tabs.map(t =>
    '<button class="sl-mobile-tab__item" type="button" data-tab="' + t.key + '">' +
    SL.icon(t.icon, 20) + '<span>' + t.label + '</span></button>'
  ).join('');
  tab.querySelectorAll('.sl-mobile-tab__item').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.tab;
      if (key === 'more') openDrawer();
      else SL.go(tabs.find(t => t.key === key).view);
    });
  });
}

const drawer = document.getElementById('drawer');
function openDrawer() {
  const panel = document.getElementById('drawerPanel');
  const u = SL.state.user || { name: '同学' };
  const quick = [
    { icon: 'download', label: '导出', fn: () => { closeDrawer(); SL.go('settings', { sec: 'data' }); } },
    { icon: 'upload', label: '导入', fn: () => { closeDrawer(); SL.go('settings', { sec: 'data' }); } },
    { icon: 'moon', label: '主题', fn: () => { closeDrawer(); document.getElementById('btnTheme').click(); } },
    { icon: 'bell', label: '提醒', fn: () => { closeDrawer(); SL.go('reminder'); } },
    { icon: 'book', label: '知识库', fn: () => { closeDrawer(); SL.go('knowledge'); } },
    { icon: 'wallet', label: '商城', fn: () => { closeDrawer(); SL.go('shop'); } },
    { icon: 'trophy', label: '成就', fn: () => { closeDrawer(); SL.go('achievements'); } },
    { icon: 'quote', label: '语录', fn: () => { closeDrawer(); SL.go('quote'); } }
  ];
  panel.innerHTML =
    '<div class="sl-drawer__grip"></div>' +
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">' +
    '<span class="sl-usercard__avatar">' + SL.esc((u.name || '同').charAt(0).toUpperCase()) + '</span>' +
    '<div><b>' + SL.esc(u.name || '同学') + '</b><div class="muted" style="font-size:11.5px;">第 ' + dayCount() + ' 天自律日</div></div>' +
    '<span style="flex:1"></span>' +
    '<button class="btn btn--ghost btn--sm" id="drawerLogout">' + SL.icon('logout', 15) + ' 登出</button></div>' +
    '<div class="sl-drawer__grid" style="margin-bottom:10px;">' + quick.map((q, i) =>
      '<button class="sl-drawer__cell" type="button" data-quick="' + i + '">' + SL.icon(q.icon, 19) + q.label + '</button>').join('') +
    '</div>' +
    '<div class="sl-drawer__grid">' + VIEWS.map(v =>
      '<button class="sl-drawer__cell" type="button" data-view="' + v.id + '">' + SL.icon(v.icon, 19) + v.title + '</button>').join('') +
    '</div>';
  panel.querySelectorAll('[data-quick]').forEach(b => b.addEventListener('click', () => quick[+b.dataset.quick].fn()));
  panel.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => { SL.go(b.dataset.view); closeDrawer(); }));
  panel.querySelector('#drawerLogout').addEventListener('click', async () => {
    closeDrawer();
    if (await SL.confirm('确定登出吗？')) doLogout();
  });
  // 当前视图高亮
  panel.querySelectorAll('[data-view]').forEach(el => el.classList.toggle('is-active', el.dataset.view === currentViewId));
  drawer.classList.add('is-open');
  // MG-05：抽屉打开时锁定 body 滚动（iOS 触摸穿透），防止背景跟手滚动
  document.body.classList.add('sl-lock');
}
function closeDrawer() {
  drawer.classList.remove('is-open');
  document.body.classList.remove('sl-lock');
}
document.getElementById('drawerMask').addEventListener('click', closeDrawer);

// MG-05：横竖屏切换/旋转后复位抽屉（旋转会重排视口，保持打开态易出现错位与滚动锁卡死）
window.addEventListener('orientationchange', () => {
  setTimeout(closeDrawer, 150);
});

/* ===== MP-04：iOS/Android 键盘弹起处理 =====
   键盘弹出时 visualViewport 高度显著缩短，fixed 底部 Tab 会悬在键盘上方遮挡输入框。
   简单方案：visualViewport resize 时对比布局视口，键盘开启则给 body 加 .sl-kb-open
   （CSS 中隐藏 Tab），收起时移除。100dvh 的 @supports 兜底已由 layout.css 覆盖。 */
(function () {
  const vv = window.visualViewport;
  if (!vv) return; // 不支持时维持原状（dvh 兜底已处理大部分场景）
  let kbOpen = false;
  function onResize() {
    // 键盘通常占视口 ≥120px；再排除旋转/缩放造成的短暂抖动
    const hidden = window.innerHeight - vv.height > 120;
    if (hidden !== kbOpen) {
      kbOpen = hidden;
      document.body.classList.toggle('sl-kb-open', kbOpen);
    }
  }
  vv.addEventListener('resize', onResize);
  vv.addEventListener('scroll', onResize);
})();

/* ===== Onboarding（首启动 4 步引导） ===== */
let onboardingActive = false; // 防重入守卫：tick 间隙重复调用/手动触发时不再叠层
function showOnboarding() {
  if (onboardingActive || SL.getData('onboarded')) return;
  onboardingActive = true;
  let step = 0;
  const steps = [renderStepWelcome, renderStepExam, renderStepBody, renderStepDone];
  const overlay = document.createElement('div');
  overlay.className = 'onboarding';
  document.body.appendChild(overlay);

  function go(n) {
    step = n;
    steps[step]();
  }
  function finish() {
    onboardingActive = false;
    SL.setData('onboarded', true, true);
    SL.saveNow();
    overlay.remove();
    SL.toast('欢迎使用研轻！开始你的自律之旅吧', 'success');
    navigate();
  }
  function base(inner, showSkip) {
    overlay.innerHTML =
      '<div class="onboarding__card">' +
      '<div class="onboarding__steps">' + [0, 1, 2, 3].map(i => '<span class="onboarding__dot' + (i === step ? ' is-on' : '') + '"></span>').join('') + '</div>' +
      inner +
      (showSkip ? '<button class="btn btn--ghost btn--sm" id="obSkip" style="position:absolute;top:16px;right:16px;">跳过</button>' : '') +
      '</div>';
    const skip = overlay.querySelector('#obSkip');
    if (skip) skip.onclick = finish;
  }

  function renderStepWelcome() {
    base(
      '<div style="text-align:center;padding:8px 4px 4px;">' +
      '<img src="assets/img/logo.svg" width="64" height="64" alt=""> ' +
      '<h2 style="margin:14px 0 6px;">欢迎使用研轻</h2>' +
      '<p class="muted">上岸，也上秤。<br>考研冲刺 × 科学减脂，一站式自律中枢。<br>24 个功能模块，全部免费，数据保存在你自己的设备上。</p></div>' +
      '<button class="btn btn--primary btn--lg" id="obNext" style="width:100%;margin-top:18px;">开始配置</button>', true);
    overlay.querySelector('#obNext').onclick = () => go(1);
  }
  function renderStepExam() {
    const d = SL.getData('countdown');
    const hasExam = (d.exams || []).length > 0;
    base(
      '<h3>设置你的考研倒计时</h3>' +
      '<p class="muted" style="font-size:13px;">目标日期会以天/时/分/秒实时倒计时，紧迫感拉满。</p>' +
      (hasExam ? '<p class="success-text" style="font-size:13px;">已检测到倒计时配置，可跳过此步。</p>' : '') +
      '<div class="field"><label>考试名称</label><input class="input" id="obExamName" value="2027 考研"></div>' +
      '<div class="field"><label>考试日期</label><input class="input" id="obExamDate" type="date" value="2026-12-19"></div>' +
      '<div style="display:flex;gap:10px;margin-top:16px;">' +
      '<button class="btn btn--ghost" id="obBack" style="flex:1;">上一步</button>' +
      '<button class="btn btn--primary" id="obNext" style="flex:2;">下一步</button></div>', true);
    overlay.querySelector('#obBack').onclick = () => go(0);
    overlay.querySelector('#obNext').onclick = () => {
      const name = overlay.querySelector('#obExamName').value.trim() || '2027 考研';
      const date = overlay.querySelector('#obExamDate').value || '2026-12-19';
      const cd = SL.getData('countdown');
      if (!(cd.exams || []).some(e => e.name === name)) {
        cd.exams = cd.exams || [];
        cd.exams.push({ id: SL.id(), name: name, date: date, color: '#5B6CFF', icon: 'countdown', createdAt: Date.now() });
        SL.setData('countdown', cd, true);
      }
      go(2);
    };
  }
  function renderStepBody() {
    const w = SL.getData('weight');
    base(
      '<h3>告诉研轻你的身体目标</h3>' +
      '<p class="muted" style="font-size:13px;">用于计算 BMI、基础代谢和每日卡路里建议。</p>' +
      '<div style="display:flex;gap:10px;">' +
      '<div class="field" style="flex:1;"><label>身高 (cm)</label><input class="input" id="obHeight" type="number" value="' + (w.profile.heightCm || 170) + '"></div>' +
      '<div class="field" style="flex:1;"><label>目标体重 (kg)</label><input class="input" id="obTarget" type="number" step="0.1" value="' + (w.profile.targetKg || 60) + '"></div></div>' +
      '<div class="field"><label>当前体重 (kg，可稍后在体重页记录)</label><input class="input" id="obNow" type="number" step="0.1" placeholder="如 68"></div>' +
      '<div style="display:flex;gap:10px;margin-top:16px;">' +
      '<button class="btn btn--ghost" id="obBack" style="flex:1;">上一步</button>' +
      '<button class="btn btn--primary" id="obNext" style="flex:2;">下一步</button></div>', true);
    overlay.querySelector('#obBack').onclick = () => go(1);
    overlay.querySelector('#obNext').onclick = () => {
      const p = SL.getData('weight');
      const h = SL.parseNum(overlay.querySelector('#obHeight').value, p.profile.heightCm);
      const t = SL.parseNum(overlay.querySelector('#obTarget').value, p.profile.targetKg);
      if (h > 100 && h < 250) p.profile.heightCm = h;
      if (t > 25 && t < 300) p.profile.targetKg = t;
      const now = SL.parseNum(overlay.querySelector('#obNow').value, 0);
      if (now > 25 && now < 300) {
        p.records.unshift({ id: SL.id(), date: SL.fmt.date(new Date()), kg: now, bodyFat: null });
      }
      SL.setData('weight', p, true);
      go(3);
    };
  }
  function renderStepDone() {
    base(
      '<div style="text-align:center;padding:8px 4px;">' +
      SL.icon('checkCircle', 52).replace('currentColor', 'var(--success)') +
      '<h2 style="margin:14px 0 6px;">一切就绪！</h2>' +
      '<p class="muted">每天打卡 1 次，记录 1 餐，专注 1 个番茄。<br>小步慢跑，直到上岸，也上秤。</p></div>' +
      '<button class="btn btn--primary btn--lg" id="obDone" style="width:100%;margin-top:18px;">进入研轻</button>', false);
    overlay.querySelector('#obDone').onclick = finish;
  }
  go(0);
}

/* ===== 提醒服务（喝水/站立，分钟级 tick） ===== */
SL.on('tick', () => {
  const n = SL.getData('notifications').settings;
  const now = Date.now();
  function maybe(kind, enabled, gapMin, msg) {
    const key = 'sl_last_hint_' + kind;
    const last = Number(localStorage.getItem(key) || 0);
    if (!enabled || !gapMin) return;
    if (now - last > gapMin * 60000 && document.visibilityState === 'visible') {
      localStorage.setItem(key, String(now));
      SL.toast(msg, 'info');
      if (window.Notification && Notification.permission === 'granted') {
        try { new Notification('研轻提醒', { body: msg }); } catch (e) { /* noop */ }
      }
    }
  }
  maybe('water', n.water, n.waterGap, '该喝水啦，小口慢饮更健康');
  maybe('stand', n.stand, n.standGap, '久坐提醒：站起来活动 2 分钟');
});
SL.on('data:water', () => localStorage.setItem('sl_last_hint_water', String(Date.now())));

/* ===== 启动 ===== */
renderSidebar();
renderMobileTab();
renderUserCard();
renderTopbarDate();
renderTopbarIcons();
applyTheme();
SL.refreshBadges();

if (!location.hash) {
  // 无 hash：赋值会自动触发 hashchange → navigate()，无需手动再调一次
  location.hash = '#/dashboard';
} else {
  // 已有 hash：不会再触发 hashchange，手动导航
  navigate();
}

if (!SL.getData('onboarded')) {
  setTimeout(() => { try { showOnboarding(); } catch (e) { console.error('[onboarding]', e); } }, 600);
}
