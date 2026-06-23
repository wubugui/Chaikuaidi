import type { MaterialId } from './materials';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'absurd';
export type ItemKind = 'sellable' | 'material' | 'collectible' | 'quote';
export type ParcelSizeId = 'envelope' | 'small' | 'standard' | 'reinforced' | 'crate' | 'container';
export type ToolId = 'hand' | 'cutter' | 'crowbar' | 'grinder' | 'chisel' | 'torch' | 'disarm' | 'press' | 'laserrig' | 'blackhole';

export interface ItemDef {
  id: string;
  name: string;
  emoji: string;
  kind: ItemKind;
  rarity: Rarity;
  baseValue: number; // 基础售价（再乘稀有度倍率）；收藏品/语录为 0
  /** 收藏品的被动加成（自动生效） */
  passive?: { label: string; type: PassiveType; amount: number };
  /** 语录台词（kind==='quote'）；装备后生效 */
  quote?: { text: string; label: string; type: PassiveType; amount: number };
}

export type PassiveType =
  | 'clickPower' // 点击拆解值 +%
  | 'autoPower' // 自动拆解值 +%
  | 'sellPrice' // 售价 +%
  | 'luck' // 幸运 +%
  | 'autoSpeed' // 到货速度 +%
  | 'comboCap'; // 连击倍率上限 +

export interface ParcelSizeDef {
  id: ParcelSizeId;
  name: string;
  emoji: string;
  material: MaterialId;
  sealMax: number;
  lootMin: number;
  lootMax: number;
  unlockStage: 1 | 2 | 3 | 4;
}

export interface ToolDef {
  id: ToolId;
  name: string;
  emoji: string;
  power: number;
  cost: number;               // 购买价（¥）；hand=0
  affinity: Partial<Record<MaterialId, number>>; // 对各材质效率，缺省=0=撬不动
  unlockStage: 1 | 2 | 3 | 4;
  upgradeMat?: string;        // 升级消耗的材料 item id
  volatileSafe?: boolean;     // 处理 volatile 是否安全（增量2用，先留字段）
  fragileDestroy?: boolean;   // 液压机：开箱时高稀有易碎件50%损坏（先留字段，可简单实现）
  eatsLoot?: boolean;         // 黑洞：开箱随机吞1件（先留字段，可简单实现）
}

export interface UpgradeDef {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  baseCost: number;
  growth: number; // 成本增长系数
  maxLevel: number; // 0 表示无上限
  /** 每级效果，由各 system 解读 */
  effect: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  /** 返回 true 表示达成 */
  check: (s: AchievementContext) => boolean;
  reward: number; // 一次性 ¥ 奖励
}

export interface AchievementContext {
  totalUnpacked: number;
  totalEarned: number;
  maxCombo: number;
  collectionCount: number;
  collectionTotal: number;
  legendaryFound: boolean;
  absurdFound: boolean;
  batchSize: number;
  quoteCount: number;
}
