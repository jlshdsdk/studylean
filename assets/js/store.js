/**
 * StudyLean store.js — 状态总线 + localStorage 适配器
 * Contractor: SA-01 (Director)
 * Contract: ARCHITECTURE v2.0
 * 全局单例 window.SL。所有模块通过 SL 访问数据，禁止直接读写 localStorage。
 */
(function () {
  'use strict';
  const LS_KEY = 'sl_data_v1';

  // 默认数据结构（ARCHITECTURE §2）
  const DEFAULTS = {
    countdown: { exams: [] },
    timer: { history: [], settings: { focusMin: 25, breakMin: 5 } },
    diary: { entries: [] },
    calories: { entries: [], customFoods: [] },
    weight: { records: [], profile: { heightCm: 170, targetKg: 65, gender: 'male', age: 22, activity: 1.375 } },
    sport: { entries: [] },
    habits: { items: [] },
    todo: { items: [] },
    water: { daily: {}, goal: 2000 },
    sleep: { entries: [] },
    forest: { trees: [] },
    shop: { coin: 0, records: [], wishlist: [] },
    goals: { items: [] },
    quote: { favs: [], todayIndex: -1 },
    notifications: { settings: { water: true, waterGap: 90, stand: true, standGap: 45 } },
    knowledge: { readIds: [] },
    achievements: { unlocked: {} },
    settings: { themeMode: 'auto', accent: 'indigo', cozy: false, compact: false, firstDay: 1 },
    onboarded: false
  };

  const listeners = {};
  let persistent = {}; // data:* 监听
  let saveTimer = null;

  function deepClone(obj) {
    return obj == null ? obj : JSON.parse(JSON.stringify(obj));
  }

  function mergeDefaults(stored) {
    const out = deepClone(DEFAULTS);
    if (!stored || typeof stored !== 'object') return out;
    // 深合并（防损坏数据版）：
    // - null/undefined 一律保留默认值（旧数据 exams:null 不会覆盖默认 []）
    // - 数组仅在默认值也是数组时整体替换，否则保默认（exams:{} / exams:"x" 损坏时不再让 forEach 崩）
    // - 嵌套 plain object 仅在默认值也是 plain object 时逐层合并
    // - 标量仅在默认值为同类型（或默认值不存在，保留向前兼容的新字段）时接受
    function deepMerge(target, src) {
      for (const k in src) {
        // 阻断原型污染：导入文件可能含 __proto__/constructor 自有键（JSON.parse 可产生）
        if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
        if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
        const v = src[k];
        if (v === undefined || v === null) continue;
        const t = target[k];
        if (t === undefined) { target[k] = v; continue; } // 默认结构没有的新字段/新命名空间：整体接受（向前兼容）
        if (Array.isArray(v)) {
          if (Array.isArray(t)) target[k] = v;
          continue;
        }
        if (typeof v === 'object') {
          if (typeof t === 'object' && t !== null && !Array.isArray(t)) deepMerge(t, v);
          continue;
        }
        if (typeof v === typeof t) target[k] = v;
      }
      return target;
    }
    deepMerge(out, stored);
    return out;
  }

  const SL = {
    version: '2.0.0',
    state: { user: null, data: {} },

    init() {
      try {
        const raw = localStorage.getItem(LS_KEY);
        this.state.data = mergeDefaults(raw ? JSON.parse(raw) : null);
      } catch (e) {
        console.warn('[SL] data restore failed, using defaults', e);
        this.state.data = deepClone(DEFAULTS);
      }
      // 恢复会话（校验形状：会话被篡改为字符串/数组等非对象时视为无会话）
      try {
        const sess = localStorage.getItem('sl_session');
        if (sess) {
          const u = JSON.parse(sess);
          if (u && typeof u === 'object' && !Array.isArray(u)) this.state.user = u;
        }
      } catch (e) { this.state.user = null; }
      // 每分钟 tick（倒计时/提醒用）
      this._tickTimer = setInterval(() => this.emit('tick'), 60000);
      // 页面卸载/隐藏时冲刷防抖写队列，避免最后一次 setData 丢失（150ms 防抖窗口）
      // beforeunload 覆盖桌面端；pagehide 覆盖移动端 iOS/后台切换（beforeunload 不可靠）；
      // visibilitychange hidden 兜底移动端切后台时 pagehide 不触发的场景
      if (typeof window !== 'undefined' && !this._unloadBound) {
        this._unloadBound = true;
        window.addEventListener('beforeunload', () => this.saveNow());
        window.addEventListener('pagehide', () => this.saveNow());
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden') this.saveNow();
        });
      }
      return this;
    },

    getData(key) {
      const d = this.state.data;
      if (!(key in d)) {
        // 惰性补默认值
        d[key] = deepClone(DEFAULTS[key] !== undefined ? DEFAULTS[key] : null);
      }
      return d[key];
    },

    setData(key, value, silent) {
      this.state.data[key] = value;
      this._save();
      if (!silent) this.emit('data:' + key);
    },

    _save() {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        try {
          localStorage.setItem(LS_KEY, JSON.stringify(this.state.data));
          if (this._quotaWarned) { this._quotaWarned = false; this.toast('存储已恢复正常', 'success'); }
          this._hookCloudSync();
        } catch (e) {
          console.error('[SL] save failed (quota?)', e);
          this._quotaFailed(e);
        }
      }, 150);
    },

    // 云同步钩子：云端账号登录时数据变化自动（防抖）上推；本地/游客模式零开销
    _hookCloudSync() {
      try {
        const u = this.state && this.state.user;
        if (u && !u.guest && u.id && window.SL && SL.auth && SL.auth.sync) {
          SL.auth.sync.schedulePush();
        }
      } catch (e) { /* 同步失败不阻塞本地保存 */ }
    },

    saveNow() {
      clearTimeout(saveTimer);
      try { localStorage.setItem(LS_KEY, JSON.stringify(this.state.data)); } catch (e) { console.error('[SL] save failed', e); this._quotaFailed(e); }
    },

    // 丢弃未落盘的防抖写队列（清空数据前调用，防止旧数据在 150ms 窗口内被写回）
    cancelPendingSave() {
      clearTimeout(saveTimer);
      saveTimer = null;
    },

    // 默认值合并（导出给 module-settings 导入备份时复用，防损坏/恶意结构）
    mergeDefaults,

    // 存储配额耗尽：数据仍保留在内存，本次会话可继续用；提示用户导出备份
    _quotaFailed(e) {
      if (this._quotaWarned) return; // 只提示一次，避免反复弹窗
      this._quotaWarned = true;
      this.toast('本地存储空间已满：最近的改动可能无法保存，请到 设置 → 数据管理 导出备份或清理数据', 'error');
    },

    on(event, fn) {
      (listeners[event] = listeners[event] || []).push(fn);
      return () => this.off(event, fn);
    },
    off(event, fn) {
      const arr = listeners[event];
      if (!arr) return;
      const i = arr.indexOf(fn);
      if (i >= 0) arr.splice(i, 1);
    },
    emit(event, payload) {
      (listeners[event] || []).slice().forEach(fn => {
        try { fn(payload); } catch (e) { console.error('[SL] listener error for ' + event, e); }
      });
    },

    // ===== 工具函数 =====
    esc(str) {
      return String(str == null ? '' : str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },

    id() {
      return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    },

    fmt: {
      pad(n) { return String(n).padStart(2, '0'); },
      date(d) {
        const dt = d instanceof Date ? d : new Date(d);
        return dt.getFullYear() + '-' + SL.fmt.pad(dt.getMonth() + 1) + '-' + SL.fmt.pad(dt.getDate());
      },
      time(d) {
        const dt = d instanceof Date ? d : new Date(d);
        return SL.fmt.pad(dt.getHours()) + ':' + SL.fmt.pad(dt.getMinutes());
      },
      num(n, digits) {
        if (n == null || isNaN(n)) return '0';
        return Number(n).toLocaleString('zh-CN', { maximumFractionDigits: digits == null ? 1 : digits });
      },
      dur(minutes) {
        const m = Math.max(0, Math.round(minutes || 0));
        if (m < 60) return m + ' 分钟';
        const h = Math.floor(m / 60), r = m % 60;
        return r ? h + ' 小时 ' + r + ' 分' : h + ' 小时';
      }
    },

    // ===== UI 基元（toast/confirm/modal/go 由 core.js 覆盖增强）=====
    toast(msg, type) {
      let wrap = document.getElementById('sl-toast-wrap');
      if (!wrap) {
        wrap = document.createElement('div');
        wrap.id = 'sl-toast-wrap';
        wrap.style.cssText = 'position:fixed;top:16px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
        document.body.appendChild(wrap);
      }
      const t = document.createElement('div');
      t.className = 'sl-toast sl-toast--' + (type || 'info');
      t.textContent = msg;
      wrap.appendChild(t);
      setTimeout(() => {
        t.style.opacity = '0';
        t.style.transform = 'translateY(-6px)';
        setTimeout(() => t.remove(), 350);
      }, 2600);
    },

    confirm(msg) {
      return new Promise(resolve => {
        let settled = false;
        const settle = v => { if (!settled) { settled = true; resolve(v); } };
        const close = SL.modal({
          title: '确认操作',
          body: '<p style="margin:0;color:var(--fg-muted);">' + SL.esc(msg) + '</p>',
          // 遮罩点击关闭时 onClose 触发 → 视为取消，避免 Promise 永远 pending
          onClose: () => settle(false),
          actions: [
            { label: '取消', onClick: () => { close(); settle(false); } },
            { label: '确定', primary: true, onClick: () => { close(); settle(true); } }
          ]
        });
      });
    },

    modal(opts) {
      opts = opts || {};
      const overlay = document.createElement('div');
      overlay.className = 'sl-modal-overlay';
      overlay.innerHTML =
        '<div class="sl-modal" role="dialog" aria-modal="true">' +
        (opts.title ? '<div class="sl-modal__title">' + SL.esc(opts.title) + '</div>' : '') +
        '<div class="sl-modal__body">' + (opts.body || '') + '</div>' +
        '<div class="sl-modal__actions"></div>' +
        '</div>';
      const actionsBar = overlay.querySelector('.sl-modal__actions');
      let closed = false;
      // onClose 钩子：任何途径（按钮/遮罩）关闭都会触发，供 confirm resolve
      const close = () => {
        if (closed) return;
        closed = true;
        // MP-04：模态关闭时恢复 body 滚动（仅当没有其他模态/抽屉仍打开时）
        if (!document.querySelector('.sl-modal-overlay.is-open, .sl-drawer.is-open')) {
          document.body.classList.remove('sl-lock');
        }
        if (typeof opts.onClose === 'function') { try { opts.onClose(); } catch (e) { console.error('[SL] onClose error', e); } }
        overlay.classList.remove('is-open');
        setTimeout(() => overlay.remove(), 250);
      };
      (opts.actions || []).forEach(a => {
        const btn = document.createElement('button');
        btn.className = 'btn btn--' + (a.primary ? 'primary' : (a.danger ? 'danger' : 'ghost'));
        btn.textContent = a.label;
        btn.onclick = () => { a.onClick && a.onClick(overlay); };
        actionsBar.appendChild(btn);
      });
      overlay.addEventListener('click', e => {
        // MP-04：小屏误触容差——点击点落在模态卡片外 8px 内时不算遮罩关闭，防滑动误触丢输入
        if (e.target === overlay && !opts.locked) {
          if (e.clientX || e.clientY) {
            const card = overlay.querySelector('.sl-modal');
            const r = card.getBoundingClientRect();
            const insideX = e.clientX >= r.left - 8 && e.clientX <= r.right + 8;
            const insideY = e.clientY >= r.top - 8 && e.clientY <= r.bottom + 8;
            if (insideX && insideY) return;
          }
          close();
        }
      });
      // MP-04：模态打开时锁定 body 滚动（与抽屉同一 sl-lock 机制），防移动端背景跟手滚动
      document.body.classList.add('sl-lock');
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('is-open'));
      return close;
    },

    go(view) { location.hash = '#/' + view; },

    earnCoin(reason, amount) {
      const shop = SL.getData('shop');
      // Number 强转：coin 被篡改为字符串时避免 "5" + 2 = "52" 类污染
      shop.coin = (Number(shop.coin) || 0) + (Number(amount) || 0);
      shop.records.unshift({ id: SL.id(), ts: Date.now(), item: reason, cost: Number(amount) || 0, note: '', type: 'earn' });
      if (shop.records.length > 500) shop.records.length = 500;
      SL.setData('shop', shop);
    },
    spendCoin(item, cost) {
      const shop = SL.getData('shop');
      const bal = Number(shop.coin) || 0;
      const c = Number(cost) || 0;
      if (bal < c) { SL.toast('自律币不足', 'error'); return false; }
      shop.coin = bal - c;
      shop.records.unshift({ id: SL.id(), ts: Date.now(), item: item, cost: c, note: '', type: 'spend' });
      SL.setData('shop', shop);
      return true;
    }
  };

  window.SL = SL;
})();
