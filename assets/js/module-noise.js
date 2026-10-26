/**
 * Module: 白噪音 (module-noise.js)
 * Contractor: SA-24 (Director)
 * Contract: ARCHITECTURE v2.0 — Web Audio API 合成白噪音，零外部音频文件
 */
'use strict';

const meta = { id: 'noise', title: '白噪音', icon: 'music', order: 4 };

let ac = null;
let nodes = [];        // 活跃音源 {id, gain, stop}
let cleanup = [];

/* ===== 噪音配方（全部程序化合成） ===== */
const RECIPES = {
  rain: { label: '雨声', icon: 'rain', make: makeRain },
  ocean: { label: '海浪', icon: 'water', make: makeOcean },
  forest: { label: '森林', icon: 'tree', make: makeForest },
  keys: { label: '键盘', icon: 'grid', make: makeKeys },
  fireplace: { label: '炉火', icon: 'flame', make: makeFire },
  brown: { label: '棕噪音', icon: 'moon', make: makeBrown },
  night: { label: '夜虫', icon: 'moon', make: makeCrickets }
};

function render(container) {
  const playing = nodes.map(n => n.id);

  container.innerHTML =
    '<div class="view-header fade-up"><h1>白噪音</h1>' +
    '<div class="view-sub">Web Audio 实时合成 · 可混合 · 配合番茄钟使用</div></div>' +

    '<div class="card card--pad" style="margin-bottom:16px;">' +
    '<div class="nz-master">' +
    '<span class="nz-master__icon">' + SL.icon('music', 22) + '</span>' +
    '<div style="flex:1"><b>总音量</b><div class="muted" style="font-size:12px;">' + (playing.length ? playing.map(id => RECIPES[id].label).join(' + ') : '当前安静') + '</div></div>' +
    '<input type="range" id="nzMaster" min="0" max="100" value="' + (localStorage.getItem('sl_nz_master') || 60) + '" class="nz-range">' +
    '<button class="btn btn--danger btn--sm" id="nzStopAll">全部停止</button></div></div>' +

    '<div class="nz-grid stagger">' +
    Object.entries(RECIPES).map(([id, r]) => {
      const on = playing.includes(id);
      return '<div class="card card--pad nz-card' + (on ? ' is-on' : '') + '" data-noise="' + id + '">' +
        '<div class="nz-card__icon">' + SL.icon(r.icon, 26) + '</div>' +
        '<b>' + r.label + '</b>' +
        '<div class="nz-card__hint muted">' + (on ? '播放中' : '点击播放') + '</div>' +
        '<input type="range" min="0" max="100" value="70" class="nz-range nz-vol' + (on ? '' : ' hidden') + '" data-vol="' + id + '"' + (on ? '' : ' disabled') + '>' +
        '</div>';
    }).join('') +
    '</div>' +

    '<div class="card card--pad" style="margin-top:16px;">' +
    '<h3>使用建议</h3>' +
    '<p class="muted" style="font-size:13px;">· 雨声 + 棕噪音：图书馆级屏蔽人声<br>' +
    '· 海浪 + 键盘：唤醒早晨的学习状态<br>' +
    '· 炉火 + 夜虫：深夜复盘与写日记<br>' +
    '· 混合不超过 3 种，音量 60% 以下最舒适</p></div>';

  /* 交互 */
  container.querySelectorAll('[data-noise]').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.dataset.vol !== undefined) return;
      toggle(card.dataset.noise, card);
    });
  });
  container.querySelectorAll('[data-vol]').forEach(r => {
    r.addEventListener('input', () => {
      const n = nodes.find(x => x.id === r.dataset.vol);
      if (n && ac) n.gain.gain.setTargetAtTime((r.value / 100) * masterVal() * 0.5, ac.currentTime, 0.05);
    });
    r.addEventListener('click', e => e.stopPropagation());
  });
  const master = container.querySelector('#nzMaster');
  master.addEventListener('input', () => {
    localStorage.setItem('sl_nz_master', master.value);
    applyMaster();
  });
  container.querySelector('#nzStopAll').addEventListener('click', () => {
    stopAll();
    render(container);
  });
}

function masterVal() { return (Number(localStorage.getItem('sl_nz_master')) || 60) / 100; }

function ensureCtx() {
  if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
  // 需在用户手势调用栈内 resume（本函数只由点击触发，符合浏览器自动播放策略）
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

function toggle(id, card) {
  const i = nodes.findIndex(n => n.id === id);
  if (i >= 0) {
    // 停止
    fadeOutAndStop(nodes[i]);
    nodes.splice(i, 1);
    card.classList.remove('is-on');
    const hint = card.querySelector('.nz-card__hint');
    hint.textContent = '点击播放';
    card.querySelector('[data-vol]').classList.add('hidden');
    card.querySelector('[data-vol]').disabled = true;
  } else {
    const ctx = ensureCtx();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    let stops;
    try {
      stops = RECIPES[id].make(ctx, gain);
    } catch (e) {
      // 合成器创建失败（如 AudioContext 被浏览器回收）：断开 gain 防 GUI 显示播放中却无声
      try { gain.disconnect(); } catch (e2) {}
      SL.toast('音频引擎启动失败，请重试', 'error');
      return;
    }
    gain.connect(ctx.destination);
    gain.gain.setTargetAtTime(0.7 * masterVal() * 0.5, ctx.currentTime, 0.3);
    nodes.push({ id, gain, stops });
    card.classList.add('is-on');
    card.querySelector('.nz-card__hint').textContent = '播放中';
    const vol = card.querySelector('[data-vol]');
    vol.classList.remove('hidden'); vol.disabled = false; vol.value = 70;
  }
  updateMasterHint();
}

function fadeOutAndStop(n) {
  if (!ac) return;
  try {
    // AudioContext 可能已被浏览器回收/close（state !== running 时 currentTime 不再推进，
    // setTargetAtTime 的衰减不会生效，直接硬停）
    if (ac.state === 'running') {
      n.gain.gain.setTargetAtTime(0, ac.currentTime, 0.15);
      setTimeout(() => { try { n.stops.forEach(s => s()); } catch (e) {} }, 600);
    } else {
      try { n.stops.forEach(s => s()); } catch (e) {}
    }
  } catch (e) {
    try { n.stops.forEach(s => s()); } catch (e2) {}
  }
}

function stopAll() {
  nodes.forEach(fadeOutAndStop);
  nodes = [];
}

function applyMaster() {
  if (!ac) return;
  nodes.forEach(n => {
    const card = document.querySelector('[data-vol="' + n.id + '"]');
    const v = card ? Number(card.value) / 100 : 0.7;
    n.gain.gain.setTargetAtTime(v * masterVal() * 0.5, ac.currentTime, 0.05);
  });
}

function updateMasterHint() {
  const el = document.querySelector('.nz-master .muted');
  if (el) el.textContent = nodes.length ? nodes.map(n => RECIPES[n.id].label).join(' + ') : '当前安静';
}

function destroy() { stopAll(); }

/* ===== 合成器 ===== */
function noiseBuffer(ctx, brown) {
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  if (brown) {
    let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; d[i] = (last + 0.02 * w) / 1.02; last = d[i]; d[i] *= 3.5; }
  } else {
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  return buf;
}

function makeRain(ctx, out) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, false); src.loop = true;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1200;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7500;
  src.connect(hp).connect(lp).connect(out);
  src.start();
  return [() => src.stop()];
}

function makeBrown(ctx, out) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, true); src.loop = true;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
  src.connect(lp).connect(out);
  src.start();
  return [() => src.stop()];
}

function makeOcean(ctx, out) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, false); src.loop = true;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.13;
  const lfoGain = ctx.createGain(); lfoGain.gain.value = 260;
  lfo.connect(lfoGain).connect(lp.frequency); lfo.start();
  src.connect(lp).connect(out);
  src.start();
  return [() => { src.stop(); lfo.stop(); }];
}

function makeForest(ctx, out) {
  // 棕噪音底 + 偶发鸟鸣（正弦扫频）
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, true); src.loop = true;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650;
  const g = ctx.createGain(); g.gain.value = 0.35;
  src.connect(lp).connect(g).connect(out);
  src.start();
  let alive = true;
  (function bird() {
    if (!alive) return;
    setTimeout(() => {
      if (!alive) return;
      try {
        const o = ctx.createOscillator();
        const og = ctx.createGain();
        o.type = 'sine';
        const f = 2400 + Math.random() * 1600;
        o.frequency.setValueAtTime(f, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(f * (0.8 + Math.random() * 0.5), ctx.currentTime + 0.18);
        og.gain.setValueAtTime(0, ctx.currentTime);
        og.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.04);
        og.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
        o.connect(og).connect(out);
        o.start(); o.stop(ctx.currentTime + 0.4);
      } catch (e) {}
      bird();
    }, 2500 + Math.random() * 6000);
  })();
  return [() => { alive = false; src.stop(); }];
}

function makeKeys(ctx, out) {
  // 偶发键盘敲击：短噪声脉冲
  let alive = true;
  const g = ctx.createGain(); g.gain.value = 0.3;
  g.connect(out);
  (function type() {
    if (!alive) return;
    setTimeout(() => {
      if (!alive) return;
      try {
        const src = ctx.createBufferSource();
        const len = Math.floor(ctx.sampleRate * 0.05);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
        src.buffer = buf;
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3000 + Math.random() * 2000;
        src.connect(bp).connect(g);
        src.start();
      } catch (e) {}
      type();
    }, 120 + Math.random() * 420);
  })();
  return [() => { alive = false; }];
}

function makeFire(ctx, out) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, false); src.loop = true;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 800;
  const crackleGain = ctx.createGain(); crackleGain.gain.value = 0.5;
  src.connect(lp).connect(crackleGain).connect(out);
  src.start();
  let alive = true;
  (function crackle() {
    if (!alive) return;
    setTimeout(() => {
      if (!alive) return;
      try {
        crackleGain.gain.setValueAtTime(0.3 + Math.random() * 0.5, ctx.currentTime);
        crackleGain.gain.setTargetAtTime(0.5, ctx.currentTime + 0.05, 0.1);
      } catch (e) {}
      crackle();
    }, 300 + Math.random() * 1200);
  })();
  return [() => { alive = false; src.stop(); }];
}

function makeCrickets(ctx, out) {
  let alive = true;
  (function chirp() {
    if (!alive) return;
    setTimeout(() => {
      if (!alive) return;
      try {
        const o = ctx.createOscillator();
        const og = ctx.createGain();
        o.type = 'triangle'; o.frequency.value = 4200 + Math.random() * 300;
        og.gain.setValueAtTime(0, ctx.currentTime);
        og.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 0.02);
        og.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);
        o.connect(og).connect(out);
        o.start(); o.stop(ctx.currentTime + 0.1);
        // 虫鸣常连三声
        if (Math.random() > 0.4) {
          const o2 = ctx.createOscillator(); const og2 = ctx.createGain();
          o2.type = 'triangle'; o2.frequency.value = o.frequency.value;
          og2.gain.setValueAtTime(0, ctx.currentTime + 0.12);
          og2.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 0.14);
          og2.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
          o2.connect(og2).connect(out);
          o2.start(ctx.currentTime + 0.12); o2.stop(ctx.currentTime + 0.22);
        }
      } catch (e) {}
      chirp();
    }, 900 + Math.random() * 2500);
  })();
  return [() => { alive = false; }];
}

export { render, destroy, meta };
