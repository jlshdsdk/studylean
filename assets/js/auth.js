/**
 * StudyLean auth.js — 账号系统（本地 + Supabase 可选云模式）
 * Contractor: SA-02
 * Contract: ARCHITECTURE v2.0 (§2 SL.auth / §4.1 / §4.4)
 * 普通 script 引入（非 module），IIFE，防御性依赖 window.SL。
 * 账号键 sl_accounts，会话键 sl_session。
 * 用户对象统一：{ id, name, guest, createdAt }
 */
(function () {
  'use strict';
  if (!window.SL) return; // store.js 未就绪则不执行

  var ACC_KEY = 'sl_accounts';
  var SES_KEY = 'sl_session';

  // 默认云配置：主人自己的 Supabase 项目（与 kaoyan-vocab5 / ds-code-notes 共用，账号互通）。
  // anon key 属于公开 publishable key，可安全内置于前端；localStorage 'sl_cloud_config' 可覆盖。
  var DEFAULT_CLOUD = {
    url: 'https://qvemohfojzawpnleyjsb.supabase.co',
    anonKey: 'sb_publishable_VFalDAdNoIgd19oxlZ8wlw_AM-rv7Uq'
  };

  function cloudConfig() {
    try {
      if (window.SL_CLOUD_CONFIG) return window.SL_CLOUD_CONFIG;
      var saved = readJSON('sl_cloud_config', null);
      if (saved && saved.url && saved.anonKey) return saved;
      return DEFAULT_CLOUD;
    } catch (e) { return DEFAULT_CLOUD; }
  }

  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }

  function writeJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { return false; }
  }

  // ===== 密码哈希：SHA-256 + 随机盐（WebCrypto subtle.digest）=====
  // file:// 下部分浏览器禁用 crypto.subtle（insecure context），显式探测并给出可操作的降级提示
  function webCryptoAvailable() {
    return !!(window.crypto && crypto.subtle && typeof crypto.subtle.digest === 'function');
  }

  function randomSalt(len) {
    var n = len || 16;
    var bytes = new Uint8Array(n);
    if (window.crypto && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      for (var i = 0; i < n; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.prototype.map.call(bytes, function (b) {
      return ('0' + b.toString(16)).slice(-2);
    }).join('');
  }

  function sha256Hex(str) {
    if (!webCryptoAvailable()) {
      return Promise.reject(new Error('当前环境不支持 WebCrypto 加密（常见于 file:// 直接打开）。请通过 http:// 或 https:// 访问本页，例如本地运行 python -m http.server 后打开 localhost 地址。'));
    }
    var data = new TextEncoder().encode(str);
    return crypto.subtle.digest('SHA-256', data).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) {
        return ('0' + b.toString(16)).slice(-2);
      }).join('');
    });
  }

  function hashPassword(password, salt) {
    return sha256Hex(salt + '::' + password);
  }

  // ===== 校验 =====
  function validateName(name) {
    if (!name || typeof name !== 'string') return '请输入用户名';
    var n = name.trim();
    // 邮箱格式：云端账号直接用邮箱（与其他研轻系站点账号互通）
    if (n.indexOf('@') > 0) {
      if (n.length > 40) return '邮箱过长（≤40 字符）';
      if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(n)) return '邮箱格式不正确';
      return null;
    }
    if (n.length < 2 || n.length > 20) return '用户名需 2-20 个字符';
    if (!/^[A-Za-z0-9_\u4e00-\u9fa5]+$/.test(n)) return '用户名仅支持中英文、数字与下划线';
    return null;
  }

  function validatePassword(pw) {
    if (!pw || typeof pw !== 'string') return '请输入密码';
    if (pw.length < 8) return '密码至少 8 位';
    if (!/[A-Za-z]/.test(pw)) return '密码需包含字母';
    if (!/[0-9]/.test(pw)) return '密码需包含数字';
    return null;
  }

  // ===== Supabase REST 辅助（§4.4）=====
  function cloudFetch(path, opts) {
    var cfg = cloudConfig();
    if (!cfg || !cfg.url || !cfg.anonKey) return Promise.reject(new Error('NO_CLOUD'));
    var headers = {
      'Content-Type': 'application/json',
      'apikey': cfg.anonKey,
      'Authorization': 'Bearer ' + cfg.anonKey
    };
    if (opts && opts.headers) Object.assign(headers, opts.headers);
    return fetch(cfg.url + path, {
      method: (opts && opts.method) || 'POST',
      headers: headers,
      body: opts && opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (json) {
        if (!res.ok) {
          var msg = (json && (json.msg || json.message || json.error_description || json.error)) || ('请求失败 (' + res.status + ')');
          var err = new Error(msg);
          err.status = res.status;
          throw err;
        }
        return json;
      });
    });
  }

  // 云端账号邮箱：邮箱型用户名原样使用（与既有账号互通），其余映射为伪邮箱
  function cloudEmail(name) {
    var n = String(name || '').trim();
    return n.indexOf('@') > 0 ? n : n + '@studylean.local';
  }

  function cloudSignup(name, password) {
    var cfg = cloudConfig();
    var email = cloudEmail(name);
    return cloudFetch('/auth/v1/signup', {
      body: { email: email, password: password, data: { display_name: name } }
    }).then(function (json) {
      var uid = (json.user && json.user.id) || (json.id) || SL.id();
      return uid;
    });
  }

  function cloudLogin(name, password) {
    var email = cloudEmail(name);
    return cloudFetch('/auth/v1/token?grant_type=password', {
      body: { email: email, password: password }
    }).then(function (json) {
      var meta = (json.user && json.user.user_metadata) || {};
      var uid = (json.user && json.user.id) || SL.id();
      // 持久化云端令牌：供 sl_data 表读写与自动续期
      if (json.access_token) {
        writeJSON(TOKEN_KEY, {
          access: json.access_token,
          refresh: json.refresh_token || '',
          expiresAt: Date.now() + ((json.expires_in || 3600) * 1000)
        });
      }
      return { id: uid, name: meta.display_name || name };
    });
  }

  // ===== 云端令牌与数据同步（sl_data 表）=====
  var TOKEN_KEY = 'sl_cloud_token';
  var SYNC_AT_KEY = 'sl_synced_at';

  function readToken() {
    var t = readJSON(TOKEN_KEY, null);
    return t && t.access ? t : null;
  }

  function clearToken() {
    try { localStorage.removeItem(TOKEN_KEY); } catch (e) { /* noop */ }
  }

  /** 用 access_token 调 /rest/v1（sl_data 表）。401 时尝试用 refresh_token 续期一次并重试。 */
  function restFetch(path, opts, retried) {
    var cfg = cloudConfig();
    var tok = readToken();
    if (!cfg || !tok) return Promise.reject(new Error('未登录云端'));
    var headers = {
      'Content-Type': 'application/json',
      'apikey': cfg.anonKey,
      'Authorization': 'Bearer ' + tok.access
    };
    if (opts && opts.headers) Object.assign(headers, opts.headers);
    return fetch(cfg.url + path, {
      method: (opts && opts.method) || 'GET',
      headers: headers,
      body: opts && opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (res) {
      if (res.status === 401 && !retried && tok.refresh) {
        return refreshAccessToken().then(function () { return restFetch(path, opts, true); });
      }
      return res.json().catch(function () { return {}; }).then(function (json) {
        if (!res.ok) {
          var msg = (json && (json.message || json.msg || json.error)) || ('同步请求失败 (' + res.status + ')');
          if (res.status === 404 && /rest\/v1/.test(path)) msg = 'sl_data 表不存在：请在 Supabase SQL Editor 执行建表 SQL（见 docs/DEPLOY.md）';
          if (res.status === 403 || res.status === 401) msg = '云端权限不足：请确认已执行 RLS 策略 SQL（见 docs/DEPLOY.md）';
          var err = new Error(msg);
          err.status = res.status;
          throw err;
        }
        return { json: json, res: res };
      });
    });
  }

  function refreshAccessToken() {
    var cfg = cloudConfig();
    var tok = readToken();
    if (!cfg || !tok || !tok.refresh) return Promise.reject(new Error('登录已过期，请重新登录'));
    return fetch(cfg.url + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': cfg.anonKey },
      body: JSON.stringify({ refresh_token: tok.refresh })
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (json) {
        if (!res.ok) throw new Error('云端登录已过期，请重新登录');
        writeJSON(TOKEN_KEY, {
          access: json.access_token,
          refresh: json.refresh_token || tok.refresh,
          expiresAt: Date.now() + ((json.expires_in || 3600) * 1000)
        });
        return true;
      });
    });
  }

  var sync = {
    /** 登录后/启动时拉取云端数据。云端较新则覆盖本地并刷新页面状态。 */
    pull: function () {
      var user = SL.state && SL.state.user;
      if (!user || !user.id || !readToken()) return Promise.resolve('skip');
      return restFetch('/rest/v1/sl_data?select=value,updated_at&user_id=eq.' + encodeURIComponent(user.id))
        .then(function (r) {
          var row = (r.json && r.json[0]) || null;
          if (!row || !row.value) return 'empty';
          var serverAt = row.updated_at ? new Date(row.updated_at).getTime() : 0;
          var localAt = Number(localStorage.getItem(SYNC_AT_KEY) || 0);
          if (serverAt > localAt) {
            if (SL.mergeDefaults) {
              SL.state.data = SL.mergeDefaults(row.value);
            } else {
              SL.state.data = row.value;
            }
            SL.saveNow();
            localStorage.setItem(SYNC_AT_KEY, String(serverAt));
            SL.emit('data:settings'); // 触发各视图按需刷新
            SL.toast('已从云端同步最新数据', 'success');
            return 'pulled';
          }
          return 'local-newer';
        });
    },

    /** 推送本地数据到云端（upsert）。5 秒防抖由 SL.syncEngine 调度。 */
    push: function () {
      var user = SL.state && SL.state.user;
      if (!user || !user.id || !readToken()) return Promise.resolve(false);
      var nowIso = new Date().toISOString();
      return restFetch('/rest/v1/sl_data?user_id=eq.' + encodeURIComponent(user.id), {
        method: 'PATCH',
        headers: { Prefer: 'resolution=merge-duplicates' },
        body: { value: SL.state.data, updated_at: nowIso }
      }).then(function (r) {
        // PATCH 更新 0 行说明行不存在 → 插入
        if (!r.json || r.json.length === 0) {
          return restFetch('/rest/v1/sl_data', {
            method: 'POST',
            headers: { Prefer: 'resolution=merge-duplicates' },
            body: { user_id: user.id, value: SL.state.data, updated_at: nowIso }
          });
        }
        return r;
      }).then(function () {
        localStorage.setItem(SYNC_AT_KEY, String(Date.now()));
        return true;
      });
    },

    /** 登录/数据变化后的自动同步入口（防抖 5s；失败静默，手动同步才报错）。 */
    schedulePush: function () {
      clearTimeout(sync._t);
      sync._t = setTimeout(function () {
        sync.push().catch(function (e) {
          console.warn('[sync] push failed:', e.message);
        });
      }, 5000);
    },

    lastSyncedAt: function () {
      var v = Number(localStorage.getItem(SYNC_AT_KEY) || 0);
      return v ? new Date(v) : null;
    },

    isCloudUser: function () {
      var u = SL.state && SL.state.user;
      return !!(u && !u.guest && u.id && readToken());
    },

    logout: function () { clearToken(); }
  };

  // ===== 会话 =====
  function setSession(user) {
    writeJSON(SES_KEY, user);
    if (SL.state) SL.state.user = user;
    SL.emit('user', user);
  }

  // 会话形状校验：localStorage 被篡改为字符串/数字/数组时视为无会话
  function validUser(u) {
    return !!(u && typeof u === 'object' && !Array.isArray(u) && typeof u.name === 'string');
  }

  function makeUser(id, name, guest) {
    return { id: id || SL.id(), name: name, guest: !!guest, createdAt: Date.now() };
  }

  // ===== 对外 API =====
  var auth = {
    /** 注册。cb(err, user)。返回 Promise。 */
    register: function (name, password, confirmPw, cb) {
      var p = new Promise(function (resolve, reject) {
        var err = validateName(name) || validatePassword(password);
        if (err) return reject(new Error(err));
        if (confirmPw !== undefined && password !== confirmPw) return reject(new Error('两次输入的密码不一致'));
        name = name.trim();

        var cloud = cloudConfig();
        var doLocal = function () {
          var accounts = readJSON(ACC_KEY, {});
          if (accounts[name]) return reject(new Error('用户名已被注册'));
          var salt = randomSalt(16);
          hashPassword(password, salt).then(function (hash) {
            accounts[name] = { salt: salt, hash: hash, createdAt: Date.now() };
            if (!writeJSON(ACC_KEY, accounts)) return reject(new Error('存储失败，请检查浏览器设置'));
            var user = makeUser(null, name, false);
            setSession(user);
            resolve(user);
          }).catch(reject);
        };

        if (cloud) {
          cloudSignup(name, password).then(function (uid) {
            // 云端成功后本地也留一份账号记录（离线可登录）
            var accounts = readJSON(ACC_KEY, {});
            var salt = randomSalt(16);
            hashPassword(password, salt).then(function (hash) {
              if (!accounts[name]) {
                accounts[name] = { salt: salt, hash: hash, createdAt: Date.now(), cloudId: uid };
                writeJSON(ACC_KEY, accounts);
              }
              var user = makeUser(uid, name, false);
              setSession(user);
              resolve(user);
            }).catch(function () {
              var user = makeUser(uid, name, false);
              setSession(user);
              resolve(user);
            });
          }).catch(function (e) {
            var hint = /已注册|already|exists/i.test(e && e.message || '') ? '（该邮箱已注册，请直接用登录页登录）' : '';
            reject(new Error('云端注册失败：' + (e && e.message ? e.message : '未知错误') + hint));
          });
        } else {
          doLocal();
        }
      });
      if (typeof cb === 'function') p.then(function (u) { cb(null, u); }, function (e) { cb(e); });
      return p;
    },

    /** 登录。cb(err, user)。返回 Promise。 */
    login: function (name, password, cb) {
      var p = new Promise(function (resolve, reject) {
        if (!name || !password) return reject(new Error('请输入用户名和密码'));
        name = String(name).trim();

        var cloud = cloudConfig();
        var finishLocal = function () {
          var accounts = readJSON(ACC_KEY, {});
          var acc = accounts[name];
          if (!acc) return reject(new Error(cloudConfig()
            ? '云端与本机均无此账号，请先在本页注册'
            : '此账号不在本设备上（本地账号只保存在注册时的浏览器）。跨设备使用：请先在原设备「设置→云同步」配置 Supabase，或直接在本设备注册新账号'));
          hashPassword(password, acc.salt).then(function (hash) {
            if (hash !== acc.hash) return reject(new Error('密码错误'));
            var user = makeUser(acc.cloudId || null, name, false);
            // 保持首次注册的 createdAt
            user.createdAt = acc.createdAt || user.createdAt;
            setSession(user);
            resolve(user);
          }).catch(reject);
        };

        if (cloud) {
          cloudLogin(name, password).then(function (r) {
            var user = makeUser(r.id, r.name, false);
            // 同步本地账号记录的 createdAt
            var accounts = readJSON(ACC_KEY, {});
            if (accounts[name]) user.createdAt = accounts[name].createdAt || user.createdAt;
            setSession(user);
            resolve(user);
          }).catch(function (e) {
            // 云失败时回退本地校验（离线可用）
            var accounts = readJSON(ACC_KEY, {});
            if (accounts[name]) {
              finishLocal();
            } else {
              var em = e && e.message || '未知错误';
              if (/invalid login credentials|invalid_credentials/i.test(em)) {
                em = '邮箱或密码不正确。提示：跨设备/老站账号请输入完整邮箱（如 3667656609@qq.com），密码与考研词汇站相同；忘记密码请去词汇站登录页重置（三站通用）';
              }
              reject(new Error('云端登录失败：' + em));
            }
          });
        } else {
          finishLocal();
        }
      });
      if (typeof cb === 'function') p.then(function (u) { cb(null, u); }, function (e) { cb(e); });
      return p;
    },

    /** 登出：清除会话与云端令牌。 */
    logout: function () {
      try { localStorage.removeItem(SES_KEY); } catch (e) {}
      clearToken();
      if (SL.state) SL.state.user = null;
      SL.emit('user', null);
    },

    /** 游客模式：生成 guest 会话直接可用。 */
    guest: function () {
      var user = makeUser(null, '游客', true);
      setSession(user);
      return user;
    },

    /** 当前会话（无则 null；被篡改的会话自动清除）。 */
    session: function () {
      var s = readJSON(SES_KEY, null);
      if (!validUser(s)) {
        try { localStorage.removeItem(SES_KEY); } catch (e) { /* noop */ }
        s = null;
      }
      if (SL.state) SL.state.user = s;
      return s;
    },

    /** 改名（仅本地会话/账号；云端 display_name 由设置页另行同步）。 */
    rename: function (newName, cb) {
      var p = new Promise(function (resolve, reject) {
        var err = validateName(newName);
        if (err) return reject(new Error(err));
        newName = newName.trim();
        var sess = readJSON(SES_KEY, null);
        if (!sess) return reject(new Error('未登录'));
        var oldName = sess.name;
        if (!sess.guest && oldName !== newName) {
          var accounts = readJSON(ACC_KEY, {});
          if (accounts[oldName] && accounts[newName]) return reject(new Error('新用户名已被占用'));
          if (accounts[oldName]) {
            accounts[newName] = accounts[oldName];
            delete accounts[oldName];
            if (!writeJSON(ACC_KEY, accounts)) return reject(new Error('存储失败'));
          }
        }
        sess.name = newName;
        writeJSON(SES_KEY, sess);
        if (SL.state) SL.state.user = sess;
        SL.emit('user', sess);
        resolve(sess);
      });
      if (typeof cb === 'function') p.then(function (u) { cb(null, u); }, function (e) { cb(e); });
      return p;
    },

    /** 是否存在至少一个本地账号（入口页提示用）。 */
    hasAccounts: function () {
      var a = readJSON(ACC_KEY, {});
      return Object.keys(a).length > 0;
    },

    /** 校验工具（index.html 复用）。 */
    validate: { name: validateName, password: validatePassword },

    /** 设置页改名后同步 sl_session 的辅助（保持会话一致）。 */
    persistName: function (name) {
      try {
        var sess = readJSON(SES_KEY, null);
        if (sess) { sess.name = name; writeJSON(SES_KEY, sess); }
      } catch (e) { /* noop */ }
    },

    /** 云数据同步引擎：pull / push / schedulePush / 状态查询。 */
    sync: sync
  };

  window.SL.auth = auth;
})();
