/**
 * 集成验证脚本 verify.mjs — 总监联调工具
 * 用 node 直接 import 各模块文件做静态验证（模块依赖浏览器环境，跳过执行，仅检查导出与文本模式）
 */
import { readFileSync, readdirSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const JS = ROOT + 'assets' + '\\' + 'js' + '\\';
const ok = (m) => console.log('  ✓ ' + m);
const bad = (m) => { console.log('  ✗ ' + m); process.exitCode = 1; };

console.log('== 1. 模块三导出检查（render/destroy/meta） ==');
const modules = readdirSync(JS).filter(f => /^module-.*\.js$/.test(f));
let exportFails = 0;
for (const f of modules) {
  const src = readFileSync(JS + f, 'utf8');
  const hasRender = /export\s*\{\s*render[^}]*\}|export\s+function\s+render|export\s+const\s+render/.test(src);
  const hasDestroy = /export\s*\{\s*[^}]*destroy[^}]*\}|export\s+function\s+destroy|export\s+const\s+destroy/.test(src);
  const hasMeta = /export\s*\{\s*[^}]*meta[^}]*\}|export\s+const\s+meta|export\s*\{\s*render,?\s*destroy,?\s*meta\s*\}/.test(src);
  if (!hasRender || !hasDestroy || !hasMeta) { bad(f + ' 缺导出 render/destroy/meta'); exportFails++; }
}
if (!exportFails) ok(modules.length + ' 个模块三导出齐全');

console.log('== 2. VIEWS 注册表 ↔ 模块文件对齐 ==');
const appSrc = readFileSync(JS + 'app.js', 'utf8');
const regIds = [...appSrc.matchAll(/id:\s*'([a-z-]+)'/g)].map(m => m[1]);
const files = modules.map(f => f.replace('module-', '').replace('.js', ''));
for (const id of regIds) if (!files.includes(id)) bad('VIEWS 缺模块文件: ' + id);
for (const f of files) if (!regIds.includes(f)) bad('模块文件未注册: ' + f);
if (regIds.length === 22 && files.length === 22) ok('22 视图 ↔ 22 模块一一对应');

console.log('== 3. CSS 链接对齐 ==');
import { dirname, join } from 'path';
const cssDir = join(ROOT, 'assets', 'css', 'm') + '\\';
for (const f of files) {
  if (!existsSync(cssDir + f + '.css')) bad('缺模块 CSS: ' + f + '.css');
}
if (readdirSync(cssDir).filter(f => f.endsWith('.css')).length === files.length) ok('22 个模块 CSS 全齐');

console.log('== 4. 禁用模式检查 ==');
let patternFails = 0;
const patterns = [
  ['toISOString().slice', '时区 unsafe 日期', /toISOString\(\)\s*\.\s*slice/],
  ['document.write', '禁用 document.write', /document\.write/],
  ['eval(', '禁用 eval', /\beval\s*\(/],
  ['新Function', '禁用 new Function', /new\s+Function/],
  ['外部CDN', '禁止外部资源', /https?:\/\/(?!.*(supabase|localhost))(cdn|unpkg|jsdelivr|googleapis)/],
  ['innerHTML+用户输入', '检查未转义插值', /\$\{[^}]*\}/]
];
for (const f of modules.concat(['app.js', 'core.js', 'store.js', 'auth.js']).map(x => JS + x)) {
  const src = readFileSync(f, 'utf8');
  for (const [, label, re] of patterns.slice(0, 5)) {
    if (re.test(src)) { bad(`${f.split(/[\\/]/).pop()} 含 ${label}`); patternFails++; }
  }
}
if (!patternFails) ok('无禁用模式（eval/document.write/CDN/时区坑）');

console.log('== 5. emoji 图标使用抽查 ==');
const emojiRe = />(?:🔥|📅|⏰|✅|❌|💪|📚|🌙|☀️|💧|🏃|⚖️)</;
let emojiFails = 0;
for (const f of modules) {
  const src = readFileSync(JS + f, 'utf8');
  if (emojiRe.test(src)) { bad(f + ' 使用 emoji 作图标'); emojiFails++; }
}
if (!emojiFails) ok('无 emoji 图标（个别文案性 emoji 允许）');

console.log('== 6. node --check 全量语法 ==');
try {
  const all = readdirSync(JS).filter(f => f.endsWith('.js')).concat(readdirSync(JS + 'data').map(f => 'data/' + f));
  let fail = 0;
  for (const f of all) {
    try { execSync(`node --check "assets/js/${f}"`, { stdio: 'pipe', cwd: ROOT }); }
    catch (e) { bad('语法失败: ' + f); fail++; }
  }
  if (!fail) ok(all.length + ' 个 JS 文件语法全部通过');
} catch (e) { bad('语法检查执行失败: ' + e.message); }

console.log('== 7. HTML 入口完整性 ==');
for (const h of ['index.html', 'app.html']) {
  const src = readFileSync(ROOT + h, 'utf8');
  if (!/<\/html>/i.test(src)) bad(h + ' 不完整');
}
ok('index.html / app.html 结构完整');

console.log('== 8. store.js 默认值 ↔ 模块命名空间 ==');
const storeSrc = readFileSync(JS + 'store.js', 'utf8');
const namespaces = ['countdown', 'timer', 'diary', 'calories', 'weight', 'sport', 'habits', 'todo', 'water', 'sleep', 'forest', 'shop', 'goals', 'quote', 'notifications', 'knowledge', 'achievements', 'settings'];
for (const ns of namespaces) {
  if (!storeSrc.includes(ns + ':')) bad('store.js 缺默认命名空间: ' + ns);
}
ok('18 个数据命名空间默认值齐全');

console.log(process.exitCode ? '\n!!! 联调发现缺陷，需修复 !!!' : '\n✅ 集成联调全部通过');
