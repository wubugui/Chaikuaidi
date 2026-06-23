export interface PrestigeNodeDef {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  cost: number; // 每级信誉 ⭐ 成本
  growth: number;
  maxLevel: number;
  effect: number;
}

/** 转生永久加成树。信誉 ⭐ = floor(sqrt(本轮累计收入 / 1e6)) */
export const PRESTIGE_NODES: PrestigeNodeDef[] = [
  { id: 'startCash', name: '启动资金', emoji: '💵', desc: '开局直接获得 ¥（指数增长）', cost: 1, growth: 1.5, maxLevel: 20, effect: 500 },
  { id: 'globalClick', name: '熟能生巧', emoji: '✊', desc: '全局拆解值 +25%/级', cost: 2, growth: 1.6, maxLevel: 0, effect: 0.25 },
  { id: 'globalSell', name: '人脉网络', emoji: '🤝', desc: '全局售价 +20%/级', cost: 2, growth: 1.6, maxLevel: 0, effect: 0.2 },
  { id: 'globalLuck', name: '天选之子', emoji: '🌟', desc: '全局幸运 +10%/级', cost: 3, growth: 1.8, maxLevel: 20, effect: 0.1 },
  { id: 'offline', name: '夜间分拣', emoji: '🌙', desc: '离线效率 +10%/级（基础 50%）', cost: 2, growth: 1.7, maxLevel: 5, effect: 0.1 },
  { id: 'quoteSlot', name: '嘴遁扩容', emoji: '🗯️', desc: '语录装备槽 +1/级', cost: 3, growth: 2, maxLevel: 4, effect: 1 },
];

export const PRESTIGE_MAP: Record<string, PrestigeNodeDef> = Object.fromEntries(
  PRESTIGE_NODES.map((n) => [n.id, n]),
);

export function prestigeNodeCost(def: PrestigeNodeDef, level: number): number {
  return Math.ceil(def.cost * Math.pow(def.growth, level));
}

/** 跑路重开可得信誉 */
export function reputationFor(totalEarned: number): number {
  return Math.floor(Math.sqrt(totalEarned / 1_000_000));
}
