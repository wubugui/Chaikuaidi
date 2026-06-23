import type { Rarity } from './types';

export interface RarityDef {
  id: Rarity;
  name: string;
  weight: number; // 基础权重
  sellMult: number; // 售价倍率
  color: string; // CSS 颜色
  badge: string; // 角标 emoji
}

export const RARITIES: Record<Rarity, RarityDef> = {
  common: { id: 'common', name: '普通', weight: 70, sellMult: 1, color: '#9aa4b2', badge: '⚪' },
  rare: { id: 'rare', name: '稀有', weight: 20, sellMult: 8, color: '#3b82f6', badge: '🔵' },
  epic: { id: 'epic', name: '史诗', weight: 7, sellMult: 40, color: '#a855f7', badge: '🟣' },
  legendary: { id: 'legendary', name: '传说', weight: 2.5, sellMult: 200, color: '#f59e0b', badge: '🟡' },
  absurd: { id: 'absurd', name: '离谱', weight: 0.5, sellMult: 2000, color: '#ec4899', badge: '🌈' },
};

export const RARITY_ORDER: Rarity[] = ['common', 'rare', 'epic', 'legendary', 'absurd'];

export function rarityRank(r: Rarity): number {
  return RARITY_ORDER.indexOf(r);
}
