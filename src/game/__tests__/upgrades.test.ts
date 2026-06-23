import { describe, expect, it } from 'vitest';
import { UPGRADE_MAP, upgradeBulkCost, upgradeCost } from '../../data/upgrades';
import { stageForEarned } from '../../data/stages';

describe('upgrade costs', () => {
  it('grows geometrically', () => {
    const def = UPGRADE_MAP.clickPower; // base 30, growth 1.15
    expect(upgradeCost(def, 0)).toBe(30);
    expect(upgradeCost(def, 1)).toBe(Math.ceil(30 * 1.15));
    expect(upgradeCost(def, 2)).toBe(Math.ceil(30 * 1.15 * 1.15));
  });

  it('bulk cost equals sum of individual levels', () => {
    const def = UPGRADE_MAP.clickPower;
    const manual = upgradeCost(def, 0) + upgradeCost(def, 1) + upgradeCost(def, 2);
    expect(upgradeBulkCost(def, 0, 3)).toBe(manual);
  });
});

describe('stage thresholds', () => {
  it('maps cumulative earnings to stage', () => {
    expect(stageForEarned(0)).toBe(1);
    expect(stageForEarned(999)).toBe(1);
    expect(stageForEarned(1000)).toBe(2);
    expect(stageForEarned(50000)).toBe(3);
    expect(stageForEarned(1_000_000)).toBe(4);
    expect(stageForEarned(9_999_999_999)).toBe(4);
  });
});
