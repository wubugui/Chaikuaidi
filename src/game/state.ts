import type { MaterialId } from '../data/materials';
import type { MerchantOffer } from '../data/merchant';
import { FIRST_VISIT_DELAY } from '../data/merchant';
import type { MutationId } from '../data/mutations';
import type { ParcelSizeId, Rarity, ToolId } from '../data/types';

export interface Parcel {
  id: number;
  size: ParcelSizeId;
  emoji: string;
  material: MaterialId; // 箱体材质，决定需要哪类工具
  sealMax: number;
  sealHP: number;
  lootCount: number;
  luckBonus?: number;  // 额外幸运（行李/高级批次更易爆）
  pool?: string[];     // 主题掉落池（item id），命中对应稀有度时优先取
  label?: string;      // 特殊名（行李名，覆盖尺寸名显示）
  hollowChance?: number; // 扑空概率（原石）：开箱瞬间小概率啥也没有
  danger?: boolean;      // 危险品：用错工具开箱会爆炸
  requireMutation?: MutationId; // 变异门：没有该变异时任何工具都撬不动
}

export interface GameState {
  // 资源
  money: number;
  reputation: number; // 信誉 ⭐（转生货币）
  runEarned: number; // 本轮累计收入（阶段/转生用）
  lifetimeEarned: number; // 历史累计收入（成就用）

  // 拆包
  ownedTools: ToolId[];                 // 已拥有
  currentTool: ToolId;                  // 当前装备（开箱用这把）
  toolLevels: Record<ToolId, number>;   // 每把工具的升级等级
  workbench: Parcel[];
  queue: Parcel[];
  backlog: Parcel[]; // 积压区仓库：买来的货 + 手动搁置的硬箱，需手动上台
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
  dazedUntil: number;  // 被炸懵到此时间戳前点击无效（Date.now() ms）

  // 变异
  mutations: MutationId[]; // 已获得的变异（永久可叠加）
  dangerStreak: number;    // 危险品意外未变异的累计（垫刀）

  // 图纸 / 合成 / 设备
  blueprints: string[];                 // 已拥有的图纸 id
  targetBlueprint: string | null;       // 当前目标图纸（其所需零件全局高亮）
  devices: Record<string, number>;      // 已建造设备 id -> 台数
  deviceAccum: Record<string, number>;  // 每种设备的累计计时（秒）

  // 黑市商人
  merchant: { until: number; offers: MerchantOffer[] } | null; // 当前在场的黑市商人，null=不在
  merchantNextAt: number; // 下次到访时间戳(ms)

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
    ownedTools: ['hand'],
    currentTool: 'hand',
    toolLevels: {} as Record<ToolId, number>,
    workbench: [],
    queue: [],
    backlog: [],
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
    dazedUntil: 0,
    mutations: [],
    dangerStreak: 0,
    blueprints: [],
    targetBlueprint: null,
    devices: {},
    deviceAccum: {},
    merchant: null,
    merchantNextAt: Date.now() + FIRST_VISIT_DELAY,
    audioEnabled: true,
    introSeen: false,
    lastSeen: Date.now(),
    deliverAccum: 0,
  };
}

/**
 * 积压区分组键：稳定地把同种货归到一组。
 * 用 显示名(label ?? 尺寸名) + 材质 + 危险/变异门 区分，避免不同货混淆。
 */
export function backlogGroupKey(p: Parcel, sizeName: string): string {
  const name = p.label ?? sizeName;
  return [name, p.material, p.danger ? 'd' : '', p.requireMutation ?? ''].join('|');
}

/** 语录装备槽位：基础 1 + 转生节点 */
export const BASE_QUOTE_SLOTS = 1;

export const COMBO_WINDOW_MS = 2000;
export const BASE_DELIVER_INTERVAL = 3; // 秒
export const AUTO_PER_WORKER = 2; // 每个工人基础自动伤害/秒
/** 自动拆转区：每台每隔多少秒处理一个积压快递 */
export const AUTO_LINE_INTERVAL = 4; // 秒
