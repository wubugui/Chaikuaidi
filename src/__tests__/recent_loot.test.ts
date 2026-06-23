import { describe, expect, it } from 'vitest';
import { makeParcel, newOut, openParcel } from '../game/engine';
import { initialState, RECENT_LOOT_CAP } from '../game/state';
import { rarityRank } from '../data/rarity';

/** 开一件「主题池只含某 id」的快递：rand 控制稀有度落点 */
function openWithPool(itemId: string, rand: () => number) {
  const d = initialState();
  const out = newOut();
  const p = makeParcel('small', () => 0.5, { pool: [itemId], lootMin: 1, lootMax: 1, material: 'paper' });
  openParcel(d, p, rand, out);
  return d;
}

describe('P7 最近获得 recentLoot', () => {
  it('开出离谱(absurd)可卖品记入 recentLoot（最新在前）', () => {
    // rand≈1 → 稀有度落到最后一档(absurd)，主题池只含 diamond(absurd)，零件 roll 失败
    const d = openWithPool('diamond', () => 0.999);
    expect(d.recentLoot.length).toBeGreaterThanOrEqual(1);
    expect(d.recentLoot[0].itemId).toBe('diamond');
    expect(rarityRank(d.recentLoot[0].rarity)).toBeGreaterThanOrEqual(rarityRank('rare'));
  });

  it('只出普通货时不记入 recentLoot', () => {
    // rand=0.5 → 普通档(common)，主题池只含 socks(common)，rollPart(0.5>=chance) 不出零件
    const d = openWithPool('socks', () => 0.5);
    expect(d.recentLoot.length).toBe(0);
  });

  it('hollow(💨) 扑空不记入 recentLoot', () => {
    const d = initialState();
    const out = newOut();
    // hollowChance=1 → 必扑空，applyLoot('common','hollow') 不该被记
    const p = makeParcel('small', () => 0.5, { hollowChance: 1, material: 'paper' });
    openParcel(d, p, () => 0.001, out);
    expect(d.recentLoot.length).toBe(0);
  });

  it('封顶 12 条且最新在前', () => {
    const d = initialState();
    // 直接灌入 13 条，验证 cap 行为通过 openParcel 累计
    for (let i = 0; i < 15; i++) {
      const out = newOut();
      const p = makeParcel('small', () => 0.5, { pool: ['diamond'], lootMin: 1, lootMax: 1, material: 'paper' });
      openParcel(d, p, () => 0.999, out);
    }
    expect(d.recentLoot.length).toBe(RECENT_LOOT_CAP);
    expect(d.recentLoot.length).toBeLessThanOrEqual(12);
    expect(d.recentLoot[0].itemId).toBe('diamond');
  });

  it('recentLoot 默认值在持久化/迁移中存在', () => {
    expect(initialState().recentLoot).toEqual([]);
  });
});
