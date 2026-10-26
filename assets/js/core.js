/**
 * StudyLean core.js — 图标系统 / 工具函数 / 动画助手
 * Contractor: SA-01 (Director)
 * Contract: ARCHITECTURE v2.0
 * 依赖 store.js（先于本文件加载）。本文件扩展 window.SL。
 */
(function () {
  'use strict';
  if (!window.SL) { console.error('[core] store.js must load before core.js'); return; }
  const SL = window.SL;

  /* ============ 图标系统（内联 SVG，24x24，stroke 风格） ============ */
  // path 定义：d / 可选 fill
  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2"/><path d="M9 2h6"/>',
    countdown: '<circle cx="12" cy="13" r="8"/><path d="M12 13V8"/><path d="M9 2h6"/><path d="M12 2v3"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    diary: '<path d="M4 4h13a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z"/><path d="M4 4v16"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    flame: '<path d="M12 2s4 4 4 8a4 4 0 0 1-8 0c0-1.5.5-2.5 1-3.5C9 8 8 10 8 13a6 6 0 0 0 12 0c0-5-4-8-8-11z"/>',
    scale: '<rect x="3" y="6" width="18" height="15" rx="3"/><path d="M8 6l4-4 4 4"/><circle cx="12" cy="13" r="3.5"/><path d="M12 9.5V13l2.5 2.5"/>',
    run: '<circle cx="14" cy="4.5" r="2"/><path d="M4 13l4-2 3-3 3 2 4 1"/><path d="M9 20l2-5-3-2 1-3"/><path d="M11 15l3 2 1 3"/>',
    walk: '<circle cx="13" cy="4" r="2"/><path d="M9 21l2-6-2-2 2-4 3 1 3 1"/><path d="M11 15l3 1 1 5"/>',
    dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11"/>',
    water: '<path d="M12 2.7 6.4 9.3a7.6 7.6 0 1 0 11.2 0z"/><path d="M12 2.7 8 8h8" opacity=".4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>',
    calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 9h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>',
    tree: '<path d="M12 2 6 10h3l-4 7h6v5h2v-5h6l-4-7h3z"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8l-6.2 3.3L7 14.2l-5-4.9 6.9-1z"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v6a5 5 0 0 1-10 0z"/><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3"/>',
    zap: '<path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/>',
    heart: '<path d="M12 21s-8-5.3-8-11a4.6 4.6 0 0 1 8-3.1A4.6 4.6 0 0 1 20 10c0 5.7-8 11-8 11z"/>',
    coffee: '<path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 9h2.5a2.5 2.5 0 0 1 0 5H17"/><path d="M6 3v2M10 3v2M14 3v2"/>',
    check: '<path d="m4.5 12.5 5 5L20 6.5"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.7 2.7L16.5 9"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    edit: '<path d="M4 20h4l11-11-4-4L4 16v4z"/><path d="m13.5 6.5 4 4"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/><path d="M10 11v6M14 11v6"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
    bell: '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 19a2 2 0 0 0 4 0"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.7l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.7-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-1-1.4 1.6 1.6 0 0 0-1.7.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.7 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.4-1 1.6 1.6 0 0 0-.3-1.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.7.3h.1a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.7-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.7v.1a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    cloud: '<path d="M17.5 19a4.5 4.5 0 0 0 .9-8.9 6 6 0 0 0-11.6-1.4A5 5 0 0 0 7 19h10.5z"/>',
    download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 19h16"/>',
    upload: '<path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M4 19h16"/>',
    quote: '<path d="M9 7H6a3 3 0 0 0-3 3v7h7v-7H6"/><path d="M20 7h-3a3 3 0 0 0-3 3v7h7v-7h-3"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1" fill="currentColor" stroke="none"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    rain: '<path d="M17.5 13a4.5 4.5 0 0 0-.9-8.9 6 6 0 0 0-11.6 1.4A5 5 0 0 0 7 13"/><path d="M8 17v3M12 16v4M16 17v3"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    shield: '<path d="M12 2 4 5v6c0 5.5 3.4 9.4 8 11 4.6-1.6 8-5.5 8-11V5z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    sparkles: '<path d="m12 3 1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/><path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    food: '<path d="M5 3v7a3 3 0 0 0 6 0V3"/><path d="M8 10v11"/><path d="M15 3c-1.5 2-2 4-2 6s.5 2 2 2 2 0 2-2-.5-4-2-6z"/><path d="M17 11v10"/>',
    bed: '<path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6"/><path d="M3 18h18M3 18v3M21 18v3"/><path d="M6 10V7h12v3"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01"/><path d="M12 11v5"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/>',
    chevronL: '<path d="m15 5-7 7 7 7"/>',
    chevronR: '<path d="m9 5 7 7-7 7"/>',
    chevronD: '<path d="m5 9 7 7 7-7"/>',
    wallet: '<path d="M3 7a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M16 12h5v4h-5a2 2 0 0 1 0-4z"/>',
    gift: '<rect x="3" y="8" width="18" height="4"/><path d="M5 12v9h14v-9"/><path d="M12 8v13"/><path d="M12 8s-1-5-4.5-5C5 3 5 8 12 8zM12 8s1-5 4.5-5C19 3 19 8 12 8z"/>'
  };

  SL.icon = function (name, size) {
    const s = size || 18;
    const d = ICONS[name] || ICONS.info;
    return '<svg class="icon icon--' + SL.esc(name) + '" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  };
  SL.iconNames = Object.keys(ICONS);

  /* ============ 数值滚动动画 ============ */
  SL.animNum = function (el, value, ms) {
    if (!el) return;
    const target = Number(value);
    // 非有限数值（NaN/Infinity/undefined）直接展示兜底文本，禁止 rAF 死循环
    if (!isFinite(target)) { el.textContent = isNaN(target) ? '0' : SL.fmt.num(target, 1); return; }
    const dur = ms || 600;
    const startRaw = parseFloat(el.dataset.v || '0');
    const start = isFinite(startRaw) ? startRaw : 0;
    const t0 = performance.now();
    el.dataset.v = String(target);
    function frame(t) {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const cur = start + (target - start) * eased;
      el.textContent = (Math.abs(cur % 1) < 0.05 ? Math.round(cur) : cur.toFixed(1));
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  };

  /* ============ 撒花（完成动效） ============ */
  SL.confetti = function (x, y) {
    const cvs = document.createElement('canvas');
    const size = 160;
    cvs.width = size * 2; cvs.height = size * 2;
    cvs.style.cssText = 'position:fixed;left:' + (x - size) + 'px;top:' + (y - size) + 'px;width:' + size * 2 + 'px;height:' + size * 2 + 'px;pointer-events:none;z-index:9998;';
    document.body.appendChild(cvs);
    const ctx = cvs.getContext('2d');
    const colors = ['#5B6CFF', '#FF7AB6', '#2DD4BF', '#F59E0B', '#10B981'];
    const parts = [];
    for (let i = 0; i < 28; i++) {
      const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 4;
      parts.push({ x: size, y: size, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, c: colors[i % colors.length], r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3, life: 1 });
    }
    const t0 = performance.now();
    let done = false;
    function draw(t) {
      // 模块切换/rAF 停顿时兜底移除 canvas，防泄漏
      if (done || !cvs.isConnected) { if (done) cvs.remove(); return; }
      const el = (t - t0) / 1400;
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      if (el >= 1) { done = true; cvs.remove(); return; }
      parts.forEach(p => {
        p.x += p.vx * 2; p.y += p.vy * 2; p.vy += 0.12; p.r += p.vr; p.life = 1 - el;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.c;
        ctx.fillRect(-4, -2.5, 8, 5);
        ctx.restore();
      });
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  };

  /* ============ 卡片入场 stagger ============ */
  SL.staggerIn = function (container) {
    if (!container) return;
    container.querySelectorAll('.stagger > *').forEach((el, i) => {
      el.style.animationDelay = Math.min(i * 30, 400) + 'ms';
    });
  };

  /* ============ 卡片滑动交互（触屏左右滑动显示操作） ============ */
  // MG-05 修复：
  // 1) swipe 后卡片停在 translateX(-80px) 会盖住下层点击/使按钮错位 —— 点击卡片任意处时复位
  // 2) 垂直滑动页面时误改 transform，松手残留 —— 加"水平意图"判定
  // 3) swipe 打开后点击删除等按钮应正常工作（swiped 态不吞事件，只复位视觉）
  SL.bindCardSwipe = function (root) {
    const scope = root || document;
    scope.querySelectorAll('.swipeable').forEach(card => {
      if (card._swipeBound) return;
      card._swipeBound = true;
      let sx = 0, sy = 0, dx = 0, dragging = false, horizontal = false;
      card.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; dragging = true; horizontal = false; dx = 0; }, { passive: true });
      card.addEventListener('touchmove', e => {
        if (!dragging) return;
        dx = e.touches[0].clientX - sx;
        const dy = e.touches[0].clientY - sy;
        // 首次超过 8px 时判定主方向，之后不再反转，避免斜向抖动误触发
        if (!horizontal && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) horizontal = Math.abs(dx) > Math.abs(dy);
        if (horizontal) card.style.transform = 'translateX(' + Math.max(-80, Math.min(0, dx)) + 'px)';
      }, { passive: true });
      card.addEventListener('touchend', () => {
        dragging = false;
        const open = horizontal && dx < -50;
        card.style.transform = open ? 'translateX(-80px)' : '';
        card.classList.toggle('swiped', open);
      }, { passive: true });
      // 已处于 swiped 态时，点按（未滑动）先复位，再放行本次点击给真实按钮
      // MP-04 复验增强：点在操作按钮上（删除/编辑）也同步复位滑出态，
      // 防止操作后卡片停留在 translateX(-80px) 错位遮挡下层内容
      card.addEventListener('click', e => {
        if (card.classList.contains('swiped') && !horizontal) {
          card.classList.remove('swiped');
          card.style.transform = '';
        }
      }, { passive: true });
      // 操作按钮点击后同样复位（按钮自己的 click 处理不受影响）
      card.querySelectorAll('.btn, button').forEach(btn => {
        if (btn._swipeResetBound) return;
        btn._swipeResetBound = true;
        btn.addEventListener('click', () => {
          card.classList.remove('swiped');
          card.style.transform = '';
        }, { passive: true });
      });
    });
  };

  /* ============ 侧边栏徽章刷新（app.js 覆盖实现） ============ */
  SL.refreshBadges = function () {
    if (typeof SL._implRefreshBadges === 'function') SL._implRefreshBadges();
  };

  /* ============ 日期工具扩展 ============ */
  SL.fmt.weekday = function (d) {
    return ['日', '一', '二', '三', '四', '五', '六'][(d instanceof Date ? d : new Date(d)).getDay()];
  };
  SL.fmt.dateTime = function (ts) {
    const d = new Date(ts);
    return SL.fmt.date(d) + ' ' + SL.fmt.time(d);
  };
  // 安全的数值输入解析
  SL.parseNum = function (v, def) {
    const n = parseFloat(v);
    return isNaN(n) ? (def || 0) : n;
  };

  /* ============ SVG 火花线（供各模块行内趋势图复用） ============ */
  SL.sparkline = function (values, w, h, color) {
    if (!values || values.length < 2) return '';
    const width = w || 120, height = h || 32;
    const max = Math.max.apply(null, values), min = Math.min.apply(null, values);
    const span = (max - min) || 1;
    const pts = values.map((v, i) => {
      const x = (i / (values.length - 1)) * (width - 4) + 2;
      const y = height - 3 - ((v - min) / span) * (height - 6);
      return x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');
    const c = color || 'var(--accent)';
    return '<svg width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" aria-hidden="true"><polyline points="' + pts + '" fill="none" stroke="' + c + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/></svg>';
  };

  /* ============ 数据统计助手（跨模块复用） ============ */
  SL.helpers = {
    todayKey() { return SL.fmt.date(new Date()); },
    timerTodayMin() {
      const t = SL.getData('timer').history;
      if (!Array.isArray(t)) return 0;
      const today = SL.helpers.todayKey();
      return t.reduce((s, r) => s + (r && SL.fmt.date(new Date(r.start)) === today ? (r.minutes || 0) : 0), 0);
    },
    kcalToday() {
      const c = SL.getData('calories').entries;
      if (!Array.isArray(c)) return 0;
      const today = SL.helpers.todayKey();
      return Math.round(c.reduce((s, r) => s + (r && r.date === today ? (r.kcal || 0) : 0), 0));
    },
    habitsDoneToday() {
      const items = SL.getData('habits').items;
      if (!Array.isArray(items)) return 0;
      const today = SL.helpers.todayKey();
      return items.filter(h => h && h.records && h.records[today]).length;
    },
    streakOf(records) { // records: {'YYYY-MM-DD': true}
      if (!records) return 0;
      const today = SL.helpers.todayKey();
      const d = new Date();
      // 若今天没打卡，从昨天起算（保持 streak 显示）
      if (!records[SL.fmt.date(d)]) d.setDate(d.getDate() - 1);
      let n = 0;
      while (records[SL.fmt.date(d)]) { n++; d.setDate(d.getDate() - 1); }
      return n;
    }
  };
})();
