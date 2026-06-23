import { describe, expect, it } from 'vitest';
import { initialState } from '../state';
import { doTick, makeParcel, newOut } from '../engine';

/**
 * 回归：自动线在「积压里有该材质、但被变异门锁住打不开」时，
 * 计时器不应无界累积（否则玩家拿到变异后会一次性爆拆一大堆）。
 */
describe('autoline accumulator cap on mutation-gated backlog', () => {
  it('空转在被变异门锁住的货上时，deviceAccum 被封顶', () => {
    const d = initialState();
    d.devices = { autoline_metal: 1 };
    d.deviceAccum = {};
    // 一个金属、但需要 brasshead 变异才能开的积压货（玩家没有该变异）
    d.backlog = [
      makeParcel('crate', () => 0.5, {
        material: 'metal',
        sealMax: 9999,
        requireMutation: 'brasshead',
        label: '真空压缩块',
      }),
    ];
    const out = newOut();
    // 跑很久
    for (let i = 0; i < 300; i++) doTick(d, 1, () => 0.5, out);

    // 货还在（打不开），且计时器没有爆炸式累积
    expect(d.backlog.length).toBe(1);
    expect(d.deviceAccum['autoline_metal']).toBeLessThanOrEqual(60);
  });
});
