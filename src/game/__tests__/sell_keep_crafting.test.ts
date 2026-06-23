import { describe, expect, it } from 'vitest';
import { initialState } from '../state';
import { sellAll, sellOne } from '../engine';

/**
 * 「全卖」必须保留零件/元素（合成原料），否则随手清背包会打断终局闭环。
 * 但单件卖出（背包里手动卖）仍允许处理零件/元素。
 */
describe('sellAll 保留合成原料', () => {
  it('全卖只清掉可卖战利品，零件/元素原样保留', () => {
    const d = initialState();
    d.inventory = {
      socks: 5,       // 可卖战利品
      gpu: 1,         // 可卖战利品（高价）
      p_servo: 3,     // 零件
      e_uranium: 2,   // 元素
      r_scrapiron: 9, // 原料（材料类，仍可卖）
    };
    const got = sellAll(d, null);
    expect(got).toBeGreaterThan(0);
    // 战利品被清掉
    expect(d.inventory['socks']).toBeUndefined();
    expect(d.inventory['gpu']).toBeUndefined();
    // 合成原料原样保留
    expect(d.inventory['p_servo']).toBe(3);
    expect(d.inventory['e_uranium']).toBe(2);
  });

  it('单件卖出仍可处理零件（玩家显式选择卖）', () => {
    const d = initialState();
    d.inventory = { p_servo: 2 };
    const v = sellOne(d, 'p_servo');
    expect(v).toBeGreaterThanOrEqual(0);
    expect(d.inventory['p_servo']).toBe(1);
  });
});
