/**
 * Module: 目标管理 (module-goals.js)
 * Contractor: SA-22 (Director)
 * Contract: ARCHITECTURE v2.0
 */
'use strict';

const meta = { id: 'goals', title: '目标管理', icon: 'target', order: 17 };

let viewRoot = null, viewParams = {};

function render(container, params) {
  viewRoot = container; viewParams = params || {};
  const goals = SL.getData('goals').items || [];

  container.innerHTML =
    '<div class="view-header fade-up"><h1>目标管理</h1>' +
    '<div class="view-sub">把大目标拆成台阶 · 考研分数 / 目标体重 / 任何想完成的事</div></div>' +

    '<div style="margin-bottom:16px;"><button class="btn btn--primary" id="gAdd">' + SL.icon('plus', 16) + ' 新建目标</button></div>' +
    '<div id="gList" class="gl-grid stagger"></div>';

  const listEl = container.querySelector('#gList');
  const renderList = () => {
    const items = SL.getData('goals').items || [];
    if (!items.length) {
      listEl.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">' + SL.icon('target', 52) +
        '<p>还没有长期目标<br>「考研 380 分」「减到 60kg」「读完 12 本书」都值得放进来</p>' +
        '<button class="btn btn--primary" id="gAddEmpty">创建第一个目标</button></div>';
      listEl.querySelector('#gAddEmpty')?.addEventListener('click', () => openEditor(null));
      return;
    }
    listEl.innerHTML = items.map(goalCard).join('');
    // 绑定
    listEl.querySelectorAll('[data-progress]').forEach(b => b.addEventListener('click', () => bumpProgress(b.dataset.progress)));
    listEl.querySelectorAll('[data-set]').forEach(inp => {
      inp.addEventListener('change', commit);
      inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); commit(); } });
      function commit() {
        // 直接 parseFloat：SL.parseNum(v, NaN) 会因 (NaN || 0) 返回 0，导致清空输入误将进度归零
        const v = parseFloat(inp.value);
        if (isNaN(v)) { inp.value = ''; return; }
        setProgress(inp.dataset.set, v);
      }
    });
    listEl.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openEditor(findGoal(b.dataset.edit))));
    listEl.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      const g = findGoal(b.dataset.del);
      if (!g) return;
      if (await SL.confirm('删除目标「' + SL.esc(g.name) + '」？')) {
        const d = SL.getData('goals');
        d.items = (d.items || []).filter(x => x.id !== g.id);
        SL.setData('goals', d);
        renderList();
      }
    }));
    listEl.querySelectorAll('[data-ms]').forEach(b => b.addEventListener('click', () => {
      const sep = String(b.dataset.ms).indexOf(':');
      if (sep < 0) return;
      const gid = b.dataset.ms.slice(0, sep);
      const idx = Number(b.dataset.ms.slice(sep + 1));
      const d = SL.getData('goals');
      const g = (d.items || []).find(x => x.id === gid);
      const ms = g && Array.isArray(g.milestones) ? g.milestones[idx] : null;
      if (!ms) return;
      ms.done = !ms.done;
      SL.setData('goals', d);
      if (ms.done) {
        SL.toast('里程碑达成：' + ms.name, 'success');
        const rect = b.getBoundingClientRect();
        SL.confetti(rect.left + 30, rect.top + 10);
      }
      renderList();
    }));
  };
  container.querySelector('#gAdd').addEventListener('click', () => openEditor(null));
  renderList();
}

function destroy() {}

function findGoal(id) { return (SL.getData('goals').items || []).find(g => g.id === id); }

function goalCard(g) {
  // 防御脏数据：current/target 非数值时按 0 处理；百分比钳制在 0-100，避免 NaN/Infinity 注入样式
  const cur = Number(g.current) || 0;
  const tar = Number(g.target) || 0;
  const pct = Math.max(0, Math.min(100, (tar > 0 ? cur / tar : 0) * 100)) || 0;
  const done = tar > 0 && cur >= tar;
  // deadline 非法日期时 new Date() 得 NaN，Math.ceil(NaN)=NaN → 显示 "剩 NaN 天"，需先判有效
  let days = null;
  if (g.deadline) {
    const dl = new Date(g.deadline + 'T23:59:59');
    if (!isNaN(dl.getTime())) days = Math.ceil((dl.getTime() - Date.now()) / 86400000);
  }
  const typeLabel = { score: '分数', weight: '体重 kg', count: '数量', book: '本书', custom: g.unitLabel || '进度' }[g.type] || '进度';
  return '<div class="card card--pad gl-card' + (done ? ' gl-card--done' : '') + '">' +
    '<div class="gl-card__head">' +
    '<span class="gl-card__icon">' + SL.icon(g.type === 'weight' ? 'scale' : g.type === 'book' ? 'book' : 'target', 18) + '</span>' +
    '<div style="flex:1;min-width:0"><b class="gl-card__name">' + SL.esc(g.name) + '</b>' +
    '<div class="muted" style="font-size:11.5px;">' + typeLabel +
    (days != null ? ' · ' + (days >= 0 ? '剩 ' + days + ' 天' : '已到期') : '') + '</div></div>' +
    '<span class="row-actions">' +
    '<button class="btn btn--ghost btn--sm" data-edit="' + g.id + '">' + SL.icon('edit', 14) + '</button>' +
    '<button class="btn btn--ghost btn--sm" data-del="' + g.id + '">' + SL.icon('trash', 14) + '</button></span></div>' +

    '<div class="gl-card__nums">' +
    '<span class="gl-cur">' + SL.esc(String(cur)) + '</span><span class="muted">/ ' + SL.esc(String(g.target)) + ' ' + typeLabel + '</span>' +
    (done ? '<span class="tag tag--green">已达成</span>' : '<span class="tag">' + Math.round(pct) + '%</span>') +
    '</div>' +
    '<div class="progress-bar"><div class="progress-bar__fill" style="width:' + pct + '%"></div></div>' +

    (done ? '' :
    '<div class="gl-quick">' +
    [-10, -1, 1, 10].map(step =>
      '<button class="btn btn--ghost btn--sm" data-progress="' + g.id + ':' + step + '">' + (step > 0 ? '+' : '') + step + '</button>').join('') +
    '<input class="input gl-quick__input" type="number" placeholder="设为" data-set="' + g.id + '">' +
    '</div>') +

    (g.milestones && g.milestones.length ?
      '<div class="gl-ms"><div class="muted" style="font-size:11.5px;margin-bottom:6px;">里程碑</div>' +
      g.milestones.map((m, i) =>
        '<button class="gl-ms__item' + (m.done ? ' is-done' : '') + '" data-ms="' + g.id + ':' + i + '">' +
        '<span class="gl-ms__check">' + SL.icon('check', 11) + '</span>' + SL.esc(m.name) + '</button>').join('') + '</div>' : '') +
    '</div>';
}

function setProgress(id, value) {
  const d = SL.getData('goals');
  const items = Array.isArray(d.items) ? d.items : (d.items = []);
  const g = items.find(x => x.id === id);
  if (!g) return;
  const before = Number(g.current) || 0;
  const target = Number(g.target) || 0;
  g.current = Math.max(0, value);
  SL.setData('goals', d);
  if (target > 0 && g.current >= target && before < target) {
    SL.earnCoin('达成目标：' + g.name, 20);
    SL.toast('目标达成！+20 自律币', 'success');
    SL.confetti(window.innerWidth / 2, window.innerHeight / 3);
  }
  render(viewRoot, viewParams);
}

function bumpProgress(key) {
  const parts = String(key).split(':');
  const id = parts[0];
  const step = Number(parts[1]);
  const g = findGoal(id);
  if (!g || isNaN(step)) return;
  setProgress(id, Math.max(0, (Number(g.current) || 0) + step));
}

function openEditor(goal) {
  const isNew = !goal;
  const close = SL.modal({
    title: isNew ? '新建目标' : '编辑目标',
    body:
      '<div class="field"><label>目标名称 *</label><input class="input" id="gName" maxlength="30" placeholder="如：考研总分 / 减到目标体重 / 读完专业课书" value="' + SL.esc(isNew ? '' : goal.name) + '"></div>' +
      '<div class="field"><label>类型</label><select class="select" id="gType">' +
      [['score', '分数'], ['weight', '体重(kg)'], ['count', '数量'], ['book', '读书(本)'], ['custom', '自定义']]
        .map(([v, l]) => '<option value="' + v + '"' + (!isNew && goal.type === v ? ' selected' : '') + '>' + l + '</option>').join('') +
      '</select></div>' +
      '<div style="display:flex;gap:10px;">' +
      '<div class="field" style="flex:1"><label>当前值 *</label><input class="input" id="gCur" type="number" step="any" value="' + (isNew ? 0 : SL.esc(String(goal.current))) + '"></div>' +
      '<div class="field" style="flex:1"><label>目标值 *</label><input class="input" id="gTar" type="number" step="any" placeholder="如 380" value="' + (isNew ? '' : SL.esc(String(goal.target))) + '"></div></div>' +
      '<div class="field"><label>截止日期</label><input class="input" id="gDl" type="date" value="' + (isNew ? '' : SL.esc(goal.deadline || '')) + '"></div>' +
      '<div class="field"><label>里程碑（每行一个，达成一个勾一个）</label><textarea class="textarea" id="gMs" rows="3" placeholder="如：&#10;英语真题刷完一轮&#10;数学强化课听完&#10;体重下 70">' + SL.esc(isNew ? '' : (goal.milestones || []).map(m => m.name).join('\n')) + '</textarea></div>',
    actions: [
      { label: '取消', onClick: () => close() },
      { label: '保存', primary: true, onClick: () => {
          const name = document.getElementById('gName').value.trim();
          const cur = SL.parseNum(document.getElementById('gCur').value, 0);
          const tar = SL.parseNum(document.getElementById('gTar').value, 0);
          if (!name) { SL.toast('请填写目标名称', 'error'); return; }
          if (!tar) { SL.toast('请填写目标值', 'error'); return; }
          const type = document.getElementById('gType').value;
          const dl = document.getElementById('gDl').value;
            const ms = document.getElementById('gMs').value.split('\n').map(s => s.trim()).filter(Boolean).map(n => ({ name: n, done: false }));
            const d = SL.getData('goals');
            d.items = d.items || [];
            if (isNew) {
            d.items.unshift({ id: SL.id(), name, type, current: cur, target: tar, deadline: dl || null, milestones: ms, createdAt: Date.now() });
            SL.toast('目标已创建', 'success');
          } else {
            const t = d.items.find(x => x.id === goal.id);
            if (!t) { SL.toast('目标不存在或已被删除', 'error'); return; }
            // 保留已勾选状态：按名字匹配（重名里程碑只继承第一个，避免计数错位）
            const used = new Set();
            const oldMs = Array.isArray(t.milestones) ? t.milestones : [];
            t.name = name; t.type = type; t.current = cur; t.target = tar; t.deadline = dl || null;
            t.milestones = ms.map(m => {
              const idx = oldMs.findIndex((o, oi) => !used.has(oi) && o.name === m.name);
              if (idx >= 0) used.add(idx);
              return { ...m, done: idx >= 0 ? !!oldMs[idx].done : false };
            });
            SL.toast('已保存', 'success');
          }
          SL.setData('goals', d);
          close();
          render(viewRoot, viewParams);
        } }
    ]
  });
}

export { render, destroy, meta };
