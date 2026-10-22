/**
 * Module: 自律商城 (module-shop.js)
 * Contractor: SA-18
 * Contract: ARCHITECTURE v2.0
 */
'use strict';

const meta = { id: 'shop', title: '自律商城', icon: 'wallet', order: 20 };

let viewRoot = null, viewParams = {};
const PAGE_SIZE = 20;
let page = 0; // 0-based

/* 预置心愿建议 */
const SUGGESTIONS = [
  { name: '看一场电影', cost: 50 },
  { name: '奶茶自由',   cost: 30 },
  { name: '新壁纸',     cost: 80 },
  { name: '游戏时间1h', cost: 100 },
  { name: '周末睡懒觉', cost: 150 }
];

/* 赚币攻略（唯一规范：§6.5） */
const EARN_GUIDE = [
  { icon: 'timer',  name: '完成一个番茄钟', coin: 5 },
  { icon: 'check',  name: '习惯打卡一次',   coin: 2 },
  { icon: 'book',   name: '写一篇日记',     coin: 3 },
  { icon: 'scale',  name: '记录一次体重',   coin: 2 },
  { icon: 'trophy', name: '解锁一枚成就',   coin: 10 }
];

function shop() { return SL.getData('shop'); }

function totals(s) {
  const recs = s.records || [];
  let earn = 0, spend = 0;
  for (const r of recs) {
    if (r.type === 'spend') spend += r.cost || 0;
    else earn += r.cost || 0;
  }
  return { earn, spend };
}

function render(container, params) {
  viewRoot = container; viewParams = params || {};
  page = 0;
  paint();
  SL.bindCardSwipe?.();
  SL.refreshBadges?.();
}

/* 监听他人模块发币后自动刷新余额/流水 */
let onShopChange = null;

function paint() {
  if (!onShopChange) onShopChange = () => paint();
  SL.off('data:shop', onShopChange);
  SL.on('data:shop', onShopChange);

  const s = shop();
  const t = totals(s);
  const recs = s.records || [];
  const maxPage = Math.max(0, Math.ceil(recs.length / PAGE_SIZE) - 1);
  if (page > maxPage) page = maxPage;

  viewRoot.innerHTML =
    '<div class="view-header fade-up"><h1>自律商城</h1>' +
    '<div class="view-sub">攒下的每一枚自律币，都兑换成犒劳自己的礼物</div></div>' +

    /* 余额 */
    '<div class="card card--pad shop-coin-card fade-up">' +
      '<div class="shop-coin-card__main">' +
        '<span class="shop-coin-card__wallet">' + SL.icon('wallet', 30) + '</span>' +
        '<div><div class="shop-coin-card__label">自律币余额</div>' +
        '<strong class="shop-coin-card__num" id="shopCoin">' + (s.coin || 0) + '</strong></div>' +
      '</div>' +
      '<div class="shop-coin-card__sub">' +
        '<span>' + SL.icon('plus', 14) + ' 累计获得 <strong>' + t.earn + '</strong></span>' +
        '<span>' + SL.icon('minus', 14) + ' 累计消费 <strong>' + t.spend + '</strong></span>' +
      '</div>' +
    '</div>' +

    '<div class="shop-layout">' +

      /* 心愿单 */
      '<div class="card card--pad shop-wishlist fade-up">' +
        '<h2 class="shop-h2">' + SL.icon('gift', 16) + ' 心愿单</h2>' +
        '<form class="shop-wish-form" id="shopWishForm">' +
          '<input class="input" id="shopWishName" maxlength="20" placeholder="想犒劳自己什么？">' +
          '<input class="input shop-wish-cost" id="shopWishCost" type="number" min="1" max="9999" placeholder="币数">' +
          '<button class="btn btn--primary" type="submit">' + SL.icon('plus', 15) + ' 添加</button>' +
        '</form>' +
        '<div class="shop-suggest muted">建议：' +
          SUGGESTIONS.map(g => '<button type="button" class="shop-suggest__chip" data-name="' + SL.esc(g.name) + '" data-cost="' + g.cost + '">' + SL.esc(g.name) + ' ' + g.cost + '</button>').join('') +
        '</div>' +
        '<div id="shopWishList"></div>' +
      '</div>' +

      '<div class="shop-side">' +

        /* 赚币攻略 */
        '<div class="card card--pad shop-guide fade-up">' +
          '<h2 class="shop-h2">' + SL.icon('sparkles', 16) + ' 赚币攻略</h2>' +
          '<table class="shop-guide__table"><tbody>' +
            EARN_GUIDE.map(g =>
              '<tr><td class="shop-guide__icon">' + SL.icon(g.icon, 16) + '</td>' +
              '<td>' + SL.esc(g.name) + '</td>' +
              '<td class="shop-guide__coin">+' + g.coin + '</td></tr>'
            ).join('') +
          '</tbody></table>' +
        '</div>' +

        /* 账目流水 */
        '<div class="card card--pad shop-records fade-up">' +
          '<h2 class="shop-h2">' + SL.icon('list', 16) + ' 账目流水</h2>' +
          '<div id="shopRecords"></div>' +
          '<div class="shop-pager">' +
            '<button class="btn btn--ghost btn--sm" id="shopPrev"' + (page <= 0 ? ' disabled' : '') + '>' + SL.icon('chevronL', 14) + ' 上一页</button>' +
            '<span class="muted shop-pager__info">' + (recs.length ? (page + 1) + ' / ' + (maxPage + 1) : '暂无') + '</span>' +
            '<button class="btn btn--ghost btn--sm" id="shopNext"' + (page >= maxPage ? ' disabled' : '') + '>下一页 ' + SL.icon('chevronR', 14) + '</button>' +
          '</div>' +
        '</div>' +

      '</div>' +
    '</div>';

  renderWishlist();
  renderRecords();
  bindEvents();
}

/* ===== 心愿单 ===== */
function renderWishlist() {
  const box = viewRoot.querySelector('#shopWishList');
  if (!box) return;
  const s = shop();
  const list = s.wishlist || [];
  if (!list.length) {
    box.innerHTML = '<div class="empty-state shop-wish-empty">' + SL.icon('gift', 44) +
      '<p>心愿单还是空的<br>定一个小奖励，让自律有盼头</p></div>';
    return;
  }
  const coin = s.coin || 0;
  box.innerHTML = '<ul class="shop-wish-list">' + list.map(w => {
    const done = !!w.done;
    const can = coin >= (w.cost || 0);
    return '<li class="shop-wish' + (done ? ' is-done' : '') + '">' +
      '<div class="shop-wish__info"><strong>' + SL.esc(w.name) + '</strong>' +
      '<span class="muted">' + (done
        ? '已兑换 · ' + SL.esc(w.doneAt ? SL.fmt.date(new Date(w.doneAt)) + ' ' + SL.fmt.time(new Date(w.doneAt)) : '')
        : '需 ' + (w.cost || 0) + ' 自律币' + (can ? '' : ' · 还差 ' + ((w.cost || 0) - coin) + ' 币')) + '</span></div>' +
      (done
        ? '<span class="shop-wish__check">' + SL.icon('checkCircle', 18) + '</span>'
        : '<span class="row-actions">' +
          '<button class="btn btn--primary btn--sm" data-redeem="' + w.id + '"' + (can ? '' : ' disabled') + '>' + SL.icon('gift', 13) + ' 兑换</button>' +
          '<button class="btn btn--ghost btn--sm" data-wdel="' + w.id + '" title="删除">' + SL.icon('trash', 14) + '</button></span>') +
      '</li>';
  }).join('') + '</ul>';

  box.querySelectorAll('[data-redeem]').forEach(b => b.addEventListener('click', () => redeem(b.dataset.redeem, b)));
  box.querySelectorAll('[data-wdel]').forEach(b => b.addEventListener('click', async () => {
    const s2 = shop();
    const w = (s2.wishlist || []).find(x => x.id === b.dataset.wdel);
    if (w && await SL.confirm('删除心愿「' + w.name + '」？')) {
      s2.wishlist = s2.wishlist.filter(x => x.id !== w.id);
      SL.setData('shop', s2);
      SL.toast('已删除心愿', 'info');
    }
  }));
}

function fmtTime(ts) {
  return SL.fmt.time(new Date(ts));
}

async function redeem(id, btn) {
  const s = shop();
  const w = (s.wishlist || []).find(x => x.id === id);
  if (!w || w.done) return;
  const ok = SL.spendCoin('兑换心愿：' + w.name, w.cost || 0);
  if (!ok) return;
  w.done = true;
  w.doneAt = Date.now();
  SL.setData('shop', s); // 广播 data:shop，paint 会刷新
  const r = btn ? btn.getBoundingClientRect() : null;
  SL.confetti?.(r ? r.left + r.width / 2 : innerWidth / 2, r ? r.top + r.height / 2 : innerHeight / 2);
  SL.toast('恭喜兑换「' + w.name + '」，好好享受！', 'success');
}

/* ===== 流水 ===== */
function renderRecords() {
  const box = viewRoot.querySelector('#shopRecords');
  if (!box) return;
  const recs = (shop().records || []);
  if (!recs.length) {
    box.innerHTML = '<div class="empty-state shop-rec-empty">' + SL.icon('wallet', 40) +
      '<p>还没有流水<br>去完成番茄钟、打卡，赚第一枚自律币</p></div>';
    return;
  }
  const slice = recs.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  box.innerHTML = '<ul class="shop-rec-list">' + slice.map(r => {
    const spend = r.type === 'spend';
    return '<li class="shop-rec">' +
      '<span class="shop-rec__sign ' + (spend ? 'is-spend' : 'is-earn') + '">' + (spend ? SL.icon('minus', 12) : SL.icon('plus', 12)) + '</span>' +
      '<div class="shop-rec__info"><strong>' + SL.esc(r.item || '自律币') + '</strong>' +
      '<span class="muted">' + SL.fmt.date(new Date(r.ts)) + ' ' + fmtTime(r.ts) + '</span></div>' +
      '<span class="shop-rec__amount ' + (spend ? 'is-spend' : 'is-earn') + '">' + (spend ? '-' : '+') + (r.cost || 0) + '</span>' +
      '</li>';
  }).join('') + '</ul>';
}

/* ===== 事件 ===== */
function bindEvents() {
  const form = viewRoot.querySelector('#shopWishForm');
  form.addEventListener('submit', ev => {
    ev.preventDefault();
    const name = viewRoot.querySelector('#shopWishName').value.trim();
    const cost = parseInt(viewRoot.querySelector('#shopWishCost').value, 10);
    if (!name) { SL.toast('先写下心愿名称', 'error'); return; }
    if (!(cost > 0)) { SL.toast('请填写有效的代价币数', 'error'); return; }
    const s = shop();
    s.wishlist = s.wishlist || [];
    s.wishlist.unshift({ id: SL.id(), name, cost, done: false });
    SL.setData('shop', s);
    SL.toast('心愿已加入清单', 'success');
  });

  viewRoot.querySelectorAll('.shop-suggest__chip').forEach(c => c.addEventListener('click', () => {
    viewRoot.querySelector('#shopWishName').value = c.dataset.name;
    viewRoot.querySelector('#shopWishCost').value = c.dataset.cost;
    viewRoot.querySelector('#shopWishName').focus();
  }));

  viewRoot.querySelector('#shopPrev').addEventListener('click', () => {
    if (page > 0) { page--; renderRecords(); updatePager(); }
  });
  viewRoot.querySelector('#shopNext').addEventListener('click', () => {
    const maxPage = Math.max(0, Math.ceil((shop().records || []).length / PAGE_SIZE) - 1);
    if (page < maxPage) { page++; renderRecords(); updatePager(); }
  });
}

function updatePager() {
  const recs = (shop().records || []);
  const maxPage = Math.max(0, Math.ceil(recs.length / PAGE_SIZE) - 1);
  const prev = viewRoot.querySelector('#shopPrev');
  const next = viewRoot.querySelector('#shopNext');
  const info = viewRoot.querySelector('.shop-pager__info');
  if (prev) prev.disabled = page <= 0;
  if (next) next.disabled = page >= maxPage;
  if (info) info.textContent = recs.length ? (page + 1) + ' / ' + (maxPage + 1) : '暂无';
}

function destroy() {
  if (onShopChange) { SL.off('data:shop', onShopChange); onShopChange = null; }
}

export { render, destroy, meta };
