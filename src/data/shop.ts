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

export interface LuggageDef {
  id: string;
  name: string;
  emoji: string;
  flavor: string;       // 故事文案（神秘感钩子）
  price: number;
  baseSize: ParcelSizeId; // 借用尺寸做 size 字段
  sealMax: number;       // 行李难撬
  lootMin: number;
  lootMax: number;
  luckBonus: number;     // 高幸运 → 概率爆
  pool: string[];        // 主题掉落池
  unlockStage: 1 | 2 | 3 | 4;
}

export const LUGGAGE: LuggageDef[] = [
  {
    id: 'lug_woman', name: '陌生女人丢弃的行李', emoji: '🧳',
    flavor: '粉色行李箱，密码锁停在 0000。半瓶廉价香水，一沓没寄出的信，和一个她大概再也不想要的秘密。',
    price: 600, baseSize: 'reinforced', sealMax: 140, lootMin: 4, lootMax: 6, luckBonus: 0.6,
    pool: ['letter', 'polaroid', 'lipstick', 'perfume', 'ring', 'watch', 'phone'],
    unlockStage: 2,
  },
  {
    id: 'lug_weirdo', name: '变态的行李', emoji: '🧳',
    flavor: '全是分类整理好的「藏品」，贴着手写标签。你不想知道这些是干嘛用的——但有些，好像还挺值钱？',
    price: 4000, baseSize: 'crate', sealMax: 420, lootMin: 5, lootMax: 7, luckBonus: 0.8,
    pool: ['knob', 'namebook', 'handmodel', 'socks', 'doll', 'gpu'],
    unlockStage: 3,
  },
  {
    id: 'lug_grave', name: '墓地捡到的行李', emoji: '🧳',
    flavor: '你发誓昨天那儿什么都没有。箱子上还沾着新翻的泥，拉链一拉，一股……回忆的味道涌出来。',
    price: 9000, baseSize: 'crate', sealMax: 520, lootMin: 5, lootMax: 8, luckBonus: 1.0,
    pool: ['candle', 'pocketwatch', 'beads', 'urn', 'statue', 'alien'],
    unlockStage: 3,
  },
  {
    id: 'lug_alien', name: '不属于地球的行李', emoji: '🛸',
    flavor: '它不是地球上的材质。打开的瞬间你听到了嗡嗡声，箱子内壁还在缓慢地……呼吸。',
    price: 120000, baseSize: 'container', sealMax: 1600, lootMin: 8, lootMax: 12, luckBonus: 1.5,
    pool: ['ufo', 'alien', 'diamond', 'goldbar', 'carkey', 'gpu'],
    unlockStage: 4,
  },
];
