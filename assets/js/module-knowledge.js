/**
 * Module: 备考知识库 (module-knowledge.js)
 * Contractor: SA-26 (Director)
 * Contract: ARCHITECTURE v2.0
 */
'use strict';

const meta = { id: 'knowledge', title: '备考知识库', icon: 'book', order: 6 };

function render(container) {
  const kData = SL.getData('knowledge');

  container.innerHTML =
    '<div class="view-header fade-up"><h1>备考知识库</h1>' +
    '<div class="view-sub">考研常识 · 学习方法 · 减脂科普 · 运动知识 · 健康作息</div></div>' +
    '<div id="knBody"><div class="view-loading" style="text-align:center;padding:50px;color:var(--fg-muted);">' + SL.icon('refresh', 22) + ' 加载中…</div></div>';

  const body = container.querySelector('#knBody');

  import('./data/knowledge.js').then(({ KNOWLEDGE, KNOWLEDGE_CATS }) => {
    // 今日推荐：按日期轮换 3 张（filter 后仍可能为空，兜底回全部列表）
    const daySeed = Math.floor(Date.now() / 86400000);
    const pool = KNOWLEDGE.length ? KNOWLEDGE : [];
    const todayPicks = [];
    if (pool.length) {
      for (let i = 0; i < 3; i++) {
        const pick = pool[(daySeed * 7 + i * 29) % pool.length];
        if (!todayPicks.includes(pick)) todayPicks.push(pick);
      }
    }

    let activeCat = 'all';
    draw();

    function draw() {
      if (!document.contains(body)) return; // 视图已切换，跳过本轮重绘
      const readData = SL.getData('knowledge');
      const readIds = Array.isArray(readData.readIds) ? readData.readIds : [];
      const list = activeCat === 'all' ? KNOWLEDGE : KNOWLEDGE.filter(k => k.cat === activeCat);
      body.innerHTML =
        '<h3 style="margin-bottom:10px;">今日推荐</h3>' +
        '<div class="kn-picks stagger">' +
        todayPicks.map(k => pickCard(k, readIds)).join('') + '</div>' +

        '<div class="kn-filter" style="margin:20px 0 12px;">' +
        '<button class="tag kn-cat' + (activeCat === 'all' ? ' is-on' : '') + '" data-cat="all">全部 ' + KNOWLEDGE.length + '</button>' +
        KNOWLEDGE_CATS.map(c =>
          '<button class="tag kn-cat' + (activeCat === c.id ? ' is-on' : '') + '" data-cat="' + c.id + '">' + c.name + ' ' + KNOWLEDGE.filter(k => k.cat === c.id).length + '</button>').join('') +
        '</div>' +

        '<div class="kn-grid">' +
        list.map(k => {
          const read = readIds.includes(k.id);
          return '<div class="card card--pad kn-card' + (read ? ' is-read' : '') + '" data-kn="' + k.id + '">' +
            '<div class="kn-card__head">' +
            '<span class="kn-card__cat">' + catName(k.cat) + '</span>' +
            (read ? '<span class="kn-card__read">' + SL.icon('check', 11) + ' 已读</span>' : '') + '</div>' +
            '<b class="kn-card__title">' + SL.esc(k.title) + '</b>' +
            '<p class="kn-card__excerpt">' + SL.esc(k.body.slice(0, 64)) + '…</p>' +
            '</div>';
        }).join('') + '</div>';

      // 分类筛选
      body.querySelectorAll('.kn-cat').forEach(b => b.addEventListener('click', () => {
        activeCat = b.dataset.cat;
        draw();
      }));
      // 打开卡片
      body.querySelectorAll('[data-kn]').forEach(card => card.addEventListener('click', () => openCard(card.dataset.kn)));
    }

    function pickCard(k, readIds) {
      return '<div class="card card--pad kn-pick" data-kn="' + k.id + '">' +
        '<span class="tag tag--hot">今日</span>' +
        '<b>' + SL.esc(k.title) + '</b>' +
        '<p class="muted" style="font-size:12px;margin:4px 0 0;">' + SL.esc(k.body.slice(0, 40)) + '…</p></div>';
    }

    function openCard(id) {
      const k = KNOWLEDGE.find(x => x.id === id);
      if (!k) return;
      // 标记已读（含去重 + 数组兜底）
      const d = SL.getData('knowledge');
      if (!Array.isArray(d.readIds)) d.readIds = [];
      if (!d.readIds.includes(id)) {
        d.readIds.push(id);
        SL.setData('knowledge', d, true);
        draw();
      }
      const modalTitle = typeof k.title === 'string' ? k.title : (k.title && k.title.text) || '';
      const modalBody = typeof k.body === 'string' ? k.body : (k.body && k.body.text) || '';
      const closeCard = SL.modal({
        title: SL.esc(modalTitle),
        body: '<span class="tag" style="margin-bottom:10px;display:inline-block;">' + catName(k.cat) + '</span>' +
          '<p style="font-size:14px;line-height:1.9;margin:0;white-space:pre-line;">' + SL.esc(modalBody) + '</p>',
        actions: [{ label: '知道了', primary: true, onClick: () => closeCard() }]
      });
    }

    function catName(catId) {
      return (KNOWLEDGE_CATS.find(c => c.id === catId) || {}).name || catId;
    }
  }).catch(() => {
    body.innerHTML = '<div class="empty-state">' + SL.icon('book', 52) +
      '<p>知识库加载失败</p><button class="btn btn--primary" onclick="location.reload()">刷新重试</button></div>';
  });
}

function destroy() {}

export { render, destroy, meta };
