import { describe, expect, it } from 'vitest';
import { initialState, factoryUsed, factoryFree, type GameState } from '../state';
import { doTick, effectiveAffinity, makeParcel, newOut } from '../engine';
import { GIANT_MAP, FACTORY_BASE_SPACE, factoryExpandCost } from '../../data/giants';
import { TOOLS } from '../../data/tools';
import { PARTS } from '../../data/items';
import { mulberry32 } from '../../lib/rng';
import { useGame } from '../store';

const RAW_IDS = ['r_scrapiron', 'r_wireharness', 'r_alloyblock', 'r_plastic'];

function freshStore(over: Partial<GameState> = {}) {
  useGame.setState({ ...initialState(), offline: null } as any);
  useGame.setState(over as any);
}

describe('giant hard gate (拆卸管线专属)', () => {
  it('a giant parcel has effectiveAffinity === 0 for every tool', () => {
    const giant = makeParcel('container', () => 0.5, {
      material: 'metal', requirePipeline: 'pipeline_auto', sealMax: 1000, lootMin: 1, lootMax: 1,
    });
    for (const t of TOOLS) {
      // 即便代入肉身亲和度 / 满足变异，巨型货门仍为 0（最高优先级）
      expect(effectiveAffinity(t.id, giant, 99, true)).toBe(0);
    }
  });

  it('loadFromBacklog refuses a giant (pipeline-only)', () => {
    const g = makeParcel('container', () => 0.5, {
      material: 'metal', requirePipeline: 'pipeline_auto', sealMax: 1000, lootMin: 1, lootMax: 1, space: 2,
    });
    g.id = 4242;
    freshStore({ backlog: [g], workbench: [] });
    useGame.getState().loadFromBacklog(4242);
    expect(useGame.getState().workbench.length).toBe(0);
    expect(useGame.getState().backlog.length).toBe(1);
  });
});

describe('factory space accounting + buyGiant', () => {
  it('factoryUsed counts giants in backlog and pipeline devices', () => {
    const g = makeParcel('container', () => 0.5, {
      material: 'metal', requirePipeline: 'pipeline_auto', space: 2,
    });
    const s = { ...initialState(), backlog: [g], devices: { pipeline_auto: 1 } } as GameState;
    // 2 (giant) + 2 (pipeline_auto occupies 2) = 4
    expect(factoryUsed(s)).toBe(4);
  });

  it('buyGiant rejects when factory is full, succeeds after expandFactory', () => {
    const car = GIANT_MAP['g_car'];
    // base space 4; fill 3 so only 1 free (< car.space 2) -> reject
    const filler = makeParcel('container', () => 0.5, {
      material: 'metal', requirePipeline: 'pipeline_auto', space: 3, label: 'filler',
    });
    freshStore({ money: 10_000_000, stage: 4, backlog: [filler], factorySpace: FACTORY_BASE_SPACE });
    expect(factoryFree(useGame.getState())).toBe(1);
    useGame.getState().buyGiant('g_car');
    // still only the filler — no space
    expect(useGame.getState().backlog.filter((p) => p.label === car.name).length).toBe(0);

    // expand and retry
    const before = useGame.getState().money;
    const cost = factoryExpandCost(useGame.getState().factorySpace);
    useGame.getState().expandFactory();
    expect(useGame.getState().factorySpace).toBe(FACTORY_BASE_SPACE + 2);
    expect(useGame.getState().money).toBe(before - cost);
    useGame.getState().buyGiant('g_car');
    expect(useGame.getState().backlog.some((p) => p.label === car.name)).toBe(true);
  });

  it('buyGiant is gated by stage and money', () => {
    freshStore({ money: 100, stage: 1, factorySpace: 20 });
    useGame.getState().buyGiant('g_car'); // too poor + too early
    expect(useGame.getState().backlog.length).toBe(0);
  });

  it('merchantOnly giants cannot be bought via buyGiant', () => {
    freshStore({ money: 100_000_000, stage: 4, factorySpace: 50 });
    useGame.getState().buyGiant('g_ship');
    expect(useGame.getState().backlog.length).toBe(0);
  });
});

describe('pipeline auto-dismantle', () => {
  it('building pipeline_auto then ticking dismantles a g_car, drops backlog, frees space, makes parts/raw', () => {
    const rand = mulberry32(42);
    const d = initialState();
    d.devices = { pipeline_auto: 1 };
    d.deviceAccum = {};
    const car = GIANT_MAP['g_car'];
    d.backlog.push(makeParcel('container', rand, {
      material: car.material, emoji: car.emoji, label: car.name, sealMax: car.sealMax,
      lootMin: car.lootMin, lootMax: car.lootMax, luckBonus: car.luckBonus, pool: car.pool,
      requirePipeline: car.requirePipeline, partBonus: car.partBonus, space: car.space,
    }));
    // 占用 = 汽车(2) + 已建轻型管线(2)
    expect(factoryUsed(d)).toBe(car.space + 2);

    const out = newOut();
    for (let i = 0; i < 20 && d.backlog.length > 0; i++) doTick(d, 1, rand, out);

    expect(d.backlog.length).toBe(0); // car dismantled
    expect(factoryUsed(d)).toBe(2); // 汽车腾出，管线仍占 2
    expect(d.totalUnpacked).toBeGreaterThan(0);
    // produced a pile of parts and/or raw materials
    const partCount = PARTS.reduce((a, p) => a + (d.inventory[p.id] ?? 0), 0);
    const rawCount = RAW_IDS.reduce((a, id) => a + (d.inventory[id] ?? 0), 0);
    expect(partCount + rawCount).toBeGreaterThan(0);
  });

  it('a pipeline ignores giants requiring a different pipeline', () => {
    const rand = mulberry32(7);
    const d = initialState();
    d.devices = { pipeline_auto: 1 };
    // ship needs pipeline_heavy — auto line must leave it
    d.backlog.push(makeParcel('container', rand, {
      material: 'metal', requirePipeline: 'pipeline_heavy', sealMax: 1000, lootMin: 1, lootMax: 1, space: 4,
    }));
    for (let i = 0; i < 30; i++) doTick(d, 1, rand, newOut());
    expect(d.backlog.some((p) => p.requirePipeline === 'pipeline_heavy')).toBe(true);
  });
});
