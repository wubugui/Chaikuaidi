import { ITEMS, ITEM_MAP, PARTS } from '../../data/items';
import type { MaterialId } from '../../data/materials';
import { RARITIES, RARITY_ORDER } from '../../data/rarity';
import type { ItemDef, Rarity } from '../../data/types';
import { weightedPick } from '../../lib/rng';

export interface RolledItem {
  item: ItemDef;
  rarity: Rarity;
}

// 预建索引：rarity -> kind -> items
const POOL: Record<Rarity, Record<string, ItemDef[]>> = {} as any;
for (const r of RARITY_ORDER) POOL[r] = { sellable: [], material: [], collectible: [], quote: [], part: [], element: [] };
for (const it of ITEMS) POOL[it.rarity][it.kind].push(it);

// 注意：零件 'part' 故意不入主掉落池——它只通过 rollPart 作为稀缺副产物掉落
const KIND_WEIGHTS: Array<[ItemDef['kind'], number]> = [
  ['sellable', 72],
  ['material', 15],
  ['collectible', 9],
  ['quote', 4],
];

export interface LootParams {
  /** 幸运加成（0.2 = +20%），把权重往高稀有度迁移 */
  luck: number;
  /** 进货批次的稀有度偏置倍率 */
  bias?: Partial<Record<Rarity, number>>;
}

/** 计算实际稀有度权重 */
export function rarityWeights(p: LootParams): number[] {
  return RARITY_ORDER.map((r, i) => {
    let w = RARITIES[r].weight;
    // 幸运：越高档加成越大
    if (i > 0) w *= 1 + p.luck * i;
    if (p.bias && p.bias[r]) w *= p.bias[r]!;
    return w;
  });
}

/** 抽一件掉落物（纯函数，rand 注入便于测试） */
export function rollItem(p: LootParams, rand: () => number, themePool?: string[]): RolledItem {
  const rIdx = weightedPick(rarityWeights(p), rand);
  const rarity = RARITY_ORDER[rIdx];

  // 主题池优先：该稀有度若有主题物品，从中抽；否则走全局池兜底
  if (themePool && themePool.length) {
    const themed = themePool
      .map((id) => ITEM_MAP[id])
      .filter((it) => it && it.rarity === rarity);
    if (themed.length) return { item: themed[Math.floor(rand() * themed.length)], rarity };
  }

  // 抽类别
  const kIdx = weightedPick(KIND_WEIGHTS.map((k) => k[1]), rand);
  let kind = KIND_WEIGHTS[kIdx][0];

  let pool = POOL[rarity][kind];
  // 该(稀有度,类别)无物 -> 退回可卖品 -> 再退回任意稀有度可卖品
  if (pool.length === 0) {
    kind = 'sellable';
    pool = POOL[rarity].sellable;
  }
  if (pool.length === 0) {
    // 找最近的有可卖品的较低稀有度
    for (let i = rIdx; i >= 0; i--) {
      const alt = POOL[RARITY_ORDER[i]].sellable;
      if (alt.length) {
        pool = alt;
        break;
      }
    }
  }
  const item = pool[Math.floor(rand() * pool.length)];
  return { item, rarity };
}

/** 售价计算 */
export function sellValue(item: ItemDef, rarity: Rarity, sellMultBonus: number): number {
  if (item.kind === 'collectible' || item.kind === 'quote') return 0;
  // 零件/元素：按 baseValue 平价回收（不吃稀有度倍率），能卖但卖不出价——更想留着合成
  if (item.kind === 'part' || item.kind === 'element') return Math.ceil(item.baseValue * (1 + sellMultBonus));
  return Math.ceil(item.baseValue * RARITIES[rarity].sellMult * (1 + sellMultBonus));
}

// ---- 零件掉落（独立于主掉落池的稀缺副产物）----

/** 零件抽取权重：commons 常见，epics 稀有 */
const PART_RARITY_WEIGHT: Record<Rarity, number> = {
  common: 60, rare: 28, epic: 10, legendary: 2, absurd: 1,
};

/** 各材质对零件掉率的倍率（金属/石矿 ×2，危险/异常 ×2.5） */
const PART_MATERIAL_MULT: Partial<Record<MaterialId, number>> = {
  metal: 2, stone: 2, volatile: 2.5, anomaly: 2.5,
};

/** 基础零件掉率 */
export const BASE_PART_CHANCE = 0.08;

export interface PartScaling {
  /** 材质倍率覆盖（默认按材质表） */
  material?: MaterialId;
  /** 额外掉率加成（分拣机/自动线等，绝对值，如 0.1 = +10%） */
  bonus?: number;
}

/** 计算本次开箱的零件掉率（0..0.6 封顶） */
export function partChance(material: MaterialId | undefined, bonus = 0): number {
  const mult = (material && PART_MATERIAL_MULT[material]) ?? 1;
  return Math.min(0.6, BASE_PART_CHANCE * mult + bonus);
}

/**
 * 掷一次零件掉落：命中则返回零件 item，否则 null。
 * @param material 箱体材质（影响倍率）
 * @param rand 注入随机
 * @param bonus 额外掉率加成（分拣机等）
 */
export function rollPart(material: MaterialId | undefined, rand: () => number, bonus = 0): ItemDef | null {
  const chance = partChance(material, bonus);
  if (rand() >= chance) return null;
  // 按稀有度权重选一档，再在该档零件里均匀抽
  const weights = PARTS.map((p) => PART_RARITY_WEIGHT[p.rarity]);
  const idx = weightedPick(weights, rand);
  return PARTS[idx];
}
