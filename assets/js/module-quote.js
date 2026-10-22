/**
 * Module: 每日一句 (module-quote.js)
 * Contractor: SA-25 (Director)
 * Contract: ARCHITECTURE v2.0
 */
'use strict';

const meta = { id: 'quote', title: '每日一句', icon: 'quote', order: 20 };

let cleanup = [];
let destroyed = false;

function render(container) {
  cleanup = [];
  destroyed = false;
  const qData = SL.getData('quote');

  container.innerHTML =
    '<div class="view-header fade-up"><h1>每日一句</h1>' +
    '<div class="view-sub">考研 / 减脂 / 自律语录 · 可收藏 · 可换牌</div></div>' +
    '<div id="qBody"></div>';

  const body = container.querySelector('#qBody');

  import('./data/quotes.js').then(({ QUOTES }) => {
    if (destroyed || !container.isConnected) return;
    let index = qData.todayIndex;
    if (index == null || index < 0 || index >= QUOTES.length) {
      index = Math.floor(Math.random() * QUOTES.length);
      const d = SL.getData('quote');
      d.todayIndex = index;
      SL.setData('quote', d, true);
    }
    drawCard(QUOTES, index);

    function drawCard(list, i) {
      const q = list[i];
      const isFav = (SL.getData('quote').favs || []).some(f => f.text === q.text);
      const tagLabel = { kaoyan: '考研', fitness: '减脂', discipline: '自律', general: '通用' }[q.tag] || '通用';
      body.innerHTML =
        '<div class="card card--pad q-main-card pop-in">' +
        '<div class="q-tag tag">' + tagLabel + '</div>' +
        '<div class="q-mark">' + SL.icon('quote', 34) + '</div>' +
        '<p class="q-text">' + SL.esc(q.text) + '</p>' +
        '<div class="q-by muted">— ' + SL.esc(q.by || '佚名') + '</div>' +
        '<div class="q-actions">' +
        '<button class="btn btn--ghost" id="qNext">' + SL.icon('refresh', 15) + ' 换一句</button>' +
        '<button class="btn ' + (isFav ? 'btn--primary' : 'btn--ghost') + '" id="qFav">' + SL.icon('heart', 15) + (isFav ? ' 已收藏' : ' 收藏') + '</button>' +
        '<button class="btn btn--ghost" id="qCopy">复制</button></div></div>' +

        '<h3 style="margin:20px 0 10px;">我的收藏（' + (SL.getData('quote').favs || []).length + '）</h3>' +
        '<div class="q-favs">' +
        ((SL.getData('quote').favs || []).map(f =>
          '<div class="card card--pad q-fav-card">' +
          '<p style="margin:0 0 6px;">' + SL.esc(f.text) + '</p>' +
          '<div class="muted" style="font-size:11.5px;display:flex;align-items:center;gap:8px;">' +
          '<span>— ' + SL.esc(f.by || '佚名') + '</span><span style="flex:1"></span>' +
          '<button class="btn btn--ghost btn--sm" data-unfav="' + SL.esc(f.text) + '">' + SL.icon('trash', 13) + '</button></div></div>'
        ).join('') || '<div class="muted" style="font-size:13px;">还没有收藏。看到戳中你的句子，点收藏留下来。</div>') +
        '</div>';

      body.querySelector('#qNext').addEventListener('click', () => {
        const d = SL.getData('quote');
        let ni = i;
        while (ni === i && list.length > 1) ni = Math.floor(Math.random() * list.length);
        d.todayIndex = ni;
        SL.setData('quote', d, true);
        drawCard(list, ni);
      });
      body.querySelector('#qFav').addEventListener('click', () => {
        const d = SL.getData('quote');
        d.favs = d.favs || [];
        const exist = d.favs.findIndex(f => f.text === q.text);
        if (exist >= 0) {
          d.favs.splice(exist, 1);
          SL.toast('已取消收藏', 'info');
        } else {
          d.favs.unshift({ text: q.text, by: q.by, tag: q.tag, ts: Date.now() });
          SL.toast('已收藏', 'success');
          const rect = body.querySelector('#qFav').getBoundingClientRect();
          SL.confetti(rect.left + rect.width / 2, rect.top);
        }
        SL.setData('quote', d, true);
        drawCard(list, i);
      });
      body.querySelector('#qCopy').addEventListener('click', async () => {
        const text = q.text + ' — ' + (q.by || '');
        try {
          await navigator.clipboard.writeText(text);
          SL.toast('已复制到剪贴板', 'success');
        } catch (e) {
          // 非安全上下文 / 无权限时的降级方案
          try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand('copy');
            ta.remove();
            SL.toast(ok ? '已复制到剪贴板' : '复制失败，请手动选择', ok ? 'success' : 'error');
          } catch (e2) {
            SL.toast('复制失败，请手动选择', 'error');
          }
        }
      });
      body.querySelectorAll('[data-unfav]').forEach(b => b.addEventListener('click', () => {
        const d = SL.getData('quote');
        d.favs = d.favs.filter(f => f.text !== b.dataset.unfav);
        SL.setData('quote', d, true);
        drawCard(list, i);
      }));
    }
  }).catch(err => {
    body.innerHTML = '<div class="empty-state">' + SL.icon('quote', 52) +
      '<p>语录库加载失败</p><button class="btn btn--primary" onclick="location.reload()">刷新重试</button></div>';
  });
}

function destroy() { cleanup = []; destroyed = true; }

export { render, destroy, meta };
