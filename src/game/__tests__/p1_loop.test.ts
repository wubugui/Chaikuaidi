import { beforeEach, describe, expect, it } from 'vitest';
import { actions } from '../actions';
import { runtimeGameStore } from '../runtimeStore';
import { createInitialMetaState, createInitialRunState } from '../../core/state';
import { P1_TARGET_MAP } from '../../content/targets/p1';

function boot(discoveredTargets: string[] = Object.keys(P1_TARGET_MAP)) {
  runtimeGameStore.setState({
    run: { ...createInitialRunState(), money: 20_000 },
    meta: { ...createInitialMetaState(), discoveredTargets },
  });
  actions.ensureP1Run();
  runtimeGameStore.setState({
    ...runtimeGameStore.getState(),
    run: { ...runtimeGameStore.getState().run, money: 20_000 },
  });
}

function smashCurrentTarget(maxHits = 2200) {
  for (let i = 0; i < maxHits; i++) {
    const state = runtimeGameStore.getState();
    const runtime = state.run.currentTarget;
    if (!runtime) return;
    const part = Object.values(runtime.parts).find((item) => item.exposed && !item.destroyed);
    if (!part) return;
    const target = P1_TARGET_MAP[runtime.targetId];
    const partDef = target.parts.find((item) => item.id === part.partId)!;
    if (partDef.riskTriggers.length > 0) actions.inspectPart(partDef.id);
    const source = partDef.material === 'volatile' || partDef.material === 'anomaly' ? 'remote-probe' : 'hammer';
    actions.hitPart(part.partId, source);
    const after = runtimeGameStore.getState();
    if (after.run.runResult && after.run.runResult.reason !== 'completed') {
      throw new Error(`unexpected ${after.run.runResult.reason} while smashing ${runtime.targetId}:${part.partId}`);
    }
  }
  throw new Error('target did not complete in hit budget');
}

beforeEach(() => {
  boot();
});

describe('P1 playable loop', () => {
  it('unlocks the P1 path from parcels through the dangerous target', () => {
    const path = [
      'parcel-basic',
      'parcel-combo',
      'parcel-cash',
      'parcel-tool',
      'parcel-before-rage',
      'parcel-tape-final',
      'safe-stubborn',
      'car-scrapyard',
    ];

    for (const targetId of path) {
      actions.startTarget(targetId);
      smashCurrentTarget();
      const state = runtimeGameStore.getState();
      expect(state.run.runResult?.reason, targetId).toBe('completed');
      expect(state.meta.completedTargets, targetId).toContain(targetId);
      actions.dismissResult();
    }

    expect(runtimeGameStore.getState().meta.discoveredTargets).toContain('missile-dont-touch');
    expect(runtimeGameStore.getState().meta.rumors).toContain('rumor-black-market-missile');
  });

  it('keeps machine damage from stealing the last hit on important targets', () => {
    actions.startTarget('safe-stubborn');
    actions.deployMachine('hydraulic-hammer', 'safe-dial');

    for (let i = 0; i < 80; i++) actions.hitPart('safe-dial', 'hydraulic-hammer');

    const machineCapped = runtimeGameStore.getState().run.currentTarget!.parts['safe-dial'];
    expect(machineCapped.destroyed).toBe(false);
    expect(machineCapped.hp).toBeGreaterThan(0);

    for (let i = 0; i < 12 && runtimeGameStore.getState().run.currentTarget?.parts['safe-dial']?.destroyed === false; i++) {
      actions.hitPart('safe-dial', 'hammer');
    }
    expect(runtimeGameStore.getState().run.currentTarget!.parts['safe-dial'].destroyed).toBe(true);
  });

  it('turns reckless missile hits into an accident but allows remote probing to stay safe', () => {
    actions.startTarget('missile-dont-touch');
    for (let i = 0; i < 120 && !runtimeGameStore.getState().run.runResult; i++) {
      actions.hitPart('missile-body', 'hammer');
    }
    expect(runtimeGameStore.getState().run.runResult?.reason).toBe('accident');
    expect(runtimeGameStore.getState().meta.accidentArchives).toContain('archive-missile-boom');

    boot();
    actions.startTarget('missile-dont-touch');
    actions.inspectPart('missile-fuse');
    for (let i = 0; i < 90; i++) actions.hitPart('missile-fuse', 'remote-probe');
    expect(runtimeGameStore.getState().run.runResult?.reason).not.toBe('accident');
    expect(runtimeGameStore.getState().run.currentTarget?.parts['missile-fuse'].destroyed).toBe(true);
  });

  it('simulates 100 first-stage route decisions without deadlocking', () => {
    const outcomes = { accident: 0, retreat: 0, safeProbe: 0 };
    for (let i = 0; i < 100; i++) {
      boot();
      actions.startTarget('missile-dont-touch');
      if (i % 3 === 0) {
        for (let hit = 0; hit < 120 && !runtimeGameStore.getState().run.runResult; hit++) actions.hitPart('missile-body', 'hammer');
        if (runtimeGameStore.getState().run.runResult?.reason === 'accident') outcomes.accident++;
      } else if (i % 3 === 1) {
        actions.retreatTarget();
        if (runtimeGameStore.getState().run.runResult?.reason === 'retreated') outcomes.retreat++;
      } else {
        actions.inspectPart('missile-fuse');
        for (let hit = 0; hit < 90; hit++) actions.hitPart('missile-fuse', 'remote-probe');
        if (!runtimeGameStore.getState().run.runResult) outcomes.safeProbe++;
      }
    }

    expect(outcomes.accident).toBeGreaterThan(0);
    expect(outcomes.retreat).toBeGreaterThan(0);
    expect(outcomes.safeProbe).toBeGreaterThan(0);
  });
});
