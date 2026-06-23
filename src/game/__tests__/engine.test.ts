import { describe, expect, it } from 'vitest';
import { initialState } from '../state';
import { doClick, doTick, effectiveAffinity, makeParcel, newOut, refillBench, sellAll } from '../engine';
import { benchCapacity, bodyAffinity } from '../compute';
import { settleOffline } from '../systems/offline';
import { reputationFor } from '../../data/prestige';
import { mulberry32 } from '../../lib/rng';

function withStarter() {
  const rand = mulberry32(99);
  const d = initialState();
  d.queue.push(makeParcel('envelope', rand));
  d.queue.push(makeParcel('small', rand));
  refillBench(d);
  return { d, rand };
}

describe('click unpacking', () => {
  it('reduces seal HP and eventually opens a parcel', () => {
    const { d, rand } = withStarter();
    const before = d.totalUnpacked;
    // envelope sealMax 3, nail power 1 -> 3 clicks
    for (let i = 0; i < 5; i++) doClick(d, Date.now() + i, rand, newOut());
    expect(d.totalUnpacked).toBeGreaterThan(before);
  });

  it('builds combo on rapid clicks', () => {
    const { d, rand } = withStarter();
    const t = 1000;
    doClick(d, t, rand, newOut());
    doClick(d, t + 100, rand, newOut());
    doClick(d, t + 200, rand, newOut());
    expect(d.combo).toBe(3);
  });

  it('resets combo after the window', () => {
    const { d, rand } = withStarter();
    doClick(d, 1000, rand, newOut());
    doClick(d, 1000 + 5000, rand, newOut());
    expect(d.combo).toBe(1);
  });

  it('produces loot (inventory or money) over many clicks', () => {
    const { d, rand } = withStarter();
    for (let i = 0; i < 200; i++) doClick(d, Date.now() + i * 10, rand, newOut());
    const invCount = Object.values(d.inventory).reduce((a, b) => a + b, 0);
    expect(invCount + d.collection.length).toBeGreaterThan(0);
  });
});

describe('auto unpacking via tick', () => {
  it('does nothing without auto workers but keeps delivering to queue', () => {
    const { d, rand } = withStarter();
    const unpackedBefore = d.totalUnpacked;
    for (let i = 0; i < 50; i++) doTick(d, 1, rand, newOut());
    expect(d.totalUnpacked).toBe(unpackedBefore); // no auto power
    expect(d.queue.length).toBeGreaterThan(0); // deliveries accumulate
  });

  it('auto-unpacks when workers are present', () => {
    const { d, rand } = withStarter();
    d.upgrades.autoWorker = 5;
    d.upgrades.autoPower = 5;
    for (let i = 0; i < 60; i++) doTick(d, 1, rand, newOut());
    expect(d.totalUnpacked).toBeGreaterThan(0);
  });
});

describe('selling', () => {
  it('sellAll converts inventory to money', () => {
    const { d, rand } = withStarter();
    d.upgrades.autoWorker = 8;
    d.upgrades.autoPower = 8;
    for (let i = 0; i < 80; i++) doTick(d, 1, rand, newOut());
    const moneyBefore = d.money;
    const gained = sellAll(d, null);
    expect(gained).toBeGreaterThanOrEqual(0);
    expect(d.money).toBe(moneyBefore + gained);
    // 全卖后可卖库存清空
    const remaining = Object.keys(d.inventory).length;
    expect(remaining).toBe(0);
  });
});

describe('offline settlement', () => {
  it('earns money offline when auto workers exist', () => {
    const { d, rand } = withStarter();
    d.upgrades.autoWorker = 10;
    d.upgrades.autoPower = 10;
    d.autoSellUnlocked = true;
    d.autoSellEnabled = true;
    const res = settleOffline(d, 3600, rand); // 1 hour
    expect(res.opened).toBeGreaterThan(0);
    expect(res.cash).toBeGreaterThan(0);
    expect(res.seconds).toBe(3600);
  });

  it('ignores trivially short absences', () => {
    const { d, rand } = withStarter();
    const res = settleOffline(d, 0.5, rand);
    expect(res.opened).toBe(0);
  });
});

describe('danger containers', () => {
  it('explodes (no loot) when opened with an unsafe tool', () => {
    const rand = mulberry32(7);
    const d = initialState();
    d.ownedTools = ['hand', 'grinder'];
    d.currentTool = 'grinder'; // 不安全
    d.workbench.push(
      makeParcel('crate', rand, { material: 'volatile', danger: true, sealMax: 20, lootMin: 1, lootMax: 1, pool: ['milchip'] }),
    );
    const invBefore = Object.values(d.inventory).reduce((a, b) => a + b, 0);
    // 危险品被不安全工具砸到固定 0.5 亲和度，最终会炸
    for (let i = 0; i < 200 && d.dazedUntil === 0; i++) doClick(d, Date.now() + i * 10, rand, newOut());
    expect(d.dazedUntil).toBeGreaterThan(0); // 被炸懵
    const invAfter = Object.values(d.inventory).reduce((a, b) => a + b, 0);
    expect(invAfter).toBe(invBefore); // 爆炸不产出
  });

  it('yields loot safely when opened with disarm (safe) tool', () => {
    const rand = mulberry32(7);
    const d = initialState();
    d.ownedTools = ['hand', 'disarm'];
    d.currentTool = 'disarm'; // 安全
    d.workbench.push(
      makeParcel('crate', rand, { material: 'volatile', danger: true, sealMax: 20, lootMin: 1, lootMax: 1, pool: ['milchip'] }),
    );
    for (let i = 0; i < 50 && d.totalUnpacked === 0; i++) doClick(d, Date.now() + i * 10, rand, newOut());
    expect(d.totalUnpacked).toBe(1);
    expect(d.dazedUntil).toBe(0); // 没炸
  });

  it('hollow ore can produce a 💨 letdown with no value', () => {
    const rand = () => 0; // rand()=0 < hollowChance -> 必扑空
    const d = initialState();
    d.ownedTools = ['hand', 'chisel'];
    d.currentTool = 'chisel';
    const out = newOut();
    d.workbench.push(
      makeParcel('crate', () => 0.5, { material: 'stone', hollowChance: 1, sealMax: 1, pool: ['crystal'] }),
    );
    for (let i = 0; i < 10 && d.totalUnpacked === 0; i++) doClick(d, Date.now() + i * 10, rand, out);
    expect(d.totalUnpacked).toBe(1);
    expect(d.inventory['hollow'] ?? 0).toBe(1);
  });
});

describe('prestige reputation formula', () => {
  it('rewards reputation by sqrt of earnings (millions)', () => {
    expect(reputationFor(0)).toBe(0);
    expect(reputationFor(1_000_000)).toBe(1);
    expect(reputationFor(4_000_000)).toBe(2);
    expect(reputationFor(100_000_000)).toBe(10);
  });
});

describe('mutations', () => {
  it('a danger explosion grants a mutation when pity (dangerStreak) is high', () => {
    const rand = () => 0; // 0 < chance -> 必变异；weightedPick(0) 取第一个权重项
    const d = initialState();
    d.ownedTools = ['hand', 'grinder'];
    d.currentTool = 'grinder'; // 不安全
    d.dangerStreak = 20; // 垫满，chance 封顶 0.75
    d.workbench.push(
      makeParcel('crate', () => 0.5, { material: 'volatile', danger: true, sealMax: 10, lootMin: 1, lootMax: 1, pool: ['milchip'] }),
    );
    for (let i = 0; i < 200 && d.mutations.length === 0; i++) doClick(d, Date.now() + i * 10, rand, newOut());
    expect(d.mutations.length).toBe(1); // 炸出一个变异
    expect(d.dangerStreak).toBe(0); // 变异后垫刀清零
  });

  it('a requireMutation parcel is gated without the mutation, crackable with it', () => {
    const p = makeParcel('crate', () => 0.5, { material: 'metal', sealMax: 50, requireMutation: 'brasshead', pool: ['titanium'] });
    // 无变异：任何工具都撬不动（hasRequiredMutation=false）
    expect(effectiveAffinity('press', p, 0, false)).toBe(0);
    // 有变异：肉身保证 >=2
    expect(effectiveAffinity('hand', p, 0, true)).toBeGreaterThanOrEqual(2);
  });

  it('机械臂 raises bench capacity; 铜头铁臂 grants body metal affinity', () => {
    const d = initialState();
    const base = benchCapacity(d);
    d.mutations = ['mecharm'];
    expect(benchCapacity(d)).toBe(base + 1);
    d.mutations = ['brasshead'];
    expect(bodyAffinity(d, 'metal')).toBe(1);
    // 铜头铁臂让徒手也能砸开金属（门槛消失）
    const metalBox = makeParcel('crate', () => 0.5, { material: 'metal', sealMax: 50, pool: ['titanium'] });
    expect(effectiveAffinity('hand', metalBox, bodyAffinity(d, 'metal'), true)).toBe(1);
  });

  it('does not mutate but raises dangerStreak when the roll fails', () => {
    const rand = () => 0.99; // 0.99 >= chance -> 不变异
    const d = initialState();
    d.ownedTools = ['hand', 'grinder'];
    d.currentTool = 'grinder';
    d.workbench.push(
      makeParcel('crate', () => 0.5, { material: 'volatile', danger: true, sealMax: 10, lootMin: 1, lootMax: 1, pool: ['milchip'] }),
    );
    for (let i = 0; i < 200 && d.dazedUntil === 0; i++) doClick(d, Date.now() + i * 10, rand, newOut());
    expect(d.mutations.length).toBe(0);
    expect(d.dangerStreak).toBe(1); // 未变异 -> 垫刀 +1
  });
});
