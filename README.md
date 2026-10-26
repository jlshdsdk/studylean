# 研轻 StudyLean

> **上岸，也上秤。**

**研轻**（谐音「年轻」）：研 = 考研冲刺，轻 = 轻体减脂。一款为「考研上岸 × 科学减脂」双场景打造的全功能自律网页应用——考研人的每一分钟都被看见，减脂期的每一卡路里都被记录。

一个网页，替代「番茄ToDo + 薄荷健康 + Forest + 日记本 + 倒计时日历」的全套组合：

- **双线融合**：学习专注与饮食体重同屏管理，互不打架，互相成就
- **24 个功能模块**：从番茄钟到体重曲线，从成就勋章到自律商城，一站式覆盖
- **零依赖纯静态**：原生 ES Module，无构建、无 npm、无 CDN，克隆即用
- **数据本地私有**：所有数据默认只存在你自己的浏览器里，不上传、不追踪、不卖广告
- **全免费**：没有会员，没有氪金商城，没有开屏广告

在线访问：**https://jlshdsdk.github.io/studylean/**

## 功能总览（24 个模块）

| # | 模块 | 核心能力 |
|---|---|---|
| 1 | 仪表盘 | 今日总览：倒计时卡片+卡路里环+打卡进度+快速操作+每日一句 |
| 2 | 考试倒计时 | 多考试管理（考研/四六级/自定义），天时分秒实时跳动，总进度条，里程碑 |
| 3 | 番茄专注钟 | 正/倒计时，自定义时长，全屏专注模式，番茄统计，白噪音联动 |
| 4 | 日记簿 | Markdown-lite 编辑，心情+天气标签，日历回看，全文搜索，字数统计 |
| 5 | 卡路里记录 | 三餐+加餐，400+ 食物库搜索，自定义食物，摄入环+剩余额度 |
| 6 | 体重管理 | 体重曲线，BMI 计算器+体脂估算，目标进度，围度记录 |
| 7 | 运动消耗 | 运动库（跑步/跳绳/力量等），按时长算消耗，与摄入净值联动 |
| 8 | 习惯打卡 | 自定义习惯，streak 连续天数，21天养成进度，补卡（消耗自律币） |
| 9 | 待办清单 | 考研任务/日常，优先级四象限配色，子任务，完成动效 |
| 10 | 喝水记录 | 每日目标，快捷杯量按钮，饮水量7日柱状图 |
| 11 | 睡眠记录 | 就寝/起床时间，时长统计，质量评分，7日趋势 |
| 12 | 数据统计 | 学习时长热力图（GitHub风）、周/月报表、卡路里趋势、体重趋势、综合图表 |
| 13 | 成就系统 | 30+ 成就勋章墙：连续打卡/累计专注/体重里程碑/日记达人等 |
| 14 | 专注森林 | 每个番茄=一棵树，树随专注时长成长，稀有树种解锁，森林全景 |
| 15 | 自律商城 | 自律币经济：番茄/打卡/成就赚币，兑换自定义奖励心愿单 |
| 16 | 提醒中心 | 喝水/站立/久坐提醒，浏览器通知+页面内浮条，自定义间隔 |
| 17 | 白噪音 | Web Audio 合成：雨声/海浪/森林/键盘/翻书/棕噪音，音量混合，与专注联动 |
| 18 | 每日一句 | 150+ 语录库（考研上岸+减脂+自律），可收藏，可换一张 |
| 19 | 日历总览 | 月历整合视图：打卡/日记/体重/专注记录四色标记 |
| 20 | 目标管理 | 长期目标（考研分数/目标体重）拆解为阶段里程碑，进度追踪 |
| 21 | 数据管理 | 导出/导入 JSON 备份，数据清空，云同步状态（Supabase 可选） |
| 22 | 主题系统 | 深色/浅色/自动，6 种主题色，护眼模式，设置持久化 |
| 23 | 账号系统 | 注册/登录/游客模式，本地账号（SHA-256 加盐）+ Supabase 云账号双模式 |
| 24 | 备考知识库 | 考研常识 + 减脂科普知识卡片，每日轮换推送 |

详细使用方法见 [docs/USER_GUIDE.md](docs/USER_GUIDE.md)。

## 快速开始

### 方式一：在线访问（推荐）

打开 **https://jlshdsdk.github.io/studylean/**，注册一个本地账号（数据仅存你的浏览器），或点击「游客模式」立即体验。

### 方式二：本地打开

```bash
git clone https://github.com/jlshdsdk/studylean.git
```

然后直接双击打开仓库根目录的 `index.html` 即可（无需安装任何东西、无需启动服务器）。

> 建议 Chrome / Edge / Safari / Firefox 现代版本访问。

### 游客模式

不想注册？在入口页点击「游客模式」可直接进入应用。游客数据同样保存在本浏览器，随时可在应用内「账号」页一键升级为正式注册账号，数据无缝保留。

## 技术栈

| 项 | 说明 |
|---|---|
| 架构 | 零依赖纯静态多页面应用（MPA） |
| 语言 | 原生 JavaScript（ES Module），无 TypeScript、无框架 |
| 构建 | 无构建步骤、无 npm、无 CDN、无外部字体/图标 |
| 持久化 | localStorage（键前缀 `sl_`），数据 100% 本地 |
| 云同步（可选） | Supabase（Auth + REST），不配置完全不影响本地使用 |
| 图表 | 纯 SVG / Canvas 手绘，无图表库 |
| 音频 | Web Audio API 合成白噪音，无音频文件 |
| 兼容 | Chrome / Edge / Safari / Firefox 现代版本 + iOS Safari |

架构细节见 [ARCHITECTURE.md](ARCHITECTURE.md)。

## 目录结构

```
/ (repo root)
├── index.html            # 入口：登录/注册/游客模式
├── app.html              # 应用主框架页（侧边栏 + 顶栏 + 主区）
├── assets/
│   ├── js/
│   │   ├── store.js      # 状态总线 + localStorage 适配器
│   │   ├── core.js       # 路由/工具/图标/通知/动画
│   │   ├── app.js        # app shell 引导 + 侧边栏/顶栏/移动端
│   │   ├── auth.js       # 账号系统（本地 + Supabase 可选云模式）
│   │   ├── module-<id>.js  # 功能模块，每个模块一个文件
│   │   └── data/         # 食物库/运动库/语录库/知识卡/成就定义
│   ├── css/
│   │   ├── base.css      # 变量/重置/主题令牌
│   │   ├── layout.css    # 侧边栏/顶栏/响应式框架
│   │   ├── components.css  # 通用组件样式
│   │   └── m/            # 各模块专属样式，每模块一个 <id>.css
│   └── img/              # logo.svg, favicon.svg
├── docs/                 # 用户手册/部署指南/竞品调研/架构契约
├── tests/selftest.html   # 自测页
├── README.md / SPEC.md / CHANGELOG.md
└── .nojekyll
```

> 注意：`assets/css/m/` 是各功能模块的独立样式目录，每个模块一个 `<id>.css` 文件；`base/layout/components` 三个共享样式为框架层统一维护。

## 部署到自己的 GitHub Pages

1. **Fork** 本仓库到你的 GitHub 账号；
2. 进入你 fork 后的仓库 → **Settings** → **Pages**；
3. Source 选择 **Deploy from a branch**，Branch 选 **main**，目录选 **/ (root)**，保存；
4. 等待 1-2 分钟，访问 `https://<你的用户名>.github.io/studylean/` 即可。

> 仓库已内置 `.nojekyll` 文件，GitHub Pages 会直接发布全部静态文件，无需担心下划线开头目录被忽略的问题。

详细步骤与排错见 [docs/DEPLOY.md](docs/DEPLOY.md)。

## 可选：Supabase 云同步

默认情况下所有数据只存在浏览器本地——换设备、清缓存前请先在「数据管理」导出 JSON 备份。

如果你希望多设备同步，可以（可选）配置免费的 Supabase：

1. 在 [supabase.com](https://supabase.com) 注册并创建一个项目；
2. 在 SQL Editor 中执行建表 SQL（见下方或 [docs/DEPLOY.md](docs/DEPLOY.md)，**含 RLS 策略需整段执行**）；
3. 复制项目的 URL 与 anon key；
4. 在研轻应用「设置 → 云同步」中填入 URL 与 anon key；
5. 注册/登录云端账号后，数据在所有设备间自动同步（打开应用自动拉取，记录变更自动上推）。

建表 SQL：

```sql
create table sl_data (
  user_id uuid primary key references auth.users,
  value jsonb,
  updated_at timestamptz default now()
);

alter table sl_data enable row level security;
create policy "own row select" on sl_data for select using (auth.uid() = user_id);
create policy "own row insert" on sl_data for insert with check (auth.uid() = user_id);
create policy "own row update" on sl_data for update using (auth.uid() = user_id);
create policy "own row delete" on sl_data for delete using (auth.uid() = user_id);
```

完整流程见 [docs/DEPLOY.md](docs/DEPLOY.md)。不配置 Supabase 不影响任何本地功能。

## 隐私声明

- 你的所有记录（学习、饮食、体重、日记等）默认**仅存储在当前浏览器的 localStorage 中**，不会上传到任何服务器；
- 研轻不含任何统计埋点、广告脚本或第三方追踪；
- 只有当你主动配置 Supabase 云同步后，数据才会同步到你自己的 Supabase 项目中；
- 清除浏览器数据会清掉本地记录，请定期在「数据管理」中导出 JSON 备份。

## License

[MIT](LICENSE) — 免费使用、自由修改、欢迎分享。
