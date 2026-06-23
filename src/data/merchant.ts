import { CONTAINERS, LUGGAGE } from './shop';

/** 黑市商人当前的一条报价 */
export interface MerchantOffer {
  id: string;              // 商品 id（容器/行李的 id）
  kind: 'luggage' | 'container';
  price: number;           // 折后价
  stock: number;           // 本次到访的限量库存（卖一件减一）
}

/** 首次到访延迟(ms)：开局一会儿就来一趟，给玩家点甜头 */
export const FIRST_VISIT_DELAY = 60_000; // 60s
/** 两次到访的间隔(ms) */
export const MERCHANT_INTERVAL = 180_000; // 180s
/** 单次到访停留时长(ms) */
export const MERCHANT_DURATION = 90_000; // 90s
/** 折扣：约 30% off */
export const MERCHANT_DISCOUNT = 0.7;
/** 每次摆出的商品数 */
export const MERCHANT_OFFER_COUNT = 3;

/** 商人专属（且限量）的顶级特殊货 —— 这些从普通商店消失，只能找商人买 */
export const MERCHANT_ONLY_CONTAINERS: ReadonlySet<string> = new Set(['missile', 'alienegg', 'meteor']);

interface PoolEntry {
  id: string;
  kind: 'luggage' | 'container';
  basePrice: number;
  /** 抽中权重：越高级越稀有(权重越小)，但仍给点机会 */
  weight: number;
}

/** 商人备货池：商人专属容器（高权重稀缺感弱一点）+ 部分特殊行李 */
export const MERCHANT_POOL: PoolEntry[] = (() => {
  const pool: PoolEntry[] = [];
  for (const c of CONTAINERS) {
    if (!MERCHANT_ONLY_CONTAINERS.has(c.id)) continue;
    pool.push({ id: c.id, kind: 'container', basePrice: c.price, weight: 1 / Math.sqrt(c.price) });
  }
  // 高级行李也偶尔出现在黑市（不独占，普通商店仍有）
  for (const l of LUGGAGE) {
    if (l.unlockStage < 3) continue;
    pool.push({ id: l.id, kind: 'luggage', basePrice: l.price, weight: 0.6 / Math.sqrt(l.price) });
  }
  return pool;
})();
