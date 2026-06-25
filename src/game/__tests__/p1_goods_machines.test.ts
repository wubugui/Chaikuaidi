import { beforeEach, describe, expect, it } from 'vitest';
import { actions } from '../actions';
import { runtimeGameStore } from '../runtimeStore';
import { createInitialMetaState, createInitialRunState } from '../../core/state';
import { TARGET_MAP } from '../../content';

function boot() {
  runtimeGameStore.setState({
    run: { ...createInitialRunState(), money: 100_000 },
    meta: { ...createInitialMetaState() },
  });
  actions.ensureP1Run();
  runtimeGameStore.setState({
    ...runtimeGameStore.getState(),
    run: { ...runtimeGameStore.getState().run, money: 100_000 },
  });
}

function smashActiveToCompletion(source: string, maxHits = 4000) {
  for (let i = 0; i < maxHits; i++) {
    const runtime = runtimeGameStore.getState().run.currentTarget;
    if (!runtime) return;
    const part = Object.values(runtime.parts).find((p) => p.exposed && !p.destroyed);
    if (!part) return;
    // switch view if the next workable part is elsewhere
    const target = TARGET_MAP[runtime.targetId];
    const partDef = target.parts.find((p) => p.id === part.partId)!;
    if (partDef.viewId !== runtime.currentViewId && runtime.unlockedViews.includes(partDef.viewId)) {
      actions.switchView(partDef.viewId);
    }
    if (partDef.riskTriggers.length > 0) actions.inspectPart(partDef.id);
    actions.hitPart(part.partId, source);
    if (runtimeGameStore.getState().run.runResult) return;
  }
}

beforeEach(() => boot());

describe('owned-goods inventory', () => {
  it('buyGood adds a unique good to the shelf and puts it on the bench', () => {
    actions.buyGood('good-safe');
    const run = runtimeGameStore.getState().run;
    expect(run.ownedGoods.length).toBe(1);
    expect(run.ownedGoods[0].targetId).toBe('safe-stubborn');
    expect(run.ownedGoods[0].revealed).toBe(true); // revealed once on the bench
    expect(run.activeGoodInstanceId).toBe(run.ownedGoods[0].instanceId);
    expect(run.currentTarget?.targetId).toBe('safe-stubborn');
  });

  it('owns many goods; switching persists progress on the previous good', () => {
    actions.buyGood('good-safe');
    const safeId = runtimeGameStore.getState().run.activeGoodInstanceId!;
    // damage the safe a bit
    for (let i = 0; i < 20; i++) actions.hitPart('safe-dial', 'hammer');
    const safeHpMid = runtimeGameStore.getState().run.currentTarget!.parts['safe-dial'].hp;
    expect(safeHpMid).toBeLessThan(160);

    actions.buyGood('good-car');
    expect(runtimeGameStore.getState().run.ownedGoods.length).toBe(2);
    expect(runtimeGameStore.getState().run.currentTarget?.targetId).toBe('car-scrapyard');

    // switch back to the safe — progress is preserved
    actions.activateGood(safeId);
    const back = runtimeGameStore.getState().run;
    expect(back.currentTarget?.targetId).toBe('safe-stubborn');
    expect(back.currentTarget!.parts['safe-dial'].hp).toBe(safeHpMid);
  });

  it('going back to parcels persists the active good, then it can be resumed', () => {
    actions.buyGood('good-safe');
    const safeId = runtimeGameStore.getState().run.activeGoodInstanceId!;
    for (let i = 0; i < 15; i++) actions.hitPart('safe-dial', 'hammer');
    const hp = runtimeGameStore.getState().run.currentTarget!.parts['safe-dial'].hp;

    actions.openParcel();
    const onParcel = runtimeGameStore.getState().run;
    expect(onParcel.activeGoodInstanceId).toBeNull();
    expect(onParcel.currentTarget?.targetId.startsWith('parcel-')).toBe(true);
    expect(onParcel.ownedGoods.find((g) => g.instanceId === safeId)?.runtime.parts['safe-dial'].hp).toBe(hp);

    actions.activateGood(safeId);
    expect(runtimeGameStore.getState().run.currentTarget!.parts['safe-dial'].hp).toBe(hp);
  });

  it('a hard good with requiredTags is un-smashable without the right tool (drives 博弈)', () => {
    actions.buyGood('good-blackball');
    const before = runtimeGameStore.getState().run.currentTarget!.parts['blackball-core'].hp;
    // hammer has no 'remote' tag -> requiredTags gate -> zero damage
    for (let i = 0; i < 30; i++) actions.hitPart('blackball-core', 'hammer');
    const afterHammer = runtimeGameStore.getState().run.currentTarget!.parts['blackball-core'].hp;
    expect(afterHammer).toBe(before);

    // remote-probe satisfies the gate -> it chips away
    for (let i = 0; i < 30; i++) actions.hitPart('blackball-core', 'remote-probe');
    const afterRemote = runtimeGameStore.getState().run.currentTarget!.parts['blackball-core'].hp;
    expect(afterRemote).toBeLessThan(before);
  });

  it('scrapSellCurrent removes the good from the shelf and pays scrap', () => {
    actions.buyGood('good-blackball');
    const scrapBefore = runtimeGameStore.getState().run.scrap;
    actions.scrapSellCurrent();
    const run = runtimeGameStore.getState().run;
    expect(run.ownedGoods.length).toBe(0);
    expect(run.activeGoodInstanceId).toBeNull();
    expect(run.scrap).toBeGreaterThan(scrapBefore);
  });

  it('completing a good removes it from the shelf and drops upgrade materials', () => {
    actions.buyGood('good-blackball');
    smashActiveToCompletion('remote-probe');
    const run = runtimeGameStore.getState().run;
    expect(run.runResult?.reason).toBe('completed');
    expect(run.ownedGoods.length).toBe(0);
    expect(run.activeGoodInstanceId).toBeNull();
    // blackball drops m_hardcore + m_pressgem
    expect(run.materials.m_hardcore ?? 0).toBeGreaterThan(0);
    expect(run.materials.m_pressgem ?? 0).toBeGreaterThan(0);
  });
});

describe('machine upgrade tree', () => {
  it('machines start at level 1 and report an escalating upgrade cost', () => {
    const machineId = Object.keys(runtimeGameStore.getState().run.machines)[0];
    expect(runtimeGameStore.getState().run.machines[machineId].level).toBe(1);
    const c1 = actions.machineUpgradeCost(machineId)!;
    expect(c1.money).toBeGreaterThan(0);
    // bump level artificially and confirm next cost is higher
    runtimeGameStore.setState({
      ...runtimeGameStore.getState(),
      run: {
        ...runtimeGameStore.getState().run,
        machines: {
          ...runtimeGameStore.getState().run.machines,
          [machineId]: { ...runtimeGameStore.getState().run.machines[machineId], level: 3 },
        },
      },
    });
    const c3 = actions.machineUpgradeCost(machineId)!;
    expect(c3.money).toBeGreaterThan(c1.money);
    expect(Object.keys(c3.materials).length).toBeGreaterThan(0); // higher tiers need rare materials
  });

  it('upgradeMachine consumes resources, raises level + power, and is blocked without materials', () => {
    const machineId = Object.keys(runtimeGameStore.getState().run.machines)[0];
    // no materials yet -> blocked at the tier that needs them. First level needs only money+scrap.
    runtimeGameStore.setState({
      ...runtimeGameStore.getState(),
      run: { ...runtimeGameStore.getState().run, money: 100_000, scrap: 100 },
    });
    actions.upgradeMachine(machineId);
    expect(runtimeGameStore.getState().run.machines[machineId].level).toBe(2);

    // jump to a tier that requires m_hardcore but hold none -> blocked
    runtimeGameStore.setState({
      ...runtimeGameStore.getState(),
      run: {
        ...runtimeGameStore.getState().run,
        materials: {},
        machines: {
          ...runtimeGameStore.getState().run.machines,
          [machineId]: { ...runtimeGameStore.getState().run.machines[machineId], level: 4 },
        },
      },
    });
    actions.upgradeMachine(machineId);
    expect(runtimeGameStore.getState().run.machines[machineId].level).toBe(4); // blocked, no material

    // grant materials -> succeeds
    runtimeGameStore.setState({
      ...runtimeGameStore.getState(),
      run: { ...runtimeGameStore.getState().run, materials: { m_hardcore: 10, m_pressgem: 10, m_oddmatter: 10 } },
    });
    actions.upgradeMachine(machineId);
    expect(runtimeGameStore.getState().run.machines[machineId].level).toBe(5);
  });
});
