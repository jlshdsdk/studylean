-- 研轻 StudyLean · Supabase 一键建表 SQL
-- 用法：打开 https://supabase.com/dashboard → 你的项目（qvemohfojzawpnleyjsb）→ SQL Editor → 粘贴本文件全部内容 → Run
-- 只需执行一次。执行后手机/电脑即可用邮箱账号登录并自动同步。

create table if not exists sl_data (
  user_id uuid primary key references auth.users,
  value jsonb,
  updated_at timestamptz default now()
);

-- 行级安全：每个用户只能读写自己的数据行（必须执行，否则同步报 403）
alter table sl_data enable row level security;

drop policy if exists "own row select" on sl_data;
create policy "own row select" on sl_data
  for select using (auth.uid() = user_id);

drop policy if exists "own row insert" on sl_data;
create policy "own row insert" on sl_data
  for insert with check (auth.uid() = user_id);

drop policy if exists "own row update" on sl_data;
  create policy "own row update" on sl_data
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own row delete" on sl_data;
create policy "own row delete" on sl_data
  for delete using (auth.uid() = user_id);

-- 完成标志：执行成功后 sl_data 表会出现在 Table Editor 中
