/**
 * Module: 日记簿 (module-diary.js)
 * Contractor: SA-11 (Director)
 * Contract: ARCHITECTURE v2.0
 */
'use strict';

const meta = { id: 'diary', title: '日记簿', icon: 'diary', order: 12 };

let viewRoot = null, viewParams = {};
let searchTimer = null;

function render(container, params) {
  viewRoot = container; viewParams = params || {};
  const search = (viewParams.search || '').trim();
  const entries = SL.getData('diary').entries || [];

  container.innerHTML =
    '<div class="view-header fade-up"><h1>日记簿</h1>' +
    '<div class="view-sub">写下今天，写给未来的自己 · 每篇 +3 自律币</div></div>' +

    '<div class="diary-toolbar">' +
    '<button class="btn btn--primary" id="dNew">' + SL.icon('plus', 16) + ' 写日记</button>' +
    '<input class="input diary-search" id="dSearch" placeholder="搜索日记标题/内容…" value="' + SL.esc(search) + '">' +
    '</div>' +

    '<div id="dList" class="stagger"></div>';

  const listEl = container.querySelector('#dList');
  const renderList = () => {
    if (!container.isConnected) return; // 视图已卸载（防抖回调迟到的兜底）
    const kw = container.querySelector('#dSearch').value.trim().toLowerCase();
    // 稳定排序：日期倒序，同日按创建时间倒序
    const all = (SL.getData('diary').entries || []).slice().sort((a, b) =>
      ((b.date || '').localeCompare(a.date || '')) || ((b.ts || 0) - (a.ts || 0)));
    const filtered = kw
      ? all.filter(e => (e.title + e.content).toLowerCase().includes(kw))
      : all;
    if (!filtered.length) {
      listEl.innerHTML = '<div class="empty-state">' + SL.icon('diary', 52) +
        '<p>' + (kw ? '没有找到包含「' + SL.esc(kw) + '」的日记' : '还没有日记<br>今天的心情、进度、碎碎念，都值得记下来') + '</p>' +
        (kw ? '' : '<button class="btn btn--primary" id="dNewEmpty">写第一篇</button>') + '</div>';
      listEl.querySelector('#dNewEmpty')?.addEventListener('click', () => openEditor(null));
      return;
    }
    listEl.innerHTML = filtered.map(e => entryCard(e)).join('');
    listEl.querySelectorAll('[data-open]').forEach(el => el.addEventListener('click', () => openReader(findEntry(el.dataset.open))));
    listEl.querySelectorAll('[data-edit]').forEach(el => el.addEventListener('click', ev => { ev.stopPropagation(); openEditor(findEntry(el.dataset.edit)); }));
    listEl.querySelectorAll('[data-del]').forEach(el => el.addEventListener('click', async ev => {
      ev.stopPropagation();
      const ent = findEntry(el.dataset.del);
      if (!ent) return; // 条目可能已被其他入口删除
      if (await SL.confirm('删除「' + SL.esc(ent.title || ent.date || '') + '」这篇日记？')) {
        const d = SL.getData('diary');
        d.entries = d.entries.filter(x => x.id !== ent.id);
        SL.setData('diary', d);
        renderList();
        SL.toast('已删除', 'info');
      }
    }));
  };

  container.querySelector('#dNew').addEventListener('click', () => openEditor(null));
  container.querySelector('#dSearch').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(renderList, 220);
  });
  renderList();
}

function destroy() {
  clearTimeout(searchTimer);
  searchTimer = null;
}

/* ===== 私有 ===== */
function findEntry(id) { return (SL.getData('diary').entries || []).find(e => e.id === id); }
// 纯日期键 'YYYY-MM-DD' 的本地时区解析（避免 UTC 偏移）；非法返回 null
function parseDateKey(key) {
  if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const d = new Date(key + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

const MOODS = [
  { key: 'great', label: '超棒', icon: '😄' },
  { key: 'good', label: '不错', icon: '🙂' },
  { key: 'ok', label: '一般', icon: '😐' },
  { key: 'down', label: '低落', icon: '😔' },
  { key: 'bad', label: '糟糕', icon: '😣' },
  { key: 'tired', label: '疲惫', icon: '😪' }
];
const WEATHERS = [
  { key: 'sunny', label: '晴', icon: '☀️' },
  { key: 'cloudy', label: '多云', icon: '⛅' },
  { key: 'rain', label: '雨', icon: '🌧️' },
  { key: 'snow', label: '雪', icon: '❄️' },
  { key: 'windy', label: '风', icon: '💨' }
];

function moodOf(key) { return MOODS.find(m => m.key === key); }
function weatherOf(key) { return WEATHERS.find(w => w.key === key); }

function entryCard(e) {
  const m = moodOf(e.mood), w = weatherOf(e.weather);
  // 'YYYY-MM-DD' 直接 new Date() 会按 UTC 解析，西半球时区会偏一天；本地化解析保证周几正确
  const wd = parseDateKey(e.date);
  return '<div class="card card--pad diary-card" data-open="' + e.id + '" style="cursor:pointer;">' +
    '<div class="diary-card__head">' +
    '<span class="diary-card__date">' + SL.esc(e.date) + ' ' + SL.esc(wd ? SL.fmt.weekday(wd) : '') + '</span>' +
    '<span class="diary-card__mood">' + (m ? m.icon + ' ' + m.label : '') + (w ? ' · ' + w.icon : '') + '</span>' +
    '<span class="row-actions">' +
    '<button class="btn btn--ghost btn--sm" data-edit="' + e.id + '">' + SL.icon('edit', 14) + '</button>' +
    '<button class="btn btn--ghost btn--sm" data-del="' + e.id + '">' + SL.icon('trash', 14) + '</button></span>' +
    '</div>' +
    (e.title ? '<h3 class="diary-card__title">' + SL.esc(e.title) + '</h3>' : '') +
    '<p class="diary-card__excerpt">' + SL.esc((e.content || '').slice(0, 120)) + ((e.content || '').length > 120 ? '…' : '') + '</p>' +
    '<div class="muted" style="font-size:11.5px;">' + (e.words || (e.content || '').length) + ' 字</div>' +
    '</div>';
}

function openEditor(entry) {
  const isNew = !entry;
  const today = SL.fmt.date(new Date());
  const close = SL.modal({
    title: isNew ? '写日记 · ' + today : '编辑日记',
    body:
      '<div class="field"><label>标题</label><input class="input" id="dTitle" maxlength="40" placeholder="给今天起个名字（可选）" value="' + SL.esc(isNew ? '' : entry.title || '') + '"></div>' +
      '<div class="field"><label>心情</label><div class="diary-emoji-row" id="dMood">' +
      MOODS.map(m => '<button type="button" class="diary-emoji' + (!isNew && entry.mood === m.key ? ' is-on' : '') + '" data-v="' + m.key + '">' + m.icon + '<span>' + m.label + '</span></button>').join('') +
      '</div></div>' +
      '<div class="field"><label>天气</label><div class="diary-emoji-row" id="dWeather">' +
      WEATHERS.map(w => '<button type="button" class="diary-emoji' + (!isNew && entry.weather === w.key ? ' is-on' : '') + '" data-v="' + w.key + '">' + w.icon + '<span>' + w.label + '</span></button>').join('') +
      '</div></div>' +
      '<div class="field"><label>正文</label><textarea class="textarea" id="dContent" rows="8" placeholder="今天学了什么？吃了什么？心情如何？\n支持简单换行，想到什么写什么。">' + SL.esc(isNew ? '' : entry.content || '') + '</textarea></div>' +
      '<div class="muted" style="font-size:11.5px;text-align:right;"><span id="dWords">0</span> 字</div>',
    actions: [
      { label: '取消', onClick: () => close() },
      { label: '保存', primary: true, onClick: () => {
          const title = document.getElementById('dTitle').value.trim();
          const content = document.getElementById('dContent').value;
          if (!title && !content.trim()) { SL.toast('写点什么再保存吧', 'error'); return; }
          const mood = document.querySelector('#dMood .is-on')?.dataset.v || '';
          const weather = document.querySelector('#dWeather .is-on')?.dataset.v || '';
          const d = SL.getData('diary');
          if (isNew) {
            d.entries.unshift({ id: SL.id(), date: today, title, content, mood, weather, words: content.length, ts: Date.now() });
            SL.earnCoin('写日记', 3);
            SL.toast('已保存，+3 自律币', 'success');
          } else {
            const t = d.entries.find(x => x.id === entry.id);
            if (!t) { SL.toast('日记不存在或已被删除', 'error'); close(); render(viewRoot, viewParams); return; }
            Object.assign(t, { title, content, mood, weather, words: content.length });
            SL.toast('已保存', 'success');
          }
          SL.setData('diary', d);
          close();
          render(viewRoot, viewParams);
        } }
    ]
  });
  // emoji 选择 + 字数统计（modal 可能被 body 重渲染/立即关闭，元素要判空）
  setTimeout(() => {
    document.querySelectorAll('.diary-emoji-row').forEach(row => {
      row.querySelectorAll('.diary-emoji').forEach(b => b.addEventListener('click', () => {
        row.querySelectorAll('.diary-emoji').forEach(x => x.classList.remove('is-on'));
        b.classList.add('is-on');
      }));
    });
    const ta = document.getElementById('dContent');
    const wc = document.getElementById('dWords');
    if (ta && wc) {
      const upd = () => wc.textContent = ta.value.length;
      ta.addEventListener('input', upd); upd();
    }
  }, 60);
}

function openReader(entry) {
  if (!entry) return;
  const m = moodOf(entry.mood), w = weatherOf(entry.weather);
  const rd = parseDateKey(entry.date);
  const close = SL.modal({
    title: entry.title || entry.date || '日记',
    body:
      '<div class="muted" style="font-size:12px;margin-bottom:12px;">' +
      SL.esc(entry.date) + (rd ? ' 周' + SL.esc(SL.fmt.weekday(rd)) : '') +
      (m ? ' · ' + m.icon + ' ' + m.label : '') + (w ? ' · ' + w.icon + ' ' + w.label : '') +
      ' · ' + (entry.words || (entry.content || '').length) + ' 字</div>' +
      '<div class="diary-reader">' + SL.esc(entry.content || '').replace(/\n/g, '<br>') + '</div>',
    actions: [
      { label: '关闭', onClick: () => close() }
    ]
  });
}

export { render, destroy, meta };
