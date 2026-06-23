import type { ParcelSizeId } from './types';

export interface BatchDef {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  price: number;
  count: number;
  /** 稀有度权重倍率（叠加在基础权重上，>1 偏向该档） */
  rarityBias: { rare?: number; epic?: number; legendary?: number; absurd?: number };
  /** 该批次产出的快递规格 */
  sizes: ParcelSizeId[];
  unlockStage: 1 | 2 | 3 | 4;
}

export const BATCHES: BatchDef[] = [
  {
    id: 'loose', name: '散件', emoji: '📦', desc: '普通快递一小堆',
    price: 20, count: 5, rarityBias: {}, sizes: ['small', 'standard'], unlockStage: 1,
  },
  {
    id: 'returns', name: '退货堆', emoji: '🗳️', desc: '略偏稀有',
    price: 100, count: 10, rarityBias: { rare: 2 }, sizes: ['standard', 'reinforced'], unlockStage: 2,
  },
  {
    id: 'customs', name: '海关罚没', emoji: '🛃', desc: '偏史诗',
    price: 800, count: 10, rarityBias: { rare: 2, epic: 3 }, sizes: ['reinforced', 'crate'], unlockStage: 3,
  },
  {
    id: 'mystery', name: '神秘集装箱', emoji: '🚢', desc: '高传说率',
    price: 10000, count: 20, rarityBias: { epic: 3, legendary: 4 }, sizes: ['crate', 'container'], unlockStage: 4,
  },
  {
    id: 'blackmarket', name: '黑市批次', emoji: '🕶️', desc: '离谱率翻倍',
    price: 100000, count: 30, rarityBias: { legendary: 3, absurd: 5 }, sizes: ['crate', 'container'], unlockStage: 4,
  },
];
