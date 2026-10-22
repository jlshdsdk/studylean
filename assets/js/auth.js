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

  function cloudConfig() {
    try { return window.SL_CLOUD_CONFIG || null; } catch (e) { return null; }
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
    if (!window.crypto || !crypto.subtle) {
      return Promise.reject(new Error('当前环境不支持 WebCrypto（需 HTTPS 或 localhost）'));
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

  function cloudSignup(name, password) {
    var cfg = cloudConfig();
    // Supabase Auth 要求 email；本地用户名映射为伪邮箱域名
    var email = name + '@studylean.local';
    return cloudFetch('/auth/v1/signup', {
      body: { email: email, password: password, data: { display_name: name } }
    }).then(function (json) {
      var uid = (json.user && json.user.id) || (json.id) || SL.id();
      return uid;
    });
  }

  function cloudLogin(name, password) {
    var email = name + '@studylean.local';
    return cloudFetch('/auth/v1/token?grant_type=password', {
      body: { email: email, password: password }
    }).then(function (json) {
      var meta = (json.user && json.user.user_metadata) || {};
      var uid = (json.user && json.user.id) || SL.id();
      return { id: uid, name: meta.display_name || name };
    });
  }

  // ===== 会话 =====
  function setSession(user) {
    writeJSON(SES_KEY, user);
    if (SL.state) SL.state.user = user;
    SL.emit('user', user);
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
            reject(new Error('云端注册失败：' + (e && e.message ? e.message : '未知错误')));
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
          if (!acc) return reject(new Error('用户不存在，请先注册'));
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
              reject(new Error('云端登录失败：' + (e && e.message ? e.message : '未知错误')));
            }
          });
        } else {
          finishLocal();
        }
      });
      if (typeof cb === 'function') p.then(function (u) { cb(null, u); }, function (e) { cb(e); });
      return p;
    },

    /** 登出：清除会话。 */
    logout: function () {
      try { localStorage.removeItem(SES_KEY); } catch (e) {}
      if (SL.state) SL.state.user = null;
      SL.emit('user', null);
    },

    /** 游客模式：生成 guest 会话直接可用。 */
    guest: function () {
      var user = makeUser(null, '游客', true);
      setSession(user);
      return user;
    },

    /** 当前会话（无则 null）。 */
    session: function () {
      var s = readJSON(SES_KEY, null);
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
    }
  };

  window.SL.auth = auth;
})();
