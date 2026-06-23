import type { ParcelSizeId, Rarity, ToolId } from '../data/types';

export interface Parcel {
  id: number;
  size: ParcelSizeId;
  emoji: string;
  sealMax: number;
  sealHP: number;
  lootCount: number;
}

export interface GameState {
  // 资源
  money: number;
  reputation: number; // 信誉 ⭐（转生货币）
  runEarned: number; // 本轮累计收入（阶段/转生用）
  lifetimeEarned: number; // 历史累计收入（成就用）

  // 拆包
  currentTool: ToolId;
  workbench: Parcel[];
  queue: Parcel[];
  combo: number;
  lastClickAt: number;

  // 升级
  upgrades: Record<string, number>;
  autoSellUnlocked: boolean;
  autoSellEnabled: boolean;
  autoSellKeepAbove: Rarity | null; // 保留高于此稀有度的；null=全卖

  // 库存与收集
  inventory: Record<string, number>;
  collection: string[];
  quotes: string[]; // 已获得的语录 id
  equippedQuotes: string[]; // 已装备的语录 id
  achievements: string[];
  prestigeTree: Record<string, number>;

  // 进度
  stage: 1 | 2 | 3 | 4;
  totalUnpacked: number;
  maxCombo: number;
  maxBatch: number;
  legendaryFound: boolean;
  absurdFound: boolean;

  // 暴怒
  rage: number;        // 0-100
  revengeLeft: number; // 剩余报复次数（×2 伤害）

  // 杂项
  audioEnabled: boolean;
  introSeen: boolean; // 开场演出是否看过
  lastSeen: number;
  deliverAccum: number; // 到货计时累加（秒）
}

export function initialState(): GameState {
  return {
    money: 0,
    reputation: 0,
    runEarned: 0,
    lifetimeEarned: 0,
    currentTool: 'nail',
    workbench: [],
    queue: [],
    combo: 0,
    lastClickAt: 0,
    upgrades: {},
    autoSellUnlocked: false,
    autoSellEnabled: false,
    autoSellKeepAbove: null,
    inventory: {},
    collection: [],
    quotes: [],
    equippedQuotes: [],
    achievements: [],
    prestigeTree: {},
    stage: 1,
    totalUnpacked: 0,
    maxCombo: 0,
    maxBatch: 0,
    legendaryFound: false,
    absurdFound: false,
    rage: 0,
    revengeLeft: 0,
    audioEnabled: true,
    introSeen: false,
    lastSeen: Date.now(),
    deliverAccum: 0,
  };
}

/** 语录装备槽位：基础 1 + 转生节点 */
export const BASE_QUOTE_SLOTS = 1;

export const COMBO_WINDOW_MS = 2000;
export const BASE_DELIVER_INTERVAL = 3; // 秒
export const AUTO_PER_WORKER = 2; // 每个工人基础自动伤害/秒
