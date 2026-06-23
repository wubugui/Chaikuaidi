import { describe, expect, it } from 'vitest';
import { initialState } from '../state';
import { doClick, makeParcel, newOut, refillBench } from '../engine';
import { mulberry32 } from '../../lib/rng';

describe('open-box reveal data', () => {
  it('emits a reveal per opened parcel with its loot items', () => {
    const rand = mulberry32(42);
    const d = initialState();
    d.queue.push(makeParcel('envelope', rand)); // sealMax 3, nail power 1
    refillBench(d);

    const out = newOut();
    // 砸到拆开
    for (let i = 0; i < 6 && out.reveals.length === 0; i++) {
      doClick(d, 1000 + i * 50, rand, out);
    }
    expect(out.reveals.length).toBeGreaterThanOrEqual(1);
    const r = out.reveals[0];
    expect(r.items.length).toBeGreaterThanOrEqual(1);
    expect(r.parcelName).toBeTruthy();
    expect(['common', 'rare', 'epic', 'legendary', 'absurd']).toContain(r.topRarity);
    // 每件战利品都有展示所需字段
    for (const it of r.items) {
      expect(it.emoji).toBeTruthy();
      expect(it.name).toBeTruthy();
      expect(typeof it.value).toBe('number');
    }
  });
});
