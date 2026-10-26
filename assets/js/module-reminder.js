/**
 * Module: 提醒中心 (module-reminder.js)
 * Contractor: SA-25 (Director)
 * Contract: ARCHITECTURE v2.0
 */
'use strict';

const meta = { id: 'reminder', title: '提醒中心', icon: 'bell', order: 21 };

function render(container) {
  // 防御脏数据：settings 缺失或非对象时补全默认结构，避免 n.water 直接抛错
  const nData = SL.getData('notifications');
  if (!nData.settings || typeof nData.settings !== 'object') {
    nData.settings = { water: true, waterGap: 90, stand: true, standGap: 45 };
  }
  const n = nData.settings;
  if (n.waterGap == null) n.waterGap = 90;
  if (n.standGap == null) n.standGap = 45;

  container.innerHTML =
    '<div class="view-header fade-up"><h1>提醒中心</h1>' +
    '<div class="view-sub">喝水 · 久坐 · 浏览器通知 · 页面可见时温和提醒</div></div>' +

    '<div class="card card--pad" style="margin-bottom:14px;">' +
    '<h3>' + SL.icon('bell', 16) + ' 通知权限</h3>' +
    '<div class="rm-perm" id="rmPerm">' + permHTML() + '</div></div>' +

    '<div class="card card--pad" style="margin-bottom:14px;">' +
    '<h3>' + SL.icon('water', 16) + ' 喝水提醒</h3>' +
    '<div class="st-row"><span>开启提醒</span><button class="switch' + (n.water ? ' is-on' : '') + '" id="rmWater" type="button" role="switch"></button></div>' +
    '<div class="st-row"><span>提醒间隔</span><div class="st-seg" id="rmWaterGap">' +
    [[45, '45 分钟'], [60, '1 小时'], [90, '90 分钟'], [120, '2 小时']]
      .map(([v, l]) => '<button class="st-seg__btn' + (n.waterGap === v ? ' is-on' : '') + '" data-v="' + v + '">' + l + '</button>').join('') +
    '</div></div></div>' +

    '<div class="card card--pad">' +
    '<h3>' + SL.icon('run', 16) + ' 久坐提醒</h3>' +
    '<div class="st-row"><span>开启提醒</span><button class="switch' + (n.stand ? ' is-on' : '') + '" id="rmStand" type="button" role="switch"></button></div>' +
    '<div class="st-row"><span>提醒间隔</span><div class="st-seg" id="rmStandGap">' +
    [[30, '30 分钟'], [45, '45 分钟'], [60, '1 小时']]
      .map(([v, l]) => '<button class="st-seg__btn' + (n.standGap === v ? ' is-on' : '') + '" data-v="' + v + '">' + l + '</button>').join('') +
    '</div></div></div>' +

    '<div class="card card--pad" style="margin-top:14px;">' +
    '<p class="muted" style="font-size:12.5px;margin:0;">提示：提醒在页面打开时生效（每分钟检测节流）。开启浏览器通知后，即使页面在后台也能收到弹窗。考研人每小时起身活动 2 分钟，腰和颈椎会谢谢你。</p></div>';

  /* 通知权限 */
  const bindPerm = () => {
    const btn = container.querySelector('#rmPermBtn');
    if (btn) btn.addEventListener('click', async () => {
      if (!('Notification' in window)) { SL.toast('此浏览器不支持通知', 'error'); return; }
      if (Notification.permission === 'granted') {
        // 发一个测试通知
        try { new Notification('研轻提醒', { body: '这是一条测试通知，配置成功！' }); } catch (e) {}
        SL.toast('已发送测试通知', 'success');
      } else {
        const p = await Notification.requestPermission();
        if (p === 'granted') SL.toast('通知权限已开启', 'success');
        else SL.toast('权限被拒绝，可在浏览器地址栏左侧重新允许', 'error');
        container.querySelector('#rmPerm').innerHTML = permHTML();
        bindPerm();
      }
    });
  };
  bindPerm();

  /* 开关与间隔 */
  const bindSwitchRow = (sel, key) => {
    const el = container.querySelector(sel);
    if (!el) return;
    el.addEventListener('click', () => {
      const d = SL.getData('notifications');
      if (!d.settings || typeof d.settings !== 'object') d.settings = {};
      d.settings[key] = !d.settings[key];
      SL.setData('notifications', d);
      el.classList.toggle('is-on', d.settings[key]);
      if (key === 'water' && d.settings.water) localStorage.setItem('sl_last_hint_water', String(Date.now()));
      if (key === 'stand' && d.settings.stand) localStorage.setItem('sl_last_hint_stand', String(Date.now()));
    });
  };
  bindSwitchRow('#rmWater', 'water');
  bindSwitchRow('#rmStand', 'stand');

  const bindGap = (sel, key) => {
    container.querySelectorAll(sel + ' .st-seg__btn').forEach(b => b.addEventListener('click', () => {
      const d = SL.getData('notifications');
      if (!d.settings || typeof d.settings !== 'object') d.settings = {};
      d.settings[key] = Number(b.dataset.v);
      SL.setData('notifications', d);
      container.querySelectorAll(sel + ' .st-seg__btn').forEach(x => x.classList.toggle('is-on', x === b));
    }));
  };
  bindGap('#rmWaterGap', 'waterGap');
  bindGap('#rmStandGap', 'standGap');
}

function destroy() {}

function permHTML() {
  if (!('Notification' in window)) return '<p class="muted" style="font-size:13px;">当前浏览器不支持系统通知，页面内提醒仍然有效。</p>';
  const st = Notification.permission;
  if (st === 'granted') {
    return '<div class="rm-perm__row"><span class="success-text">' + SL.icon('checkCircle', 16) + ' 通知已开启</span>' +
      '<button class="btn btn--ghost btn--sm" id="rmPermBtn">发送测试通知</button></div>';
  }
  if (st === 'denied') {
    return '<p class="danger-text" style="font-size:13px;">通知权限被拒绝。请在浏览器地址栏左侧的权限图标中重新允许「通知」。</p>';
  }
  return '<div class="rm-perm__row"><span class="muted">开启后即使页面在后台也能收到提醒</span>' +
    '<button class="btn btn--primary btn--sm" id="rmPermBtn">开启浏览器通知</button></div>';
}

export { render, destroy, meta };
