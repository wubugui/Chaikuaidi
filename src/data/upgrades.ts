import type { UpgradeDef } from './types';

/** 升级成本：baseCost × growth^level */
export function upgradeCost(def: UpgradeDef, level: number): number {
  return Math.ceil(def.baseCost * Math.pow(def.growth, level));
}

/** 连买 n 级的总价（等比数列求和） */
export function upgradeBulkCost(def: UpgradeDef, level: number, n: number): number {
  let total = 0;
  for (let i = 0; i < n; i++) total += upgradeCost(def, level + i);
  return total;
}

export const UPGRADES: UpgradeDef[] = [
  { id: 'clickPower', name: '拆解力度', emoji: '💪', desc: '点击拆解值 +20%/级', baseCost: 30, growth: 1.15, maxLevel: 0, effect: 0.2 },
  { id: 'clickSpeed', name: '拆解手速', emoji: '⚡', desc: '点击冷却 -2%/级（上限 -80%）', baseCost: 50, growth: 1.18, maxLevel: 40, effect: 0.02 },
  { id: 'autoWorker', name: '自动拆包工', emoji: '🧑‍🏭', desc: '+1 自动拆包人手', baseCost: 200, growth: 1.25, maxLevel: 0, effect: 1 },
  { id: 'autoPower', name: '自动拆解值', emoji: '🔧', desc: '自动伤害 +25%/级', baseCost: 300, growth: 1.2, maxLevel: 0, effect: 0.25 },
  { id: 'workbench', name: '工作台扩容', emoji: '🏭', desc: '同时处理 +1 个快递', baseCost: 1000, growth: 1.6, maxLevel: 20, effect: 1 },
  { id: 'luck', name: '幸运值', emoji: '🍀', desc: '高稀有度权重 +5%/级', baseCost: 500, growth: 1.3, maxLevel: 0, effect: 0.05 },
  { id: 'deliverRate', name: '到货速率', emoji: '📥', desc: '免费到货间隔 -3%/级（上限 -90%）', baseCost: 150, growth: 1.22, maxLevel: 60, effect: 0.03 },
  { id: 'sellPrice', name: '卖价加成', emoji: '💰', desc: '所有售价 +10%/级', baseCost: 800, growth: 1.25, maxLevel: 0, effect: 0.1 },
  { id: 'comboCap', name: '连击上限', emoji: '🔥', desc: '连击倍率上限 +50%/级', baseCost: 5000, growth: 1.5, maxLevel: 10, effect: 0.5 },
];

export const UPGRADE_MAP: Record<string, UpgradeDef> = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

/** 自动卖货是一次性解锁项，单独处理 */
export const AUTO_SELL_COST = 2000;
