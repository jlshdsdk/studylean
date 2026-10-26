# 研轻 StudyLean — 部署与云同步指南

> 研轻是零依赖纯静态站点：无构建、无 npm、无服务端。部署 = 把静态文件放到任意静态托管上即可。

## 一、GitHub Pages 部署（推荐）

### 1. Fork 仓库

1. 登录 GitHub，打开研轻仓库页面；
2. 点击右上角 **Fork**，将仓库复制到你的账号下。

### 2. 开启 Pages

1. 进入你 fork 后的仓库 → **Settings** → 左侧栏 **Pages**；
2. **Source** 选择 `Deploy from a branch`；
3. **Branch** 选择 `main`，目录选择 `/ (root)`，点击 **Save**；
4. 等待 1-2 分钟，页面顶部会显示发布地址：`https://<你的用户名>.github.io/studylean/`。

### 3. 关于 .nojekyll

仓库根目录已内置 `.nojekyll` 空文件。它的作用是告诉 GitHub Pages **跳过 Jekyll 构建流程**：

- 没有 Jekyll 处理，所有文件原样发布，部署更快；
- 避免下划线开头文件/目录（如 `_xxx`）被 Jekyll 默认忽略的问题；
- 若你从零自建仓库，请在根目录创建同名空文件：`touch .nojekyll` 并提交。

### 4. 验证

访问发布的地址，能看到入口页（登录/注册/游客模式）即部署成功。注册或点游客进入应用，随手记一条体重确认数据读写正常。

## 二、本地运行

无需任何构建：

```bash
git clone https://github.com/jlshdsdk/studylean.git
```

直接双击打开 `index.html` 即可。如需本地静态服务器（可选）：

```bash
# 任选其一
python -m http.server 8080
npx serve .
```

浏览器访问 `http://localhost:8080`。

## 三、Supabase 云同步配置（可选）

> **不配置不影响任何功能。** 默认模式数据全存浏览器本地。仅当你需要「多设备同步 / 云端备份」时才配置。

### 1. 创建 Supabase 项目

1. 注册/登录 [supabase.com](https://supabase.com)（有免费额度，足够个人使用）；
2. 点击 **New project**，填写项目名与数据库密码，选择就近区域，创建。

### 2. 执行建表 SQL

进入项目 → 左侧 **SQL Editor** → 新建查询，粘贴执行（含 RLS 行级安全策略，**必须整段执行**，否则同步会报权限错误）：

```sql
create table sl_data (
  user_id uuid primary key references auth.users,
  value jsonb,
  updated_at timestamptz default now()
);

-- 行级安全：每个用户只能读写自己的数据行
alter table sl_data enable row level security;

create policy "own row select" on sl_data
  for select using (auth.uid() = user_id);

create policy "own row insert" on sl_data
  for insert with check (auth.uid() = user_id);

create policy "own row update" on sl_data
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own row delete" on sl_data
  for delete using (auth.uid() = user_id);
```

表结构说明：

| 字段 | 类型 | 说明 |
|---|---|---|
| user_id | uuid | 主键，关联 Supabase Auth 用户 |
| value | jsonb | 研轻全部数据的 JSON 快照 |
| updated_at | timestamptz | 最近更新时间 |

### 3. 获取 URL 与 anon key

进入 **Project Settings → API**，复制两样东西：

- **Project URL**：形如 `https://xxxxxxxx.supabase.co`
- **anon public key**：形如 `eyJhbGciOi...` 的长字符串

### 4. 在应用中填入配置

1. 打开研轻，进入 **设置 → 云同步（数据管理内的云配置入口）**；
2. 分别粘贴 Project URL 与 anon key，保存；
3. 配置保存在浏览器本地（`sl_cloud_config`），此后账号系统自动切换为「云模式」：可注册云账号、登录后数据自动同步到 `sl_data` 表。

### 5. 安全说明

- anon key 是设计上可公开的客户端密钥，真正的访问控制由 Supabase 的行级安全（RLS）与 Auth 体系负责；
- 建议在 Supabase 的 **Authentication** 设置中按需开启邮箱确认或限制注册邮箱域名；
- 如需进一步收紧，可在 SQL Editor 中为 `sl_data` 启用 RLS，仅允许用户读写自己的行。

## 四、常见部署问题排查

| 现象 | 可能原因与解法 |
|---|---|
| Pages 地址 404 | 部署未完成（等 2 分钟）或 Branch/目录选错；确认选的是 main + root |
| 页面白屏，控制台报 ES Module 加载失败 | 用了 `file://` 协议且浏览器限制了模块加载——改用本地静态服务器，或直接用在线地址 |
| 样式/数据文件 404 | 仓库不完整，确认 `.nojekyll` 存在且 `assets/` 目录已随仓库发布；重新触发 Pages 部署（Settings→Pages 或 push 一次空提交） |
| 更新代码后页面没变化 | 浏览器缓存：强制刷新（Ctrl/Cmd + Shift + R）；Pages 部署有 1-2 分钟延迟 |
| 登录后刷新又回到登录页 | 浏览器禁用了 localStorage（隐身模式部分配置/隐私插件）；换普通窗口或允许站点存储 |
| Supabase 登录报错 | 检查 URL / anon key 是否填对、SQL 是否已执行、项目是否因免费额度暂停（长期不活跃会被暂停，去控制台 restore） |
| 每次打开都要求重新登录 | 云模式会话由 Supabase 签发，检查是否配置正确；本地模式会话存 `sl_session`，若被隐私模式清除属正常 |

## 五、其他托管方式

研轻是纯静态站，任何静态托管都能用：Vercel、Netlify、Cloudflare Pages 等，把仓库根目录直接作为发布目录即可，均无需构建命令与输出目录配置。
