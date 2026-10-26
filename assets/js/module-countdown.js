/**
 * Module: 考试倒计时 (module-countdown.js)
 * Contractor: SA-09 (Director)
 * Contract: ARCHITECTURE v2.0
 */
'use strict';

const meta = { id: 'countdown', title: '考试倒计时', icon: 'countdown', order: 2 };

let tickTimer = null;

function render(container, params) {
  const data = SL.getData('countdown');
  const exams = data.exams || [];
  const active = exams.filter(e => !isPast(e));
  const past = exams.filter(e => isPast(e));

  let html =
    '<div class="view-header fade-up"><h1>考试倒计时</h1>' +
    '<div class="view-sub">盯着它，就不好意思摸鱼了 · 支持多考试并行</div></div>' +
    '<div style="margin-bottom:16px;"><button class="btn btn--primary" id="cdAdd">' + SL.icon('plus', 16) + ' 添加考试</button></div>';

  if (!exams.length) {
    html += '<div class="empty-state">' + SL.icon('countdown', 52) +
      '<p>还没有考试倒计时<br>添加你的目标考试，让紧迫感成为生产力</p>' +
      '<button class="btn btn--primary" id="cdAddEmpty">添加第一个考试</button></div>';
  } else {
    html += '<div class="cd-grid stagger">';
    active.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(e => { html += examCard(e); });
    html += '</div>';
    if (past.length) {
      html += '<h3 style="margin:22px 0 10px;color:var(--fg-muted);">已结束</h3><div class="cd-grid">';
      past.forEach(e => { html += examCard(e, true); });
      html += '</div>';
    }
  }
  container.innerHTML = html;

  // 绑定
  const onAdd = () => openEditor(null);
  container.querySelector('#cdAdd')?.addEventListener('click', onAdd);
  container.querySelector('#cdAddEmpty')?.addEventListener('click', onAdd);

  container.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openEditor(findExam(b.dataset.edit))));
  container.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
    const e = findExam(b.dataset.del);
    if (e && await SL.confirm('删除「' + e.name + '」倒计时？此操作不可恢复。')) {
      const d = SL.getData('countdown');
      d.exams = d.exams.filter(x => x.id !== e.id);
      SL.setData('countdown', d);
      rerender(container, params);
      SL.toast('已删除', 'info');
    }
  }));
  container.querySelectorAll('[data-revive]').forEach(b => b.addEventListener('click', () => {
    const e = findExam(b.dataset.revive);
    openEditor(e, true);
  }));
  container.querySelectorAll('[data-pin]').forEach(b => b.addEventListener('click', () => {
    const d = SL.getData('countdown');
    const e = d.exams.find(x => x.id === b.dataset.pin);
    if (e) { e.pinned = !e.pinned; SL.setData('countdown', d); rerender(container, params); }
  }));

  // 秒级刷新（倒计时数字）
  clearInterval(tickTimer);
  tickTimer = setInterval(() => {
    if (!document.body.contains(container)) return;
    container.querySelectorAll('[data-cd]').forEach(el => {
      const e = findExam(el.dataset.cd);
      if (e) el.innerHTML = cdCells(e);
    });
  }, 1000);
}

function destroy() { clearInterval(tickTimer); tickTimer = null; }

/* ===== 私有 ===== */
// 非法日期（如 localStorage 被改成 '2026-13-45'）返回 NaN，统一兜底
function examTs(e) {
  const ts = new Date((e && e.date ? String(e.date) : '') + 'T23:59:59').getTime();
  return isFinite(ts) ? ts : NaN;
}

function isPast(e) {
  const ts = examTs(e);
  if (isNaN(ts)) return true; // 无法解析的日期按已结束处理，进归档区不阻塞视图
  return ts < Date.now();
}

function findExam(id) { return (SL.getData('countdown').exams || []).find(e => e.id === id); }

function rerender(container, params) {
  destroy();
  render(container, params);
}

function cdCells(e) {
  const target = examTs(e);
  const diff = Math.max(0, target - Date.now());
  const valid = isFinite(target);
  const d = valid ? Math.floor(diff / 86400000) : 0;
  const h = valid ? Math.floor(diff % 86400000 / 3600000) : 0;
  const m = valid ? Math.floor(diff % 3600000 / 60000) : 0;
  const s = valid ? Math.floor(diff % 60000 / 1000) : 0;
  const pad = n => String(n).padStart(2, '0');
  return '<div class="cd-cell"><b>' + (valid ? d : '—') + '</b><span>天</span></div>' +
    '<div class="cd-cell cd-cell--sm"><b>' + (valid ? pad(h) : '—') + '</b><span>时</span></div>' +
    '<div class="cd-cell cd-cell--sm"><b>' + (valid ? pad(m) : '—') + '</b><span>分</span></div>' +
    '<div class="cd-cell cd-cell--sm"><b>' + (valid ? pad(s) : '—') + '</b><span>秒</span></div>';
}

function examCard(e, isArchive) {
  const ts = examTs(e);
  const days = isNaN(ts) ? NaN : Math.ceil((ts - Date.now()) / 86400000);
  const phase = isNaN(days) ? '日期无效' : phaseLabel(days);
  const urgent = !isArchive && !isNaN(days) && days <= 30;
  return '<div class="card card--pad cd-card' + (urgent ? ' cd-card--urgent' : '') + (isArchive ? ' cd-card--archived' : '') + '">' +
    '<div class="cd-card__head">' +
    '<span class="cd-card__badge" style="background:' + SL.esc(e.color || '#5B6CFF') + '22;color:' + SL.esc(e.color || '#5B6CFF') + '">' + SL.icon(e.icon || 'countdown', 16) + '</span>' +
    '<div class="cd-card__title"><b>' + SL.esc(e.name) + '</b>' +
    '<span class="muted" style="font-size:11.5px;">' + SL.esc(e.date) + (isArchive ? ' · 已结束' : ' · ' + phase) + '</span></div>' +
    '<div class="row-actions">' +
    (isArchive
      ? '<button class="btn btn--ghost btn--sm" data-revive="' + e.id + '">改期复活</button>'
      : '<button class="btn btn--ghost btn--sm" data-pin="' + e.id + '">' + (e.pinned ? '取消置顶' : '置顶') + '</button>') +
    '<button class="btn btn--ghost btn--sm" data-edit="' + e.id + '">' + SL.icon('edit', 14) + '</button>' +
    '<button class="btn btn--ghost btn--sm" data-del="' + e.id + '" aria-label="删除">' + SL.icon('trash', 14) + '</button>' +
    '</div></div>' +
    (isArchive
      ? '<div class="muted" style="padding:16px 0;">这场考试已成过去。无论结果如何，你坚持到了这里。</div>'
      : '<div class="cd-cells" data-cd="' + e.id + '">' + cdCells(e) + '</div>' +
        '<div class="cd-card__foot muted">' +
        (urgent ? '<span class="danger-text">⚠ 考前冲刺</span>' : '<span>里程碑 ' + nextMilestone(days) + '</span>') + '</div>') +
    '</div>';
}

function phaseLabel(days) {
  if (days < 0) return '已结束';
  if (days <= 30) return '考前冲刺期';
  if (days <= 100) return '强化提升期';
  if (days <= 200) return '基础巩固期';
  return '长线备战期';
}
function nextMilestone(days) {
  const ms = [30, 100, 200, 300];
  for (const m of ms) if (days > m) return m + ' 天节点已过';
  return '冲刺';
}

function openEditor(e, isRevive) {
  const isEdit = !!e && !isRevive;
  const overlay = SL.modal({
    title: isRevive ? '改期复活「' + e.name + '」' : (isEdit ? '编辑考试' : '添加考试'),
    body:
      '<div class="field"><label>考试名称 *</label><input class="input" id="cdName" maxlength="24" placeholder="如：2027 考研 / 六级 / 期末考" value="' + SL.esc(isEdit || isRevive ? e.name : '') + '"></div>' +
      '<div class="field"><label>考试日期 *</label><input class="input" id="cdDate" type="date" value="' + SL.esc(isEdit || isRevive ? e.date : '') + '"></div>' +
      '<div class="field"><label>颜色标签</label><div class="cd-colors">' +
      ['#5B6CFF', '#FF7AB6', '#14B8A6', '#F59E0B', '#EF4444', '#A855F7'].map(c =>
        '<button type="button" class="cd-color' + ((isEdit || isRevive) && e.color === c ? ' is-on' : '') + '" data-color="' + c + '" style="background:' + c + '"></button>').join('') +
      '</div></div>',
    actions: [
      { label: '取消', onClick: () => close() },
      {
        label: isRevive ? '复活' : (isEdit ? '保存' : '添加'), primary: true,
        onClick: () => {
          const name = document.getElementById('cdName').value.trim();
          const date = document.getElementById('cdDate').value;
          if (!name) { SL.toast('请填写考试名称', 'error'); return; }
          if (!date) { SL.toast('请选择考试日期', 'error'); return; }
          const colorSel = document.querySelector('.cd-color.is-on');
          const d = SL.getData('countdown');
          d.exams = d.exams || [];
          if (isEdit || isRevive) {
            const t = d.exams.find(x => x.id === e.id);
            if (!t) { close(); return; }
            t.name = name; t.date = date;
            if (colorSel) t.color = colorSel.dataset.color;
          } else {
            d.exams.push({ id: SL.id(), name, date, color: colorSel ? colorSel.dataset.color : '#5B6CFF', icon: 'countdown', createdAt: Date.now() });
          }
          SL.setData('countdown', d);
          close();
          rerender(document.getElementById('view'), {});
          SL.toast(isEdit ? '已保存' : '倒计时已创建，冲！', 'success');
        }
      }
    ]
  });
  const close = overlay;  // SL.modal 返回 close 函数
  // 颜色选择（60ms 后绑定；若 modal 已被关闭则跳过，避免监听泄漏 / 误绑后续 modal 的 .cd-color）
  setTimeout(() => {
    const root = overlay;
    if (!root.isConnected) return;
    root.querySelectorAll('.cd-color').forEach(b => b.addEventListener('click', () => {
      root.querySelectorAll('.cd-color').forEach(x => x.classList.remove('is-on'));
      b.classList.add('is-on');
    }));
    if (!root.querySelector('.cd-color.is-on')) root.querySelector('.cd-color')?.classList.add('is-on');
  }, 60);
}

export { render, destroy, meta };
