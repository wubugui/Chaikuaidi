import { ITEMS, ITEM_MAP } from '../../data/items';
import { RARITIES, RARITY_ORDER } from '../../data/rarity';
import type { ItemDef, Rarity } from '../../data/types';
import { weightedPick } from '../../lib/rng';

export interface RolledItem {
  item: ItemDef;
  rarity: Rarity;
}

// 预建索引：rarity -> kind -> items
const POOL: Record<Rarity, Record<string, ItemDef[]>> = {} as any;
for (const r of RARITY_ORDER) POOL[r] = { sellable: [], material: [], collectible: [], quote: [] };
for (const it of ITEMS) POOL[it.rarity][it.kind].push(it);

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
  return Math.ceil(item.baseValue * RARITIES[rarity].sellMult * (1 + sellMultBonus));
}
