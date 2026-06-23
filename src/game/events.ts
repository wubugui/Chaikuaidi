import type { Rarity } from '../data/types';

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

type Handlers = {
  loot: (b: LootBurst) => void;
  float: (f: FloatText) => void;
  open: () => void;
  shake: () => void;
};

const listeners: { [K in keyof Handlers]: Set<Handlers[K]> } = {
  loot: new Set(),
  float: new Set(),
  open: new Set(),
  shake: new Set(),
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
