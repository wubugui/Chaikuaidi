import { beforeEach, describe, expect, it } from 'vitest';
import { actions } from '../actions';
import { runtimeGameStore } from '../runtimeStore';
import { createInitialMetaState, createInitialRunState } from '../../core/state';

beforeEach(() => {
  runtimeGameStore.setState({
    run: { ...createInitialRunState(), money: 1000 },
    meta: { ...createInitialMetaState(), discoveredTargets: ['parcel-basic', 'safe-stubborn', 'car-scrapyard', 'missile-dont-touch'] },
  });
  actions.ensureP1Run();
  runtimeGameStore.setState({
    ...runtimeGameStore.getState(),
    run: { ...runtimeGameStore.getState().run, money: 1000 },
  });
});

describe('runtime actions', () => {
  it('starts a P1 target and tracks active hit state', () => {
    actions.startTarget('safe-stubborn');
    actions.startHit('safe-dial', 'hammer');

    const state = runtimeGameStore.getState();
    expect(state.run.currentTarget?.targetId).toBe('safe-stubborn');
    expect(state.run.currentTarget?.selectedPartId).toBe('safe-dial');
    expect(state.run.activeHit).toEqual({ partId: 'safe-dial', sourceId: 'hammer' });
  });

  it('hitPart damages HP, increments combo, and builds rage', () => {
    actions.startTarget('safe-stubborn');
    const before = runtimeGameStore.getState().run.currentTarget!.parts['safe-dial'].hp;

    actions.hitPart('safe-dial', 'crowbar');

    const state = runtimeGameStore.getState();
    expect(state.run.currentTarget!.parts['safe-dial'].hp).toBeLessThan(before);
    expect(state.run.combo).toBe(1);
    expect(state.run.rage).toBeGreaterThan(0);
  });

  it('stopHit clears active hit state', () => {
    actions.startTarget('safe-stubborn');
    actions.startHit('safe-dial', 'hammer');
    actions.stopHit();

    expect(runtimeGameStore.getState().run.activeHit).toBeNull();
  });
});
