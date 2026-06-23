import { describe, expect, it } from 'vitest';
import { rollItem, sellValue } from '../systems/loot';
import { ITEM_MAP } from '../../data/items';
import { mulberry32 } from '../../lib/rng';
import type { Rarity } from '../../data/types';

function sample(luck: number, n: number) {
  const rand = mulberry32(12345);
  const counts: Record<Rarity, number> = { common: 0, rare: 0, epic: 0, legendary: 0, absurd: 0 };
  for (let i = 0; i < n; i++) {
    const r = rollItem({ luck }, rand);
    counts[r.rarity]++;
    expect(r.item).toBeTruthy();
  }
  return counts;
}

describe('loot rarity distribution', () => {
  it('common dominates with no luck', () => {
    const c = sample(0, 20000);
    expect(c.common).toBeGreaterThan(c.rare);
    expect(c.rare).toBeGreaterThan(c.epic);
    expect(c.epic).toBeGreaterThan(c.legendary);
    // 普通约 70%
    expect(c.common / 20000).toBeGreaterThan(0.6);
    expect(c.common / 20000).toBeLessThan(0.8);
  });

  it('luck shifts distribution toward higher rarity', () => {
    const base = sample(0, 20000);
    const lucky = sample(3, 20000);
    const baseHigh = (base.epic + base.legendary + base.absurd) / 20000;
    const luckyHigh = (lucky.epic + lucky.legendary + lucky.absurd) / 20000;
    expect(luckyHigh).toBeGreaterThan(baseHigh);
  });

  it('always returns a valid item from the map', () => {
    const rand = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const r = rollItem({ luck: 1 }, rand);
      expect(ITEM_MAP[r.item.id]).toBeDefined();
      expect(r.item.rarity).toBe(r.rarity);
    }
  });
});

describe('sellValue', () => {
  it('scales by rarity multiplier', () => {
    const socks = ITEM_MAP['socks']; // baseValue 2, common x1
    expect(sellValue(socks, 'common', 0)).toBe(2);
    expect(sellValue(socks, 'rare', 0)).toBe(16); // x8
    expect(sellValue(socks, 'epic', 0)).toBe(80); // x40
  });

  it('applies sell bonus', () => {
    const socks = ITEM_MAP['socks'];
    expect(sellValue(socks, 'common', 0.5)).toBe(3); // 2 * 1.5
  });

  it('collectibles are worth 0 on direct sale', () => {
    const snail = ITEM_MAP['snail'];
    expect(sellValue(snail, 'rare', 0)).toBe(0);
  });
});
