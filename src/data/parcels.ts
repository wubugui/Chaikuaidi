import type { ParcelSizeDef, ParcelSizeId } from './types';

export const PARCEL_SIZES: ParcelSizeDef[] = [
  { id: 'envelope', name: '信封', emoji: '✉️', sealMax: 3, lootMin: 1, lootMax: 1, unlockStage: 1 },
  { id: 'small', name: '小纸箱', emoji: '📦', sealMax: 8, lootMin: 1, lootMax: 1, unlockStage: 1 },
  { id: 'standard', name: '标准箱', emoji: '📫', sealMax: 20, lootMin: 1, lootMax: 2, unlockStage: 1 },
  { id: 'reinforced', name: '加固箱', emoji: '🗳️', sealMax: 60, lootMin: 2, lootMax: 3, unlockStage: 2 },
  { id: 'crate', name: '木箱', emoji: '🧰', sealMax: 200, lootMin: 3, lootMax: 5, unlockStage: 3 },
  { id: 'container', name: '集装箱', emoji: '🚛', sealMax: 1000, lootMin: 10, lootMax: 20, unlockStage: 4 },
];

export const PARCEL_MAP: Record<ParcelSizeId, ParcelSizeDef> = Object.fromEntries(
  PARCEL_SIZES.map((p) => [p.id, p]),
) as Record<ParcelSizeId, ParcelSizeDef>;

/** 当前阶段可自然到货的快递规格（取已解锁里偏后几档，制造成长感） */
export function deliverableSizes(stage: number): ParcelSizeDef[] {
  return PARCEL_SIZES.filter((p) => p.unlockStage <= stage);
}
