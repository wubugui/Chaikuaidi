import type { ItemKind, Rarity } from '../data/types';
import type { FeedbackLevel } from './engine';

export interface LootBurst {
  id: number;
  emoji: string;
  rarity: Rarity;
  isNewCollectible: boolean;
  newKind?: 'collectible' | 'quote';
  quoteText?: string;
}

export interface FloatText {
  id: number;
  text: string;
  color: string;
  kind: 'damage' | 'cash' | 'combo';
}

/** 开箱特写里的单件战利品 */
export interface RevealItem {
  emoji: string;
  name: string;
  rarity: Rarity;
  kind: ItemKind;
  value: number; // 可卖/材料的售价；收藏/语录为 0
  isNew: boolean; // 新收藏品/新语录
  quoteText?: string;
  isDestroyed?: boolean; // 被暴怒踢坏
}

/** 一次开箱事件（一个快递拆开后掉的东西） */
export interface RevealData {
  id: number;
  parcelEmoji: string;
  parcelName: string;
  items: RevealItem[];
  topRarity: Rarity;
  manual: boolean; // 手动拆（走完整特写）还是自动拆出的稀有
}

type Handlers = {
  loot: (b: LootBurst) => void;
  float: (f: FloatText) => void;
  open: () => void;
  feedback: (lvl: FeedbackLevel) => void;
  reveal: (r: RevealData) => void;
  revealStart: () => void;
  revealEnd: () => void;
  rageBurst: () => void;
};

const listeners: { [K in keyof Handlers]: Set<Handlers[K]> } = {
  loot: new Set(),
  float: new Set(),
  open: new Set(),
  feedback: new Set(),
  reveal: new Set(),
  revealStart: new Set(),
  revealEnd: new Set(),
  rageBurst: new Set(),
};

let uid = 1;
export function nextId() {
  return uid++;
}
/** 重载存档后把计数器抬到已有 id 之上，避免 React key 冲突 */
export function seedId(min: number) {
  if (min >= uid) uid = min + 1;
}

export function on<K extends keyof Handlers>(ev: K, fn: Handlers[K]): () => void {
  listeners[ev].add(fn);
  return () => listeners[ev].delete(fn);
}

export function emit<K extends keyof Handlers>(ev: K, ...args: Parameters<Handlers[K]>) {
  for (const fn of listeners[ev]) (fn as any)(...args);
}
