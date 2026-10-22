/**
 * Module: 待办清单 (module-todo.js)
 * Contractor: SA-15
 * Contract: ARCHITECTURE v2.0
 */
'use strict';

const meta = { id: 'todo', title: '待办清单', icon: 'list', order: 13 };

let viewRoot = null;
let viewParams = {};
let viewMode = 'list'; // 'list' | 'quad'
let addPri = 'mid';
let lastDoneId = null;
let focusSubId = null;
let unsub = null;

const PRIORITIES = {
  high: { label: '高', color: '#EF4444' },
  mid: { label: '中', color: '#F59E0B' },
  low: { label: '低', color: '#10B981' }
};

const QUADRANTS = {
  1: { label: '重要且紧急', hint: '立刻做', color: '#EF4444' },
  2: { label: '重要不紧急', hint: '安排计划做', color: '#5B6CFF' },
  3: { label: '紧急不重要', hint: '快速处理', color: '#F59E0B' },
  4: { label: '不重要不紧急', hint: '尽量少做', color: '#94A3B8' }
};
const PRI_ORDER = ['high', 'mid', 'low'];

function render(container, params) {
  viewRoot = container;
  viewParams = params || {};

  container.innerHTML =
    '<div class="view-header fade-up"><h1>待办清单</h1>' +
    '<div class="view-sub">把心事写下来，把事情做完 · 四象限分清轻重缓急</div></div>' +

    '<div class="todo-stats stagger" id="tStats"></div>' +

    '<div class="card card--pad todo-quickadd fade-up">' +
    '<div class="todo-quickadd__row">' +
    '<input class="input todo-quickadd__input" id="tInput" maxlength="80" placeholder="要做什么？回车快速添加…">' +
    '<div class="todo-pri-pick" id="tPriPick" title="优先级">' +
    PRI_ORDER.map(k =>
      '<button type="button" class="todo-pri-dot' + (k === addPri ? ' is-on' : '') + '" data-pri="' + k + '" style="--pri-c:' + PRIORITIES[k].color + '" title="' + PRIORITIES[k].label + '优先级"></button>'
    ).join('') +
    '</div>' +
    '<input class="input todo-quickadd__due" id="tDue" type="date" title="截止日期（可选）">' +
    '<button class="btn btn--primary" id="tAdd">' + SL.icon('plus', 16) + ' 添加</button>' +
    '</div></div>' +

    '<div class="todo-toolbar fade-up">' +
    '<div class="todo-viewtoggle" id="tViewToggle">' +
    '<button class="todo-viewtoggle__btn is-on" data-mode="list">' + SL.icon('list', 15) + ' 列表</button>' +
    '<button class="todo-viewtoggle__btn" data-mode="quad">' + SL.icon('grid', 15) + ' 四象限</button>' +
    '</div>' +
    '<div class="muted" id="tCount" style="font-size:12px;"></div>' +
    '</div>' +

    '<div id="tBody"></div>';

  // 事件绑定
  container.querySelector('#tAdd').addEventListener('click', quickAdd);
  container.querySelector('#tInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') quickAdd();
  });
  container.querySelector('#tPriPick').addEventListener('click', e => {
    const b = e.target.closest('[data-pri]');
    if (!b) return;
    addPri = b.dataset.pri;
    container.querySelectorAll('#tPriPick .todo-pri-dot').forEach(x => x.classList.toggle('is-on', x === b));
  });
  container.querySelector('#tViewToggle').addEventListener('click', e => {
    const b = e.target.closest('[data-mode]');
    if (!b || b.dataset.mode === viewMode) return;
    viewMode = b.dataset.mode;
    container.querySelectorAll('#tViewToggle .todo-viewtoggle__btn').forEach(x => x.classList.toggle('is-on', x === b));
    renderBody();
  });

  if (unsub) unsub();
  unsub = SL.on('data:todo', () => { renderStats(); renderBody(); });

  renderStats();
  renderBody();
  SL.bindCardSwipe?.(container);
  SL.refreshBadges?.();
}

function destroy() {
  if (unsub) { unsub(); unsub = null; }
  viewRoot = null;
}

/* ===== 私有：数据访问 ===== */
function getItems() { return SL.getData('todo').items || []; }
function todayKey() { return SL.fmt.date(new Date()); }

/* ===== 顶部统计 ===== */
function renderStats() {
  const el = viewRoot && viewRoot.querySelector('#tStats');
  if (!el) return;
  const items = getItems();
  const today = todayKey();
  const todayNew = items.filter(i => i.createdAt && SL.fmt.date(new Date(i.createdAt)) === today).length;
  const total = items.length;
  const done = items.filter(i => i.done).length;
  const rate = total ? Math.round((done / total) * 100) + '%' : '—';
  el.innerHTML =
    '<div class="card card--pad todo-stat">' +
    '<div class="todo-stat__label">' + SL.icon('sparkles', 15) + ' 今日新增</div>' +
    '<div class="todo-stat__num" id="tStatNew">' + todayNew + '</div>' +
    '<div class="todo-stat__sub">项待办进入清单</div></div>' +
    '<div class="card card--pad todo-stat">' +
    '<div class="todo-stat__label">' + SL.icon('checkCircle', 15) + ' 完成率</div>' +
    '<div class="todo-stat__num" id="tStatRate">' + rate + '</div>' +
    '<div class="todo-stat__sub">已完成 ' + done + ' / 共 ' + total + ' 项</div></div>';
  SL.animNum(el.querySelector('#tStatNew'), todayNew, 400);
}

/* ===== 主体渲染分发 ===== */
function renderBody() {
  if (!viewRoot || !document.contains(viewRoot)) return;
  lastDoneId = null;
  const body = viewRoot.querySelector('#tBody');
  if (!body) return;
  const items = getItems();
  const countEl = viewRoot.querySelector('#tCount');
  if (countEl) {
    const active = items.filter(i => !i.done).length;
    countEl.textContent = items.length ? active + ' 项进行中 · ' + (items.length - active) + ' 项已完成' : '';
  }
  if (!items.length) {
    body.innerHTML =
      '<div class="empty-state">' + SL.icon('list', 52) +
      '<p>清单空空如也<br>把今天要做的事一件件加进来，焦虑就会少一半</p>' +
      '<button class="btn btn--primary" id="tEmptyAdd">' + SL.icon('plus', 16) + ' 添加第一项待办</button></div>';
    const b = body.querySelector('#tEmptyAdd');
    if (b) b.addEventListener('click', () => viewRoot.querySelector('#tInput')?.focus());
    return;
  }
  if (viewMode === 'quad') renderQuad(body, items);
  else renderList(body, items);
}

/* ===== 列表视图 ===== */
function renderList(body, items) {
  const active = items.filter(i => !i.done);
  const done = items.filter(i => i.done);
  let html = '';

  html += '<div class="todo-group"><div class="todo-group__head"><h3>' + SL.icon('zap', 15) + ' 进行中</h3><span class="todo-group__count">' + active.length + '</span></div>';
  html += active.length
    ? '<div class="todo-list">' + active.map(itemRow).join('') + '</div>'
    : '<div class="todo-group__empty">全部完成啦，去添加新待办吧</div>';
  html += '</div>';

  html += '<div class="todo-group todo-group--done"><div class="todo-group__head" id="tDoneHead" style="cursor:pointer;">' +
    '<h3>' + SL.icon('checkCircle', 15) + ' 已完成</h3><span class="todo-group__count">' + done.length + '</span>' +
    '<span class="todo-group__chev' + (collapsedDone ? ' is-fold' : '') + '">' + SL.icon('chevronD', 15) + '</span></div>';
  if (!collapsedDone) {
    html += done.length
      ? '<div class="todo-list">' + done.map(itemRow).join('') + '</div>'
      : '<div class="todo-group__empty">还没有完成的记录，勾选左侧圆钮试试</div>';
  }
  html += '</div>';

  body.innerHTML = html;
  bindListEvents(body);
}

function itemRow(item) {
  const pri = PRIORITIES[item.priority] || PRIORITIES.mid;
  const today = todayKey();
  const overdue = item.due && !item.done && item.due < today;
  const subs = item.subtasks || [];
  const subDone = subs.filter(s => s.done).length;
  const q = QUADRANTS[item.quadrant] || QUADRANTS[2];
  const isDone = !!item.done;
  const just = lastDoneId === item.id ? ' just-done' : '';
  const expanded = expandedIds.has(item.id);

  return '<div class="todo-item card' + (isDone ? ' is-done' : '') + just + '" data-id="' + item.id + '">' +
    '<div class="todo-item__row">' +
    '<button class="todo-check' + (isDone ? ' is-on' : '') + '" data-check="' + item.id + '" title="' + (isDone ? '标记未完成' : '标记完成') + '">' +
    SL.icon('check', 13) + '</button>' +
    '<div class="todo-item__main" data-open="' + item.id + '">' +
    '<div class="todo-item__text">' + SL.esc(item.text) + '</div>' +
    '<div class="todo-item__meta">' +
    '<span class="todo-pri" style="--pri-c:' + pri.color + '">' + pri.label + '</span>' +
    (item.due ? '<span class="todo-due' + (overdue ? ' is-overdue' : '') + '">' + SL.icon('clock', 12) + ' ' + SL.esc(item.due) + (overdue ? ' 已过期' : '') + '</span>' : '') +
    '<span class="todo-quad-tag" style="--q-c:' + q.color + '">' + SL.esc(q.label) + '</span>' +
    (subs.length ? '<span class="todo-sub-progress">' + SL.icon('list', 12) + ' ' + subDone + '/' + subs.length + '</span>' : '') +
    '</div></div>' +
    '<div class="row-actions">' +
    (subs.length || !isDone ? '<button class="btn btn--ghost btn--sm" data-expand="' + item.id + '" title="子任务">' + SL.icon('chevronD', 14) + '</button>' : '') +
    '<button class="btn btn--ghost btn--sm" data-edit="' + item.id + '" title="编辑">' + SL.icon('edit', 14) + '</button>' +
    '<button class="btn btn--ghost btn--sm" data-del="' + item.id + '" title="删除">' + SL.icon('trash', 14) + '</button>' +
    '</div></div>' +
    (expanded ? subBlock(item) : '') +
    '</div>';
}

function subBlock(item) {
  const subs = item.subtasks || [];
  return '<div class="todo-subs">' +
    subs.map((s, i) =>
      '<div class="todo-sub' + (s.done ? ' is-done' : '') + '">' +
      '<button class="todo-sub__check' + (s.done ? ' is-on' : '') + '" data-subcheck="' + i + '">' + SL.icon('check', 11) + '</button>' +
      '<span class="todo-sub__text">' + SL.esc(s.text) + '</span>' +
      '<button class="todo-sub__del" data-subdel="' + i + '">' + SL.icon('x', 12) + '</button>' +
      '</div>'
    ).join('') +
    '<div class="todo-sub__add">' +
    '<input class="input todo-sub-add__input" data-subinput="' + item.id + '" maxlength="60" placeholder="添加子任务，回车确认…">' +
    '</div></div>';
}

function bindListEvents(body) {
  body.querySelectorAll('[data-check]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    toggleDone(b.dataset.check, e);
  }));
  body.querySelectorAll('[data-open]').forEach(el => el.addEventListener('click', () => {
    const item = findItem(el.dataset.open);
    if (item && !item.done) openEdit(item);
  }));
  body.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const item = findItem(b.dataset.edit);
    if (item) openEdit(item);
  }));
  body.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async e => {
    e.stopPropagation();
    const item = findItem(b.dataset.del);
    if (!item) return;
    if (await SL.confirm('删除待办「' + item.text + '」？')) {
      const d = SL.getData('todo');
      d.items = d.items.filter(x => x.id !== item.id);
      expandedIds.delete(item.id);
      SL.setData('todo', d);
      SL.toast('已删除', 'info');
    }
  }));
  body.querySelectorAll('[data-expand]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const id = b.dataset.expand;
    if (expandedIds.has(id)) expandedIds.delete(id);
    else expandedIds.add(id);
    renderBody();
  }));
  body.querySelectorAll('[data-subcheck]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const id = b.closest('.todo-item').dataset.id;
    const idx = Number(b.dataset.subcheck);
    const item = findItem(id);
    if (!item || !item.subtasks || !item.subtasks[idx]) return;
    item.subtasks[idx].done = !item.subtasks[idx].done;
    if (item.subtasks.every(s => s.done) && !item.done) SL.toast('子任务全部完成！', 'success');
    SL.setData('todo', SL.getData('todo'));
  }));
  body.querySelectorAll('[data-subdel]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const id = b.closest('.todo-item').dataset.id;
    const idx = Number(b.dataset.subdel);
    const item = findItem(id);
    if (!item || !item.subtasks || !item.subtasks[idx]) return;
    item.subtasks.splice(idx, 1);
    SL.setData('todo', SL.getData('todo'));
  }));
  body.querySelectorAll('[data-subinput]').forEach(inp => inp.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const text = inp.value.trim();
    if (!text) return;
    const item = findItem(inp.dataset.subinput);
    if (!item) return;
    item.subtasks = item.subtasks || [];
    item.subtasks.push({ text, done: false });
    focusSubId = item.id;
    SL.setData('todo', d(item));
  }));
  // 已完成分组折叠
  const doneHead = body.querySelector('#tDoneHead');
  if (doneHead) doneHead.addEventListener('click', () => {
    collapsedDone = !collapsedDone;
    renderBody();
  });
  // 恢复子任务输入焦点
  if (focusSubId) {
    const inp = body.querySelector('[data-subinput="' + focusSubId + '"]');
    if (inp) inp.focus();
    focusSubId = null;
  }
  SL.bindCardSwipe?.(body);
}

// 返回携带该待办最新值的完整 todo 数据（findItem 修改的是 state.data 内的同一对象引用，
// 此处仅做一次回写以触发持久化与 data:todo 广播）
function d(item) { return SL.getData('todo'); }

function findItem(id) { return getItems().find(x => x.id === id); }

function toggleDone(id, ev) {
  const item = findItem(id);
  if (!item) return;
  item.done = !item.done;
  if (item.done) {
    lastDoneId = id;
    if (ev && typeof ev.clientX === 'number') SL.confetti(ev.clientX, ev.clientY);
    SL.toast('完成一项，给自己点个赞！', 'success');
  }
  SL.setData('todo', SL.getData('todo'));
}

/* ===== 四象限视图 ===== */
function renderQuad(body, items) {
  const active = items.filter(i => !i.done);
  const today = todayKey();
  let html = '<div class="todo-quadgrid">';
  for (let q = 1; q <= 4; q++) {
    const conf = QUADRANTS[q];
    const list = active.filter(i => (i.quadrant || 2) === q)
      .sort((a, b) => {
        const ao = a.due && a.due < today ? 1 : 0, bo = b.due && b.due < today ? 1 : 0;
        return bo - ao;
      });
    html += '<div class="todo-quad" style="--q-c:' + conf.color + '">' +
      '<div class="todo-quad__head">' +
      '<span class="todo-quad__badge">Q' + q + '</span>' +
      '<div class="todo-quad__title"><strong>' + conf.label + '</strong><span>' + conf.hint + '</span></div>' +
      '<span class="todo-quad__count">' + list.length + '</span></div>';
    if (list.length) {
      html += '<div class="todo-quad__list">' + list.map(it => {
        const pri = PRIORITIES[it.priority] || PRIORITIES.mid;
        const overdue = it.due && it.due < today;
        const subs = it.subtasks || [];
        return '<div class="todo-quad__item" data-id="' + it.id + '">' +
          '<button class="todo-check" data-check="' + it.id + '">' + SL.icon('check', 13) + '</button>' +
          '<span class="todo-quad__text" data-open="' + it.id + '">' + SL.esc(it.text) + '</span>' +
          '<span class="todo-quad__meta">' +
          '<i class="todo-quad__dot" style="background:' + pri.color + ';" title="' + pri.label + '优先级"></i>' +
          (it.due ? '<em class="' + (overdue ? 'is-overdue' : '') + '">' + SL.esc(it.due.slice(5)) + '</em>' : '') +
          (subs.length ? '<em>' + subs.filter(s => s.done).length + '/' + subs.length + '</em>' : '') +
          '</span></div>';
      }).join('') + '</div>';
    } else {
      html += '<div class="todo-quad__empty">暂无待办</div>';
    }
    html += '</div>';
  }
  html += '</div>';
  html += '<div class="muted todo-quad__legend">点击条目可编辑优先级、截止日与所在象限</div>';
  body.innerHTML = html;

  body.querySelectorAll('[data-check]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    toggleDone(b.dataset.check, e);
  }));
  body.querySelectorAll('[data-open]').forEach(el => el.addEventListener('click', () => {
    const item = findItem(el.dataset.open);
    if (item) openEdit(item);
  }));
}

/* ===== 快速添加 ===== */
function quickAdd() {
  if (!viewRoot) return;
  const input = viewRoot.querySelector('#tInput');
  const dueEl = viewRoot.querySelector('#tDue');
  const text = input.value.trim();
  if (!text) { SL.toast('先写点要做的内容吧', 'error'); input.focus(); return; }
  const data = SL.getData('todo');
  data.items.unshift({
    id: SL.id(),
    text,
    done: false,
    priority: addPri,
    quadrant: 2,
    due: dueEl.value || '',
    subtasks: [],
    createdAt: Date.now()
  });
  SL.setData('todo', data);
  input.value = '';
  dueEl.value = '';
  input.focus();
  SL.toast('已添加待办', 'success');
}

/* ===== 编辑模态 ===== */
function openEdit(item) {
  let editPri = item.priority || 'mid';
  let editQuad = item.quadrant || 2;
  const close = SL.modal({
    title: '编辑待办',
    body:
      '<div class="field"><label>内容</label><input class="input" id="tEditText" maxlength="80" value="' + SL.esc(item.text) + '"></div>' +
      '<div class="field"><label>优先级</label><div class="todo-pri-pick todo-pri-pick--modal" id="tEditPri">' +
      PRI_ORDER.map(k =>
        '<button type="button" class="todo-pri-dot todo-pri-dot--labeled' + (k === editPri ? ' is-on' : '') + '" data-pri="' + k + '" style="--pri-c:' + PRIORITIES[k].color + '"><i></i>' + PRIORITIES[k].label + '</button>'
      ).join('') +
      '</div></div>' +
      '<div class="field"><label>截止日期（可选）</label><input class="input" id="tEditDue" type="date" value="' + SL.esc(item.due || '') + '"></div>' +
      '<div class="field"><label>四象限</label><div class="todo-quad-pick" id="tEditQuad">' +
      [1, 2, 3, 4].map(q =>
        '<button type="button" class="todo-quad-pick__btn' + (q === editQuad ? ' is-on' : '') + '" data-q="' + q + '" style="--q-c:' + QUADRANTS[q].color + '">Q' + q + ' ' + QUADRANTS[q].label + '</button>'
      ).join('') +
      '</div></div>',
    actions: [
      { label: '取消', onClick: () => close() },
      {
        label: '保存', primary: true, onClick: () => {
          const text = document.getElementById('tEditText').value.trim();
          if (!text) { SL.toast('内容不能为空', 'error'); return; }
          const data = SL.getData('todo');
          const t = data.items.find(x => x.id === item.id);
          if (t) {
            t.text = text;
            t.priority = editPri;
            t.quadrant = editQuad;
            t.due = document.getElementById('tEditDue').value || '';
          }
          SL.setData('todo', data);
          close();
          SL.toast('已保存', 'success');
        }
      }
    ]
  });
  setTimeout(() => {
    const priRow = document.getElementById('tEditPri');
    if (priRow) priRow.addEventListener('click', e => {
      const b = e.target.closest('[data-pri]');
      if (!b) return;
      editPri = b.dataset.pri;
      priRow.querySelectorAll('.todo-pri-dot').forEach(x => x.classList.toggle('is-on', x === b));
    });
    const quadRow = document.getElementById('tEditQuad');
    if (quadRow) quadRow.addEventListener('click', e => {
      const b = e.target.closest('[data-q]');
      if (!b) return;
      editQuad = Number(b.dataset.q);
      quadRow.querySelectorAll('.todo-quad-pick__btn').forEach(x => x.classList.toggle('is-on', x === b));
    });
    const t = document.getElementById('tEditText');
    if (t) { t.focus(); t.select(); }
  }, 60);
}

export { render, destroy, meta };
