/**
 * Module: 设置 (module-settings.js)
 * Contractor: SA-28 (Director)
 * Contract: ARCHITECTURE v2.0 — 主题/账号/数据管理/云同步
 */
'use strict';

const meta = { id: 'settings', title: '设置', icon: 'settings', order: 22 };

function render(container, params) {
  const s = SL.getData('settings');
  const user = SL.state.user || {};

  container.innerHTML =
    '<div class="view-header fade-up"><h1>设置</h1>' +
    '<div class="view-sub">外观 · 账号 · 数据 · 云同步</div></div>' +

    /* ===== 外观 ===== */
    '<div class="card card--pad" style="margin-bottom:14px;">' +
    '<h3>' + SL.icon('sun', 16) + ' 外观</h3>' +

    '<div class="st-row"><span>主题模式</span><div class="st-seg" id="stThemeMode">' +
    ['light', 'dark', 'auto'].map(m => '<button class="st-seg__btn' + (s.themeMode === m ? ' is-on' : '') + '" data-v="' + m + '">' + { light: '浅色', dark: '深色', auto: '跟随系统' }[m] + '</button>').join('') +
    '</div></div>' +

    '<div class="st-row"><span>主题色</span><div class="st-accents" id="stAccent">' +
    [['indigo', '#5B6CFF'], ['sakura', '#F472B6'], ['mint', '#14B8A6'], ['ocean', '#3B82F6'], ['sunset', '#F97316'], ['amber', '#F59E0B']].map(([k, c]) =>
      '<button class="st-accent' + (s.accent === k ? ' is-on' : '') + '" data-v="' + k + '" title="' + k + '" style="background:' + c + '"></button>').join('') +
    '</div></div>' +

    '<div class="st-row"><span>护眼模式（暖色滤镜）</span><button class="switch' + (s.cozy ? ' is-on' : '') + '" id="stCozy" type="button" role="switch" aria-checked="' + !!s.cozy + '"></button></div>' +
    '<div class="st-row"><span>紧凑密度</span><button class="switch' + (s.compact ? ' is-on' : '') + '" id="stCompact" type="button" role="switch" aria-checked="' + !!s.compact + '"></button></div>' +
    '<div class="st-row"><span>日历周起始</span><div class="st-seg" id="stFirstDay">' +
    '<button class="st-seg__btn' + (s.firstDay === 1 ? ' is-on' : '') + '" data-v="1">周一</button>' +
    '<button class="st-seg__btn' + (s.firstDay === 0 ? ' is-on' : '') + '" data-v="0">周日</button></div></div>' +
    '</div>' +

    /* ===== 账号 ===== */
    '<div class="card card--pad" style="margin-bottom:14px;">' +
    '<h3>' + SL.icon('user', 16) + ' 账号</h3>' +
    '<div class="st-user">' +
    '<span class="st-user__avatar">' + SL.esc((user.name || '同').charAt(0).toUpperCase()) + '</span>' +
    '<div style="flex:1"><b>' + SL.esc(user.name || '同学') + '</b>' +
    '<div class="muted" style="font-size:12px;">' + (user.guest ? '游客模式 · 数据仅存本机浏览器' : '本地账号 · 数据仅存本机浏览器') + '</div></div></div>' +
    (user.guest ? '<button class="btn btn--primary btn--sm" id="stUpgrade">注册账号保留进度</button>' : '') +
    '</div>' +

    /* ===== 数据管理 ===== */
    '<div class="card card--pad" style="margin-bottom:14px;" id="stDataCard">' +
    '<h3>' + SL.icon('download', 16) + ' 数据管理</h3>' +
    '<p class="muted" style="font-size:12.5px;">所有数据保存在本浏览器 localStorage（' + dataSize() + '）。换设备前请导出备份。</p>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
    '<button class="btn btn--primary" id="stExport">' + SL.icon('download', 15) + ' 导出备份 (JSON)</button>' +
    '<button class="btn btn--ghost" id="stImport">' + SL.icon('upload', 15) + ' 导入备份</button>' +
    '<button class="btn btn--danger" id="stClear">' + SL.icon('trash', 15) + ' 清空全部数据</button></div>' +
    '<input type="file" id="stFile" accept=".json" class="hidden">' +
    '</div>' +

    /* ===== 云同步 ===== */
    '<div class="card card--pad" style="margin-bottom:14px;">' +
    '<h3>' + SL.icon('cloud', 16) + ' 云同步（可选 · Supabase）</h3>' +
    '<p class="muted" style="font-size:12.5px;">配置 Supabase 后，登录/注册走云端，数据可跨设备同步。不配置完全不影响本地使用。详见 docs/DEPLOY.md。</p>' +
    '<div id="stCloudBody">' + cloudFormHTML() + '</div>' +
    '</div>' +

    /* ===== 关于 ===== */
    '<div class="card card--pad">' +
    '<h3>' + SL.icon('info', 16) + ' 关于</h3>' +
    '<div class="st-about muted">' +
    '<div><b>研轻 StudyLean</b> v' + SL.version + ' · 上岸，也上秤。</div>' +
    '<div>24 个自律模块 · 零依赖纯静态 · 数据本地私有</div>' +
    '<div>考研冲刺 × 科学减脂 · 愿你上岸那天，也是上秤那天</div></div>' +
    '</div>';

  /* ===== 绑定 ===== */
  container.querySelectorAll('#stThemeMode .st-seg__btn').forEach(b => b.addEventListener('click', () => {
    const d = SL.getData('settings'); d.themeMode = b.dataset.v; SL.setData('settings', d);
    container.querySelectorAll('#stThemeMode .st-seg__btn').forEach(x => x.classList.toggle('is-on', x === b));
    SL.emit('theme');
  }));
  container.querySelectorAll('#stAccent .st-accent').forEach(b => b.addEventListener('click', () => {
    const d = SL.getData('settings'); d.accent = b.dataset.v; SL.setData('settings', d);
    container.querySelectorAll('#stAccent .st-accent').forEach(x => x.classList.toggle('is-on', x === b));
    SL.emit('theme');
    SL.toast('主题色已切换', 'success');
  }));
  container.querySelectorAll('#stFirstDay .st-seg__btn').forEach(b => b.addEventListener('click', () => {
    const d = SL.getData('settings'); d.firstDay = Number(b.dataset.v); SL.setData('settings', d);
    container.querySelectorAll('#stFirstDay .st-seg__btn').forEach(x => x.classList.toggle('is-on', x === b));
  }));
  bindSwitch(container, '#stCozy', 'cozy');
  bindSwitch(container, '#stCompact', 'compact');

  container.querySelector('#stExport').addEventListener('click', doExport);
  const fileInput = container.querySelector('#stFile');
  container.querySelector('#stImport').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => doImport(fileInput));
  container.querySelector('#stClear').addEventListener('click', doClear);

  container.querySelector('#stUpgrade')?.addEventListener('click', () => {
    location.href = 'index.html?upgrade=1';
  });

  bindCloud(container);

  // 跳转锚点（dashboard 导出/导入快捷入口 → 滚到数据卡）
  if (params && params.sec === 'data') {
    setTimeout(() => container.querySelector('#stDataCard')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 250);
  }
}

function destroy() {}

/* ===== 私有 ===== */
function bindSwitch(container, sel, key) {
  const el = container.querySelector(sel);
  if (!el) return;
  el.addEventListener('click', () => {
    const d = SL.getData('settings');
    d[key] = !d[key];
    SL.setData('settings', d);
    el.classList.toggle('is-on', d[key]);
    el.setAttribute('aria-checked', String(d[key]));
    SL.emit('theme');
  });
}

function dataSize() {
  try {
    const raw = localStorage.getItem('sl_data_v1') || '';
    return (raw.length / 1024).toFixed(1) + ' KB';
  } catch (e) { return '未知'; }
}

function doExport() {
  const payload = {
    app: 'studylean', version: SL.version, exportedAt: new Date().toISOString(),
    data: SL.state.data
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'studylean-backup-' + SL.fmt.date(new Date()) + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
  SL.toast('备份已导出', 'success');
}

function doImport(fileInput) {
  const file = fileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const payload = JSON.parse(reader.result);
      if (payload.app !== 'studylean' || !payload.data) throw new Error('not a studylean backup');
      // 形状校验：data 必须是 plain object，防止损坏/恶意备份注入异常结构
      const d = payload.data;
      if (typeof d !== 'object' || Array.isArray(d) || d === null) throw new Error('bad data shape');
      if (!await SL.confirm('导入会覆盖当前全部数据（' + Object.keys(d).length + ' 个数据域），确定继续？')) return;
      // 过经过 mergeDefaults 合并：丢弃非法键（含原型污染键），缺失域自动补默认值，导入更健壮
      SL.state.data = (typeof SL.mergeDefaults === 'function') ? SL.mergeDefaults(d) : d;
      SL.saveNow();
      SL.toast('导入成功，页面即将刷新', 'success');
      setTimeout(() => location.reload(), 900);
    } catch (e) {
      SL.toast('导入失败：不是有效的研轻备份文件', 'error');
    }
    fileInput.value = '';
  };
  reader.readAsText(file);
}

async function doClear() {
  if (!await SL.confirm('⚠ 清空全部数据：所有模块记录将永久删除且无法恢复。真的要清空吗？')) return;
  if (!await SL.confirm('最后确认：真的全部清空？建议先导出备份。')) return;
  // 先撤销未落盘的防抖写队列再删键，避免 150ms 内 pending 的旧数据被写回
  if (typeof SL.cancelPendingSave === 'function') SL.cancelPendingSave();
  localStorage.removeItem('sl_data_v1');
  SL.toast('已清空，页面即将刷新', 'info');
  setTimeout(() => location.reload(), 900);
}

/* ===== 云同步 ===== */
function cloudFormHTML() {
  const cfg = readCloudCfg();
  const isCloud = !!(SL.auth && SL.auth.sync && SL.auth.sync.isCloudUser && SL.auth.sync.isCloudUser());
  const last = isCloud && SL.auth.sync.lastSyncedAt() ? '上次同步：' + SL.fmt.dateTime(SL.auth.sync.lastSyncedAt().getTime()) : '';
  return '<div class="field"><label>Supabase URL</label><input class="input" id="stCloudUrl" placeholder="https://xxxx.supabase.co" value="' + SL.esc(cfg.url || '') + '"></div>' +
    '<div class="field"><label>Anon Key</label><input class="input" id="stCloudKey" placeholder="eyJhbGciOi..." value="' + SL.esc(cfg.anonKey || '') + '"></div>' +
    (isCloud ? '<div class="tag tag--green" style="display:inline-flex;align-items:center;gap:5px;margin-bottom:10px;">' + SL.icon('cloud', 13) + ' 云端账号已连接 · 数据自动同步</div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">' +
      '<button class="btn btn--primary btn--sm" id="stSyncNow">立即同步</button>' +
      '<span class="muted" style="font-size:12px;" id="stSyncInfo">' + (last || '尚未同步') + '</span></div>' +
      '<p class="muted" style="font-size:12px;margin:8px 0 0;">换设备登录同一账号即可拉取全部数据。</p>'
      : '') +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
    '<button class="btn btn--primary btn--sm" id="stCloudSave">保存云配置</button>' +
    (cfg.url ? '<button class="btn btn--ghost btn--sm" id="stCloudTest">测试连接</button><button class="btn btn--danger btn--sm" id="stCloudClear">清除配置</button>' : '') +
    '</div><div id="stCloudMsg" class="muted" style="font-size:12px;margin-top:8px;"></div>';
}

function readCloudCfg() {
  try { return JSON.parse(localStorage.getItem('sl_cloud_config')) || {}; }
  catch (e) { return {}; }
}

function bindCloud(container) {
  const msg = (t, ok) => {
    const el = container.querySelector('#stCloudMsg');
    if (el) { el.textContent = t; el.style.color = ok ? 'var(--success)' : 'var(--danger)'; }
  };
  container.querySelector('#stCloudSave')?.addEventListener('click', () => {
    const url = container.querySelector('#stCloudUrl').value.trim();
    const key = container.querySelector('#stCloudKey').value.trim();
    if (url && !/^https:\/\/.+\.supabase\.co\/?$/.test(url)) { msg('URL 格式应为 https://xxxx.supabase.co', false); return; }
    if (url && !key) { msg('填了 URL 就要填 Anon Key', false); return; }
    if (url && key) {
      localStorage.setItem('sl_cloud_config', JSON.stringify({ url: url.replace(/\/$/, ''), anonKey: key }));
      window.SL_CLOUD_CONFIG = { url: url.replace(/\/$/, ''), anonKey: key };
      msg('已保存，下次登录/注册将走云端', true);
    } else {
      localStorage.removeItem('sl_cloud_config');
      delete window.SL_CLOUD_CONFIG;
      msg('已清除，恢复纯本地模式', true);
    }
    setTimeout(() => render(container, {}), 600);
  });
  container.querySelector('#stCloudTest')?.addEventListener('click', async () => {
    const cfg = readCloudCfg();
    msg('测试中…', true);
    try {
      const r = await fetch(cfg.url + '/auth/v1/health', { headers: { apikey: cfg.anonKey } });
      msg(r.ok ? '连接成功 ✓ Supabase 服务可达' : '可达但返回 ' + r.status, r.ok);
    } catch (e) {
      msg('连接失败：' + e.message, false);    }
  });
  container.querySelector('#stSyncNow')?.addEventListener('click', async () => {
    const btn = container.querySelector('#stSyncNow');
    const info = container.querySelector('#stSyncInfo');
    if (!SL.auth || !SL.auth.sync) return;
    btn.disabled = true;
    if (info) info.textContent = '同步中…';
    try {
      const r = await SL.auth.sync.pull();
      if (r === 'local-newer' || r === 'empty') await SL.auth.sync.push();
      SL.toast(r === 'pulled' ? '已拉取云端最新数据' : '本地数据已推送到云端', 'success');
      render(container, {});
    } catch (e) {
      SL.toast('同步失败：' + e.message, 'error');
      if (info) info.textContent = '同步失败：' + e.message;
      btn.disabled = false;
    }
  });

  container.querySelector('#stCloudClear')?.addEventListener('click', async () => {
    if (!await SL.confirm('清除云同步配置？本地数据不受影响。')) return;
    localStorage.removeItem('sl_cloud_config');
    delete window.SL_CLOUD_CONFIG;
    render(container, {});
    SL.toast('已恢复纯本地模式', 'info');
  });
}

export { render, destroy, meta };
