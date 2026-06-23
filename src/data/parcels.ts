import type { ParcelSizeDef, ParcelSizeId } from './types';

export const PARCEL_SIZES: ParcelSizeDef[] = [
  { id:'envelope',  name:'信封',   emoji:'✉️', material:'paper', sealMax:3,    lootMin:1, lootMax:1, unlockStage:1 },
  { id:'small',     name:'小纸箱', emoji:'📦', material:'paper', sealMax:6,    lootMin:1, lootMax:1, unlockStage:1 },
  { id:'standard',  name:'标准箱', emoji:'📫', material:'paper', sealMax:18,   lootMin:1, lootMax:2, unlockStage:1 },
  { id:'reinforced',name:'加固木箱',emoji:'🗳️', material:'wood',  sealMax:70,   lootMin:2, lootMax:2, unlockStage:2 },
  { id:'crate',     name:'木箱',   emoji:'🧰', material:'wood',  sealMax:240,  lootMin:2, lootMax:3, unlockStage:3 },
  { id:'container', name:'集装箱', emoji:'🚛', material:'metal', sealMax:1200, lootMin:3, lootMax:5, unlockStage:4 },
];

export const PARCEL_MAP: Record<ParcelSizeId, ParcelSizeDef> = Object.fromEntries(
  PARCEL_SIZES.map((p) => [p.id, p]),
) as Record<ParcelSizeId, ParcelSizeDef>;

/** 当前阶段可自然到货的快递规格（取已解锁里偏后几档，制造成长感） */
export function deliverableSizes(stage: number): ParcelSizeDef[] {
  return PARCEL_SIZES.filter((p) => p.unlockStage <= stage);
}
