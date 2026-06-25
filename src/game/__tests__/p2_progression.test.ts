import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialMetaState, createInitialRunState } from '../../core/state';
import { TARGET_MAP } from '../../content';
import type { PartDef } from '../../content/types';
import { actions } from '../actions';
import { runtimeGameStore } from '../runtimeStore';

function boot(overrides: Partial<ReturnType<typeof createInitialMetaState>> = {}) {
  runtimeGameStore.setState({
    run: { ...createInitialRunState(), money: 30_000 },
    meta: {
      ...createInitialMetaState(),
      reputation: 20,
      rumors: ['rumor-black-market-missile', 'rumor-black-market-open'],
      unlockedPanels: ['black-market'],
      ...overrides,
    },
  });
  actions.ensureP1Run();
  runtimeGameStore.setState({
    ...runtimeGameStore.getState(),
    run: { ...runtimeGameStore.getState().run, money: 30_000 },
  });
}

function sourceForPart(part: PartDef): string {
  const state = runtimeGameStore.getState();
  const sources = [
    ...Object.keys(state.run.tools).map((id) => ({ id, tags: state.run.tools[id].tags })),
    ...Object.keys(state.run.machines).map((id) => ({ id, tags: [id.includes('rail') ? 'remote' : 'pipeline', 'hydraulic'] })),
  ];
  if (part.requiredTags?.length) {
    const matched = sources.find((source) => source.tags.some((tag) => part.requiredTags?.includes(tag as never)));
    if (matched) return matched.id;
  }
  if (part.material === 'volatile' || part.material === 'anomaly') return state.run.tools['remote-probe'] ? 'remote-probe' : 'gundam-pile';
  if (part.material === 'stone' || part.material === 'metal') return state.run.machines['hydraulic-hammer'] ? 'hydraulic-hammer' : 'hammer';
  return state.run.tools.hammer ? 'hammer' : 'hand';
}

function smashCurrentTarget(maxHits = 2600) {
  for (let i = 0; i < maxHits; i++) {
    const state = runtimeGameStore.getState();
    const runtime = state.run.currentTarget;
    if (!runtime) return;
    if (state.run.runResult) return;
    const partState = Object.values(runtime.parts).find((part) => part.exposed && !part.destroyed);
    if (!partState) return;
    const target = TARGET_MAP[runtime.targetId];
    const part = target.parts.find((item) => item.id === partState.partId)!;
    if (part.riskTriggers.length > 0) actions.inspectPart(part.id);
    const machineSource = sourceForPart(part);
    const finalThreshold = Math.max(2, Math.ceil(partState.maxHp * 0.06));
    const sourceId = state.run.machines[machineSource] && !part.requiredTags?.length && partState.hp <= finalThreshold ? 'hammer' : machineSource;
    actions.hitPart(part.id, sourceId);
    const after = runtimeGameStore.getState();
    if (after.run.runResult && after.run.runResult.reason !== 'completed') {
      throw new Error(`unexpected ${after.run.runResult.reason} while smashing ${runtime.targetId}:${part.id}`);
    }
  }
  throw new Error('target did not complete in hit budget');
}

beforeEach(() => {
  boot();
});

describe('P2 black market and progression', () => {
  it('does not surface terminal offers in the first black market refresh', () => {
    actions.refreshBlackMarket();

    const offers = runtimeGameStore.getState().meta.blackMarket.currentOfferIds;
    expect(offers).toContain('offer-alien-egg');
    expect(offers).not.toContain('offer-ufo-hull');
    expect(runtimeGameStore.getState().meta.discoveredTargets).not.toContain('black-monolith');
  });

  it('accepts a black market commission and turns it into a playable target', () => {
    actions.refreshBlackMarket();
    actions.acceptBlackMarketOffer('offer-alien-egg');

    const state = runtimeGameStore.getState();
    expect(state.run.currentTarget?.targetId).toBe('blackmarket-alien-egg');
    expect(state.meta.discoveredTargets).toContain('blackmarket-alien-egg');
    expect(state.meta.blackMarket.sellerTrust).toBeGreaterThan(0);
    expect(state.meta.rumors).toContain('rumor-seller-egg');
  });

  it('uses P2 rumors to unlock later black market offers without unlocking the endgame early', () => {
    actions.refreshBlackMarket();
    actions.acceptBlackMarketOffer('offer-alien-egg');
    smashCurrentTarget();
    actions.dismissResult();

    actions.refreshBlackMarket();
    const state = runtimeGameStore.getState();
    expect(state.meta.completedTargets).toContain('blackmarket-alien-egg');
    expect(state.meta.rumors).toContain('rumor-meteor-core');
    expect(state.meta.blackMarket.currentOfferIds).toContain('offer-meteor-core');
    expect(state.meta.blackMarket.currentOfferIds).not.toContain('offer-ufo-hull');
  });

  it('unlocks factory pipelines as real damage sources', () => {
    runtimeGameStore.setState({
      ...runtimeGameStore.getState(),
      meta: {
        ...runtimeGameStore.getState().meta,
        discoveredTargets: ['factory-pipeline-core'],
        completedTargets: ['blackmarket-alien-egg', 'blackmarket-meteor-core'],
        rumors: ['rumor-factory-line', 'rumor-expedition-map'],
        unlockedPanels: ['black-market', 'factory'],
      },
    });
    actions.startTarget('factory-pipeline-core');
    smashCurrentTarget();

    const state = runtimeGameStore.getState();
    expect(state.run.runResult?.reason).toBe('completed');
    expect(state.meta.unlockedSources).toEqual(expect.arrayContaining(['heavy-crusher', 'crawler-press', 'rail-smash-array']));
    expect(state.run.machines['heavy-crusher']).toBeTruthy();
    expect(state.meta.unlockedPanels).toContain('expedition');
  });

  it('runs the P2 chain from factory through expeditions, giant forms, and the monolith', () => {
    runtimeGameStore.setState({
      ...runtimeGameStore.getState(),
      meta: {
        ...runtimeGameStore.getState().meta,
        discoveredTargets: ['factory-pipeline-core'],
        completedTargets: ['blackmarket-alien-egg', 'blackmarket-meteor-core'],
        rumors: ['rumor-factory-line', 'rumor-expedition-map', 'rumor-reactor-route', 'rumor-space-route'],
        unlockedPanels: ['black-market', 'factory'],
      },
    });

    const complete = (targetId: string) => {
      actions.startTarget(targetId);
      expect(runtimeGameStore.getState().run.currentTarget?.targetId, targetId).toBe(targetId);
      smashCurrentTarget(5200);
      expect(runtimeGameStore.getState().run.runResult?.reason, targetId).toBe('completed');
      actions.dismissResult();
    };

    complete('factory-pipeline-core');
    complete('expedition-building');
    complete('expedition-launchpad');
    complete('expedition-nuclear');
    complete('expedition-bridge');
    complete('expedition-gundam-factory');
    complete('expedition-station');
    complete('expedition-collider');
    complete('ufo-hull');
    complete('living-mecha-beast');
    complete('black-monolith');

    const state = runtimeGameStore.getState();
    expect(state.meta.completedTargets).toEqual(
      expect.arrayContaining([
        'expedition-launchpad',
        'expedition-building',
        'expedition-bridge',
        'expedition-nuclear',
        'expedition-station',
        'expedition-collider',
        'ufo-hull',
        'living-mecha-beast',
        'black-monolith',
      ]),
    );
    expect(state.meta.unlockedSources).toEqual(expect.arrayContaining(['mecha-fist', 'gundam-pile', 'ultra-beam']));
    expect(state.meta.unlockedPanels).toContain('postgame');
  });

  it('keeps giant forms out of ordinary parcel farming', () => {
    runtimeGameStore.setState({
      ...runtimeGameStore.getState(),
      meta: {
        ...runtimeGameStore.getState().meta,
        discoveredTargets: ['parcel-basic'],
        unlockedSources: ['mecha-fist'],
        giantForms: { ...runtimeGameStore.getState().meta.giantForms, unlockedSourceIds: ['mecha-fist'] },
      },
    });
    actions.startNewRun();
    runtimeGameStore.setState({
      ...runtimeGameStore.getState(),
      run: { ...runtimeGameStore.getState().run, money: 30_000 },
      meta: {
        ...runtimeGameStore.getState().meta,
        discoveredTargets: ['parcel-basic'],
        unlockedSources: ['mecha-fist'],
        giantForms: { ...runtimeGameStore.getState().meta.giantForms, unlockedSourceIds: ['mecha-fist'] },
      },
    });
    actions.startTarget('parcel-basic');
    actions.activateGiantForm('mecha-fist');
    const before = runtimeGameStore.getState().run.currentTarget!.parts['parcel-body'].hp;
    actions.hitPart('parcel-body', 'mecha-fist');

    expect(runtimeGameStore.getState().run.currentTarget!.parts['parcel-body'].hp).toBe(before);
  });
});
