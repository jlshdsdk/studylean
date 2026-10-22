/** StudyLean sports.js | Contractor: SA-05 | Contract: ARCHITECTURE v2.0 */
/**
 * 运动消耗库
 * met 值参考 Compendium of Physical Activities（2011 修订版）常用值，
 * 结合国内常见运动场景做了适度取整，仅供估算。
 * kcal = met × weightKg × hours
 */
export const SPORTS = [
  // ── 有氧 ──
  { name: '快走', met: 3.5, cat: '有氧', icon: 'walk' },
  { name: '慢跑', met: 7.0, cat: '有氧', icon: 'run' },
  { name: '中速跑', met: 8.5, cat: '有氧', icon: 'run' },
  { name: '快跑（10km/h+）', met: 10.0, cat: '有氧', icon: 'run' },
  { name: '跳绳（中速）', met: 11.8, cat: '有氧', icon: 'jump' },
  { name: '游泳（自由泳）', met: 8.3, cat: '有氧', icon: 'swim' },
  { name: '游泳（蛙泳）', met: 5.8, cat: '有氧', icon: 'swim' },
  { name: '骑行（休闲）', met: 6.8, cat: '有氧', icon: 'bike' },
  { name: '骑行（通勤）', met: 5.8, cat: '有氧', icon: 'bike' },
  { name: '椭圆机', met: 5.0, cat: '有氧', icon: 'machine' },
  { name: '爬楼梯', met: 8.0, cat: '有氧', icon: 'stairs' },
  { name: '登山/徒步', met: 6.0, cat: '有氧', icon: 'mountain' },
  { name: '跳操（有氧操）', met: 6.0, cat: '有氧', icon: 'dance' },
  { name: 'HIIT 高强度间歇', met: 8.0, cat: '有氧', icon: 'fire' },
  { name: '开合跳', met: 8.0, cat: '有氧', icon: 'jump' },
  { name: '波比跳', met: 8.5, cat: '有氧', icon: 'fire' },
  { name: '健身操', met: 6.0, cat: '有氧', icon: 'dance' },
  { name: '刘畊宏健身操', met: 6.5, cat: '有氧', icon: 'dance' },
  { name: '帕梅拉燃脂操', met: 6.0, cat: '有氧', icon: 'dance' },
  { name: 'HIT 燃脂操', met: 7.0, cat: '有氧', icon: 'fire' },
  { name: '跑步机爬坡走', met: 5.3, cat: '有氧', icon: 'machine' },
  { name: '划船机', met: 7.0, cat: '有氧', icon: 'machine' },

  // ── 力量 ──
  { name: '力量训练（一般）', met: 5.0, cat: '力量', icon: 'dumbbell' },
  { name: '深蹲', met: 5.0, cat: '力量', icon: 'dumbbell' },
  { name: '俯卧撑', met: 3.8, cat: '力量', icon: 'dumbbell' },
  { name: '引体向上', met: 8.0, cat: '力量', icon: 'dumbbell' },
  { name: '卷腹', met: 3.8, cat: '力量', icon: 'dumbbell' },
  { name: '平板支撑', met: 3.8, cat: '力量', icon: 'dumbbell' },
  { name: '臀桥', met: 3.5, cat: '力量', icon: 'dumbbell' },
  { name: '哑铃训练', met: 3.5, cat: '力量', icon: 'dumbbell' },
  { name: '杠铃卧推', met: 5.0, cat: '力量', icon: 'dumbbell' },
  { name: '硬拉', met: 6.0, cat: '力量', icon: 'dumbbell' },

  // ── 球类 ──
  { name: '羽毛球', met: 5.5, cat: '球类', icon: 'shuttlecock' },
  { name: '乒乓球', met: 4.5, cat: '球类', icon: 'ball' },
  { name: '篮球（对抗）', met: 6.5, cat: '球类', icon: 'ball' },
  { name: '篮球（投篮练习）', met: 4.5, cat: '球类', icon: 'ball' },
  { name: '足球', met: 7.0, cat: '球类', icon: 'ball' },
  { name: '排球', met: 4.0, cat: '球类', icon: 'ball' },
  { name: '网球（单打）', met: 8.0, cat: '球类', icon: 'ball' },
  { name: '网球（双打）', met: 5.0, cat: '球类', icon: 'ball' },
  { name: '台球', met: 2.5, cat: '球类', icon: 'ball' },

  // ── 居家 ──
  { name: '居家拉伸', met: 2.3, cat: '居家', icon: 'stretch' },
  { name: '瑜伽', met: 3.0, cat: '居家', icon: 'yoga' },
  { name: '太极', met: 3.0, cat: '居家', icon: 'yoga' },
  { name: '八段锦', met: 2.5, cat: '居家', icon: 'yoga' },
  { name: '广场舞', met: 4.5, cat: '居家', icon: 'dance' },
  { name: '散步（遛弯）', met: 2.8, cat: '居家', icon: 'walk' },
  { name: '家务（打扫/拖地）', met: 3.3, cat: '居家', icon: 'home' },
  { name: '跳绳（慢速）', met: 8.8, cat: '居家', icon: 'jump' },
  { name: '原地高抬腿', met: 8.0, cat: '居家', icon: 'fire' },
  { name: '靠墙静蹲', met: 4.0, cat: '居家', icon: 'dumbbell' },

  // ── 拉伸 ──
  { name: '运动前热身', met: 2.8, cat: '拉伸', icon: 'stretch' },
  { name: '运动后拉伸', met: 2.3, cat: '拉伸', icon: 'stretch' },
  { name: '泡沫轴放松', met: 2.5, cat: '拉伸', icon: 'stretch' },
  { name: '颈肩放松操', met: 2.3, cat: '拉伸', icon: 'stretch' },
  { name: '睡前舒缓拉伸', met: 2.0, cat: '拉伸', icon: 'stretch' },
];

export const SPORT_CATS = ['有氧', '力量', '球类', '居家', '拉伸'];

/**
 * 按 MET 公式估算运动消耗
 * kcal = met × weightKg × hours
 * @param {{met:number}} sport 运动对象（或任何含 met 字段的对象）
 * @param {number} minutes 运动分钟数
 * @param {number} weightKg 体重（kg）
 * @returns {number} 千卡，四舍五入到整数
 */
export function calcKcal(sport, minutes, weightKg) {
  if (!sport || typeof sport.met !== 'number') return 0;
  const hours = Number(minutes) / 60;
  const kcal = sport.met * Number(weightKg) * hours;
  if (!Number.isFinite(kcal) || kcal < 0) return 0;
  return Math.round(kcal);
}
