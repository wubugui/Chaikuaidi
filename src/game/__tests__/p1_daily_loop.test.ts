import { beforeEach, describe, expect, it } from 'vitest';
import { actions } from '../actions';
import { runtimeGameStore } from '../runtimeStore';
import { createInitialMetaState, createInitialRunState } from '../../core/state';
import { P1_TARGET_MAP } from '../../content/targets/p1';

function boot(discoveredTargets: string[] = ['parcel-basic', 'parcel-combo', 'parcel-cash']) {
  runtimeGameStore.setState({
    run: { ...createInitialRunState(), money: 0 },
    meta: { ...createInitialMetaState(), discoveredTargets },
  });
  actions.ensureP1Run();
}

function smashCurrentToCompletion(maxHits = 600) {
  for (let i = 0; i < maxHits; i++) {
    const runtime = runtimeGameStore.getState().run.currentTarget;
    if (!runtime) return;
    const part = Object.values(runtime.parts).find((item) => item.exposed && !item.destroyed);
    if (!part) return;
    actions.hitPart(part.partId, 'hammer');
  }
}

beforeEach(() => boot());

describe('daily parcel loop', () => {
  it('openParcel always starts a discovered parcel, even with no money', () => {
    runtimeGameStore.setState({
      ...runtimeGameStore.getState(),
      run: { ...runtimeGameStore.getState().run, money: 0, currentTarget: null, runResult: null },
    });
    actions.openParcel();
    const t = runtimeGameStore.getState().run.currentTarget;
    expect(t).not.toBeNull();
    expect(t!.targetId.startsWith('parcel-')).toBe(true);
  });

  it('parcels are repeatable: the same parcel can be opened again after completion', () => {
    runtimeGameStore.setState({
      ...runtimeGameStore.getState(),
      meta: { ...runtimeGameStore.getState().meta, discoveredTargets: ['parcel-basic'] },
      run: { ...runtimeGameStore.getState().run, currentTarget: null, runResult: null },
    });
    actions.openParcel();
    const moneyBefore = runtimeGameStore.getState().run.money;
    smashCurrentToCompletion();
    expect(runtimeGameStore.getState().run.runResult?.reason).toBe('completed');
    const moneyAfter = runtimeGameStore.getState().run.money;
    expect(moneyAfter).toBeGreaterThan(moneyBefore);

    // open it again — repeatable income (and the same parcel stays eligible even after completion)
    runtimeGameStore.setState({
      ...runtimeGameStore.getState(),
      meta: { ...runtimeGameStore.getState().meta, discoveredTargets: ['parcel-basic'] },
    });
    actions.openParcel();
    expect(runtimeGameStore.getState().run.currentTarget?.targetId).toBe('parcel-basic');
    expect(runtimeGameStore.getState().run.runResult).toBeNull();
  });

  it('auto pipeline keeps grinding parcels hands-free across completions', () => {
    runtimeGameStore.setState({
      ...runtimeGameStore.getState(),
      meta: { ...runtimeGameStore.getState().meta, discoveredTargets: ['parcel-basic'] },
      run: { ...runtimeGameStore.getState().run, currentTarget: null, runResult: null, autoPipeline: true },
    });
    actions.openParcel();
    const startMoney = runtimeGameStore.getState().run.money;
    // give it 'hammer' so auto-source is effective on paper
    for (let i = 0; i < 60; i++) actions.tickMachines();
    const state = runtimeGameStore.getState();
    // either mid-parcel or freshly auto-restarted, but money must have grown from completed parcels
    expect(state.run.money).toBeGreaterThan(startMoney);
    expect(state.run.currentTarget === null || state.run.currentTarget.targetId.startsWith('parcel-')).toBe(true);
  });

  it('auto pipeline does NOT auto-smash a special (non-parcel) good', () => {
    runtimeGameStore.setState({
      ...runtimeGameStore.getState(),
      meta: { ...runtimeGameStore.getState().meta, discoveredTargets: Object.keys(P1_TARGET_MAP) },
      run: { ...runtimeGameStore.getState().run, money: 20_000, currentTarget: null, runResult: null, autoPipeline: true },
    });
    actions.startTarget('safe-stubborn', { ignoreCost: true });
    const before = runtimeGameStore.getState().run.currentTarget!.parts['safe-dial'].hp;
    for (let i = 0; i < 20; i++) actions.tickMachines();
    const after = runtimeGameStore.getState().run.currentTarget;
    // safe is untouched by the auto pipeline (no machines deployed) — still the active target
    expect(after?.targetId).toBe('safe-stubborn');
    expect(after?.parts['safe-dial'].hp).toBe(before);
  });

  it('scrapSellCurrent converts an un-smashable special good into scrap and ends it', () => {
    runtimeGameStore.setState({
      ...runtimeGameStore.getState(),
      meta: { ...runtimeGameStore.getState().meta, discoveredTargets: Object.keys(P1_TARGET_MAP) },
      run: { ...runtimeGameStore.getState().run, money: 20_000, scrap: 0, currentTarget: null, runResult: null },
    });
    actions.startTarget('safe-stubborn', { ignoreCost: true });
    actions.scrapSellCurrent();
    const state = runtimeGameStore.getState();
    expect(state.run.currentTarget).toBeNull();
    expect(state.run.scrap).toBeGreaterThan(0);
    expect(state.run.runResult?.reason).toBe('retreated');
  });
});
