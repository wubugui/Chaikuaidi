import { describe, expect, it } from 'vitest';
import { initialState, type GameState } from '../state';
import {
  doTick, effectiveAffinity, makeParcel, newOut, manualRefine, forceOpenWithOrdnance,
} from '../engine';
import { ABSURD_MAP } from '../../data/absurd';
import { TOOLS } from '../../data/tools';
import { ELEMENTS } from '../../data/items';
import { MUTATIONS } from '../../data/mutations';
import { mulberry32 } from '../../lib/rng';
import { useGame } from '../store';

function freshStore(over: Partial<GameState> = {}) {
  useGame.setState({ ...initialState(), offline: null } as any);
  useGame.setState(over as any);
}

describe('元素提炼', () => {
  it('manual refine rf_iron consumes 3 废铁 → 1 铁', () => {
    const d = initialState();
    d.inventory = { r_scrapiron: 3 };
    const ok = manualRefine(d, 'rf_iron');
    expect(ok).toBe(true);
    expect(d.inventory.r_scrapiron ?? 0).toBe(0);
    expect(d.inventory.e_iron).toBe(1);
  });

  it('manual refine fails without enough inputs (no negative inventory)', () => {
    const d = initialState();
    d.inventory = { r_scrapiron: 2 };
    const ok = manualRefine(d, 'rf_iron');
    expect(ok).toBe(false);
    expect(d.inventory.r_scrapiron).toBe(2);
    expect(d.inventory.e_iron ?? 0).toBe(0);
  });

  it('tier2 rf_uranium requires a built refinery', () => {
    const d = initialState();
    d.inventory = { e_rare: 2, e_titanium: 2 };
    // 无提炼炉：拒绝
    expect(manualRefine(d, 'rf_uranium')).toBe(false);
    expect(d.inventory.e_uranium ?? 0).toBe(0);
    // 建好提炼炉后可跑
    d.devices = { refinery: 1 };
    expect(manualRefine(d, 'rf_uranium')).toBe(true);
    expect(d.inventory.e_uranium).toBe(1);
    expect(d.inventory.e_rare ?? 0).toBe(0);
    expect(d.inventory.e_titanium ?? 0).toBe(0);
  });

  it('a built refinery auto-produces elements over ticks from raw materials', () => {
    const rand = mulberry32(1);
    const d = initialState();
    d.devices = { refinery: 1 };
    d.deviceEnabled = { refinery: true };
    d.deviceAccum = {};
    d.inventory = { r_scrapiron: 30, r_alloyblock: 20, r_plastic: 10, p_circuit: 5 };
    const out = newOut();
    for (let i = 0; i < 20; i++) doTick(d, 1, rand, out);
    const elemTotal = ELEMENTS.reduce((a, e) => a + (d.inventory[e.id] ?? 0), 0);
    expect(elemTotal).toBeGreaterThan(0);
    // 没有负库存
    for (const k of Object.keys(d.inventory)) expect(d.inventory[k]).toBeGreaterThanOrEqual(0);
  });
});

describe('军火合成', () => {
  it('crafting bp_nuke consumes elements/parts → ordnance.nuke == 1', () => {
    freshStore({
      money: 10_000_000,
      stage: 4,
      blueprints: ['bp_nuke'],
      inventory: { e_uranium: 2, e_titanium: 3, p_circuit: 4 },
    });
    useGame.getState().craftBlueprint('bp_nuke');
    const s = useGame.getState();
    expect(s.ordnance.nuke).toBe(1);
    expect(s.inventory.e_uranium ?? 0).toBe(0);
    expect(s.inventory.e_titanium ?? 0).toBe(0);
    expect(s.inventory.p_circuit ?? 0).toBe(0);
  });

  it('craft refused without inputs', () => {
    freshStore({ money: 10_000_000, stage: 4, blueprints: ['bp_nuke'], inventory: {} });
    useGame.getState().craftBlueprint('bp_nuke');
    expect(useGame.getState().ordnance.nuke ?? 0).toBe(0);
  });
});

describe('离谱货硬门 + 轰开闭环', () => {
  it('an absurd good has effectiveAffinity === 0 for every tool', () => {
    const ufo = makeParcel('container', () => 0.5, {
      material: 'anomaly', requireOrdnance: 'nuke', sealMax: 1000, lootMin: 1, lootMax: 1,
    });
    for (const t of TOOLS) {
      expect(effectiveAffinity(t.id, ufo, 99, true)).toBe(0);
    }
  });

  it('loadFromBacklog refuses an absurd good (ordnance-only)', () => {
    const ufo = makeParcel('container', () => 0.5, {
      material: 'anomaly', requireOrdnance: 'nuke', sealMax: 1000, lootMin: 1, lootMax: 1, space: 4,
    });
    ufo.id = 9911;
    freshStore({ backlog: [ufo], workbench: [] });
    useGame.getState().loadFromBacklog(9911);
    expect(useGame.getState().workbench.length).toBe(0);
    expect(useGame.getState().backlog.length).toBe(1);
  });

  it('useOrdnance consumes the nuke, opens the UFO (loot to inventory/cash), frees space, can mutate', () => {
    const ufoDef = ABSURD_MAP['a_ufo'];
    const ufo = makeParcel('container', () => 0.5, {
      material: ufoDef.material, label: ufoDef.name, requireOrdnance: ufoDef.requireOrdnance,
      sealMax: ufoDef.sealMax, lootMin: ufoDef.lootMin, lootMax: ufoDef.lootMax,
      luckBonus: ufoDef.luckBonus, pool: ufoDef.pool, partBonus: ufoDef.partBonus, space: ufoDef.space,
    });
    ufo.id = 7777;
    freshStore({
      backlog: [ufo],
      ordnance: { nuke: 1 },
      factorySpace: 10,
      stage: 4,
    });
    // 轰开前占了厂房空间
    const before = useGame.getState();
    const usedBefore = ufoDef.space;
    expect(usedBefore).toBeGreaterThan(0);
    void before;

    useGame.getState().useOrdnance(7777);
    const s = useGame.getState();
    // 军火被消耗
    expect(s.ordnance.nuke ?? 0).toBe(0);
    // 离谱货离开积压区（厂房空间被腾出）
    expect(s.backlog.length).toBe(0);
    // 产出：库存或现金有增长
    const invCount = Object.values(s.inventory).reduce((a, n) => a + n, 0);
    expect(invCount + s.money + s.collection.length).toBeGreaterThan(0);
    expect(s.totalUnpacked).toBeGreaterThan(0);
  });

  it('forceOpenWithOrdnance can grant a mutation with a forced RNG', () => {
    const d = initialState();
    d.mutations = [];
    const ufo = makeParcel('container', () => 0.5, {
      material: 'anomaly', requireOrdnance: 'nuke', sealMax: 1000, lootMin: 2, lootMax: 2,
      pool: ['e_rare', 'e_uranium'],
    });
    // rand 始终返回 0 → 一定低于 0.6 的变异阈值 → 必变异
    const rand = () => 0;
    const out = newOut();
    const mutated = forceOpenWithOrdnance(d, ufo, rand, out);
    expect(mutated).toBe(true);
    expect(d.mutations.length).toBe(1);
    expect(MUTATIONS.some((m) => m.id === d.mutations[0])).toBe(true);
  });

  it('useOrdnance refuses when no matching ordnance owned', () => {
    const ufo = makeParcel('container', () => 0.5, {
      material: 'anomaly', requireOrdnance: 'nuke', sealMax: 1000, lootMin: 1, lootMax: 1, space: 4,
    });
    ufo.id = 5555;
    freshStore({ backlog: [ufo], ordnance: {}, factorySpace: 10 });
    useGame.getState().useOrdnance(5555);
    expect(useGame.getState().backlog.length).toBe(1);
  });
});

describe('makeParcel 2-arg 仍可用', () => {
  it('makeParcel(size, rand) works without opts', () => {
    const p = makeParcel('small', () => 0.5);
    expect(p.size).toBe('small');
    expect(p.requireOrdnance).toBeUndefined();
  });
});
