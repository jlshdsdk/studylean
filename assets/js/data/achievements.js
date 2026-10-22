/**
 * StudyLean achievements.js — 成就定义库（32 个）
 * Contractor: SA-06
 * Contract: ARCHITECTURE v2.0
 *
 * 字段：id / name / desc / icon / tier / check(SL) => bool
 * check 从 SL.getData 读取各模块命名空间判断是否达成，只读不写。
 * tier 分布：bronze 12、silver 10、gold 7、diamond 3。
 */

/** 工具：取数组数据安全长度 */
const cnt = (SL, key, listKey = 'history') => {
  const d = SL.getData(key);
  return d && Array.isArray(d[listKey]) ? d[listKey].length : 0;
};
/** 工具：统计日期键记录（值为 true 或数字）涉及的自然日数 */
const dayKeys = (obj) => (obj && typeof obj === 'object') ? Object.keys(obj).filter(k => obj[k]).length : 0;
/** 工具：习惯连续打卡最长天数（跨习惯取最大） */
const maxStreak = (SL) => {
  const d = SL.getData('habits');
  if (!d || !Array.isArray(d.items)) return 0;
  let best = 0;
  for (const h of d.items) {
    if (!h || !h.records) continue;
    const days = Object.keys(h.records).filter(k => h.records[k]).sort();
    let cur = 0, prev = null;
    for (const ds of days) {
      if (prev) {
        const diff = (new Date(ds) - new Date(prev)) / 86400000;
        cur = diff === 1 ? cur + 1 : 1;
      } else cur = 1;
      if (cur > best) best = cur;
      prev = ds;
    }
  }
  return best;
};
/** 工具：最早记录日期到今天的天数（用于连续打卡类兜底判断） */
const datesOf = (SL, key, listKey = 'history') => {
  const d = SL.getData(key);
  return (d && Array.isArray(d[listKey])) ? d[listKey].map(x => x.date).filter(Boolean).sort() : [];
};
/** 连续日期最长串（YYYY-MM-DD 数组） */
const longestRun = (days) => {
  if (!days.length) return 0;
  let best = 1, cur = 1;
  for (let i = 1; i < days.length; i++) {
    const diff = (new Date(days[i]) - new Date(days[i - 1])) / 86400000;
    cur = diff === 1 ? cur + 1 : 1;
    if (cur > best) best = cur;
  }
  return best;
};

export const TIERS = {
  bronze:  { name: '铜',   color: '#b45309' },
  silver:  { name: '银',   color: '#64748b' },
  gold:    { name: '金',   color: '#d97706' },
  diamond: { name: '钻石', color: '#0ea5e9' }
};

export const ACHIEVEMENTS = [
  // ==================== 番茄钟 / 专注 ====================
  {
    id: 'acc-first-pomodoro', name: '第一颗番茄', desc: '完成第一个番茄钟', icon: 'timer', tier: 'bronze',
    check: (SL) => cnt(SL, 'timer') >= 1
  },
  {
    id: 'acc-pomodoro-10', name: '小有所成', desc: '累计完成 10 个番茄钟', icon: 'timer', tier: 'bronze',
    check: (SL) => cnt(SL, 'timer') >= 10
  },
  {
    id: 'acc-pomodoro-100', name: '百番斩将', desc: '累计完成 100 个番茄钟', icon: 'clock', tier: 'gold',
    check: (SL) => cnt(SL, 'timer') >= 100
  },
  {
    id: 'acc-focus-10h', name: '专注新手', desc: '累计专注时长达 10 小时', icon: 'zap', tier: 'bronze',
    check: (SL) => {
      const d = SL.getData('timer');
      const mins = (d && Array.isArray(d.history)) ? d.history.reduce((s, x) => s + (x.minutes || 0), 0) : 0;
      return mins >= 600;
    }
  },
  {
    id: 'acc-focus-50h', name: '专注进阶', desc: '累计专注时长达 50 小时', icon: 'zap', tier: 'silver',
    check: (SL) => {
      const d = SL.getData('timer');
      const mins = (d && Array.isArray(d.history)) ? d.history.reduce((s, x) => s + (x.minutes || 0), 0) : 0;
      return mins >= 3000;
    }
  },
  {
    id: 'acc-focus-100h', name: '时间的朋友', desc: '累计专注时长达 100 小时', icon: 'zap', tier: 'gold',
    check: (SL) => {
      const d = SL.getData('timer');
      const mins = (d && Array.isArray(d.history)) ? d.history.reduce((s, x) => s + (x.minutes || 0), 0) : 0;
      return mins >= 6000;
    }
  },
  {
    id: 'acc-forest-50', name: '心灵园丁', desc: '在专注森林种下 50 棵树', icon: 'tree', tier: 'bronze',
    check: (SL) => cnt(SL, 'forest', 'trees') >= 50
  },

  // ==================== 打卡 / 习惯 ====================
  {
    id: 'acc-streak-3', name: '三日之约', desc: '任一习惯连续打卡 3 天', icon: 'flame', tier: 'bronze',
    check: (SL) => maxStreak(SL) >= 3
  },
  {
    id: 'acc-streak-7', name: '一周连击', desc: '任一习惯连续打卡 7 天', icon: 'flame', tier: 'bronze',
    check: (SL) => maxStreak(SL) >= 7
  },
  {
    id: 'acc-streak-21', name: '习惯成型', desc: '任一习惯连续打卡 21 天', icon: 'flame', tier: 'silver',
    check: (SL) => maxStreak(SL) >= 21
  },
  {
    id: 'acc-streak-100', name: '百日意志', desc: '任一习惯连续打卡 100 天', icon: 'flame', tier: 'diamond',
    check: (SL) => maxStreak(SL) >= 100
  },
  {
    id: 'acc-early-bird', name: '早鸟', desc: '完成一次 6 点前的早起打卡', icon: 'sun', tier: 'bronze',
    check: (SL) => {
      const d = SL.getData('habits');
      if (!d || !Array.isArray(d.items)) return false;
      return d.items.some(h => h && h.records && Object.keys(h.records).some(k => h.records[k] && /早起|晨|6点/.test(h.name || '')));
    }
  },

  // ==================== 日记 / 待办 ====================
  {
    id: 'acc-diary-1', name: '落笔为记', desc: '写下第一篇日记', icon: 'book', tier: 'bronze',
    check: (SL) => cnt(SL, 'diary', 'entries') >= 1
  },
  {
    id: 'acc-diary-10', name: '坚持笔耕', desc: '累计写下 10 篇日记', icon: 'book', tier: 'silver',
    check: (SL) => cnt(SL, 'diary', 'entries') >= 10
  },
  {
    id: 'acc-diary-100', name: '百篇心史', desc: '累计写下 100 篇日记', icon: 'book', tier: 'gold',
    check: (SL) => cnt(SL, 'diary', 'entries') >= 100
  },
  {
    id: 'acc-todo-50', name: '清单猎手', desc: '完成 50 个待办事项', icon: 'check', tier: 'gold',
    check: (SL) => {
      const d = SL.getData('todo');
      return (d && Array.isArray(d.items)) ? d.items.filter(x => x && x.done).length >= 50 : false;
    }
  },

  // ==================== 体重 / 减脂 ====================
  {
    id: 'acc-weight-5', name: '开始上秤', desc: '累计记录 5 次体重', icon: 'scale', tier: 'bronze',
    check: (SL) => cnt(SL, 'weight', 'records') >= 5
  },
  {
    id: 'acc-weight-30', name: '曲线绘者', desc: '累计记录 30 次体重', icon: 'chart', tier: 'silver',
    check: (SL) => cnt(SL, 'weight', 'records') >= 30
  },
  {
    id: 'acc-lose-1', name: '第一步', desc: '累计减重达成 1 kg', icon: 'run', tier: 'silver',
    check: (SL) => {
      const d = SL.getData('weight');
      const r = (d && Array.isArray(d.records)) ? d.records.filter(x => x && x.kg)
        .slice().sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0) : [];
      return r.length >= 2 && (r[0].kg - r[r.length - 1].kg) >= 1;
    }
  },
  {
    id: 'acc-lose-5', name: '轻装上阵', desc: '累计减重达成 5 kg', icon: 'target', tier: 'gold',
    check: (SL) => {
      const d = SL.getData('weight');
      const r = (d && Array.isArray(d.records)) ? d.records.filter(x => x && x.kg)
        .slice().sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0) : [];
      return r.length >= 2 && (r[0].kg - r[r.length - 1].kg) >= 5;
    }
  },
  {
    id: 'acc-lose-10', name: '脱胎换骨', desc: '累计减重达成 10 kg', icon: 'trophy', tier: 'diamond',
    check: (SL) => {
      const d = SL.getData('weight');
      const r = (d && Array.isArray(d.records)) ? d.records.filter(x => x && x.kg)
        .slice().sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0) : [];
      return r.length >= 2 && (r[0].kg - r[r.length - 1].kg) >= 10;
    }
  },

  // ==================== 喝水 / 睡眠 / 运动 ====================
  {
    id: 'acc-water-10', name: '水润开局', desc: '喝水达标累计 10 天', icon: 'water', tier: 'bronze',
    check: (SL) => {
      const d = SL.getData('water');
      if (!d || !d.daily) return false;
      const goal = d.goal || 2000;
      return Object.keys(d.daily).filter(k => d.daily[k] >= goal).length >= 10;
    }
  },
  {
    id: 'acc-water-30', name: '饮者无敌', desc: '喝水达标累计 30 天', icon: 'water', tier: 'silver',
    check: (SL) => {
      const d = SL.getData('water');
      if (!d || !d.daily) return false;
      const goal = d.goal || 2000;
      return Object.keys(d.daily).filter(k => d.daily[k] >= goal).length >= 30;
    }
  },
  {
    id: 'acc-sleep-7', name: '安睡七夜', desc: '睡眠记录累计 7 次', icon: 'moon', tier: 'bronze',
    check: (SL) => cnt(SL, 'sleep', 'entries') >= 7
  },
  {
    id: 'acc-sleep-good', name: '睡眠优等生', desc: '连续 7 天睡眠质量不低于 4 星', icon: 'moon', tier: 'gold',
    check: (SL) => longestRun(datesOf(SL, 'sleep', 'entries').filter(date => {
      const d = SL.getData('sleep');
      const e = (d && Array.isArray(d.entries)) ? d.entries.find(x => x.date === date) : null;
      return e && e.quality >= 4;
    })) >= 7
  },
  {
    id: 'acc-sport-10', name: '动起来', desc: '累计记录 10 次运动', icon: 'heart', tier: 'silver',
    check: (SL) => cnt(SL, 'sport', 'entries') >= 10
  },
  {
    id: 'acc-sport-1000', name: '燃烧吧卡路里', desc: '运动累计消耗 1000 kcal', icon: 'flame', tier: 'silver',
    check: (SL) => {
      const d = SL.getData('sport');
      const kcal = (d && Array.isArray(d.entries)) ? d.entries.reduce((s, x) => s + (x.kcal || 0), 0) : 0;
      return kcal >= 1000;
    }
  },

  // ==================== 商城 / 目标 / 综合成长 ====================
  {
    id: 'acc-shop-first', name: '首笔兑换', desc: '在自律商城完成第一次兑换', icon: 'gift', tier: 'bronze',
    check: (SL) => {
      const d = SL.getData('shop');
      return (d && Array.isArray(d.records)) ? d.records.some(r => r && r.type === 'spend') : false;
    }
  },
  {
    id: 'acc-goal-done', name: '里程碑达成', desc: '完成第一个目标的所有里程碑', icon: 'target', tier: 'gold',
    check: (SL) => {
      const d = SL.getData('goals');
      if (!d || !Array.isArray(d.items)) return false;
      return d.items.some(g => g && Array.isArray(g.milestones) && g.milestones.length > 0 && g.milestones.every(m => m.done));
    }
  },
  {
    id: 'acc-knowledge-10', name: '求知若渴', desc: '阅读 10 张知识卡片', icon: 'book', tier: 'silver',
    check: (SL) => {
      const d = SL.getData('knowledge');
      return (d && Array.isArray(d.readIds)) ? d.readIds.length >= 10 : false;
    }
  },
  {
    id: 'acc-first-unlock', name: '成就初启', desc: '解锁你的第一个成就', icon: 'trophy', tier: 'bronze',
    check: (SL) => {
      const d = SL.getData('achievements');
      if (!d || !d.unlocked) return false;
      return Object.keys(d.unlocked).filter(k => k !== 'acc-first-unlock').length >= 1;
    }
  },
  {
    id: 'acc-all-rounder', name: '全面开花', desc: '番茄、日记、体重、运动均有记录', icon: 'sparkles', tier: 'diamond',
    check: (SL) => cnt(SL, 'timer') >= 1 && cnt(SL, 'diary', 'entries') >= 1
      && cnt(SL, 'weight', 'records') >= 1 && cnt(SL, 'sport', 'entries') >= 1
  }
];
