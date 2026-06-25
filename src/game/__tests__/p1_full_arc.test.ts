import { beforeEach, describe, expect, it } from 'vitest';
import { actions } from '../actions';
import { runtimeGameStore } from '../runtimeStore';
import { createInitialMetaState, createInitialRunState } from '../../core/state';
import { TARGET_MAP } from '../../content';

const run = () => runtimeGameStore.getState().run;

function boot() {
  runtimeGameStore.setState({ run: { ...createInitialRunState(), money: 0 }, meta: { ...createInitialMetaState() } });
  actions.ensureP1Run();
  runtimeGameStore.setState({ ...runtimeGameStore.getState(), run: { ...runtimeGameStore.getState().run, money: 0 } });
}

// careful smash of whatever good is on the bench: inspect risky parts, switch views,
// pick a sensible tool per material — drives it to completion deterministically.
function smashActive(maxHits = 6000) {
  for (let i = 0; i < maxHits; i++) {
    const rt = run().currentTarget;
    if (!rt) return;
    const part = Object.values(rt.parts).find((p) => p.exposed && !p.destroyed);
    if (!part) return;
    const target = TARGET_MAP[rt.targetId];
    const pd = target.parts.find((p) => p.id === part.partId)!;
    if (pd.viewId !== rt.currentViewId && rt.unlockedViews.includes(pd.viewId)) actions.switchView(pd.viewId);
    if (pd.riskTriggers.length > 0) actions.inspectPart(pd.id);
    const tool = pd.material === 'volatile' || pd.material === 'anomaly' ? 'remote-probe' : 'hammer';
    actions.hitPart(part.partId, tool);
    if (run().runResult) return;
  }
}

beforeEach(() => boot());

describe('P1 full arc composes end to end', () => {
  it('hand parcels -> buy tools -> two-phase good -> safe -> upgrade -> build auto-pipeline', () => {
    // 0) bare hands only
    expect(Object.keys(run().tools)).toEqual(['hand']);

    // 1) earn from parcels with bare hands
    actions.openParcel();
    for (let i = 0; i < 2000 && !run().runResult; i++) {
      const part = Object.values(run().currentTarget!.parts).find((p) => p.exposed && !p.destroyed);
      if (!part) break;
      actions.hitPart(part.partId, 'hand');
    }
    expect(run().runResult?.reason).toBe('completed');
    expect(run().money).toBeGreaterThan(0);
    actions.dismissResult();

    // 2) fund + buy the gear (simulate having ground enough)
    runtimeGameStore.setState({ ...runtimeGameStore.getState(), run: { ...run(), money: 60_000 } });
    actions.buyTool('hammer');
    actions.buyTool('remote-probe');
    expect(run().tools.hammer).toBeDefined();
    expect(run().tools['remote-probe']).toBeDefined();

    // 3) buy the two-phase blackball; shell is remote-gated, then reveals the core
    actions.buyGood('good-blackball');
    expect(run().currentTarget?.targetId).toBe('oddity-blackball');
    expect(run().currentTarget!.parts['blackball-core'].exposed).toBe(false);
    smashActive();
    expect(['completed', 'accident', 'death']).toContain(run().runResult?.reason); // resolved one way or another
    expect(run().ownedGoods.find((g) => g.targetId === 'oddity-blackball')).toBeUndefined(); // left the shelf
    actions.dismissResult();

    // 4) buy + smash the safe to completion (multi-part, multi-view)
    actions.buyGood('good-safe');
    smashActive();
    expect(run().runResult?.reason).toBe('completed');
    expect(run().ownedGoods.length).toBe(0);
    actions.dismissResult();

    // 5) machine upgrade: first level (money+scrap), then a material-gated level
    const mid = Object.keys(run().machines)[0];
    runtimeGameStore.setState({ ...runtimeGameStore.getState(), run: { ...run(), money: 60_000, scrap: 200, materials: { m_hardcore: 20, m_pressgem: 20, m_oddmatter: 20 } } });
    const lvl0 = run().machines[mid].level;
    actions.upgradeMachine(mid);
    actions.upgradeMachine(mid);
    actions.upgradeMachine(mid);
    expect(run().machines[mid].level).toBe(lvl0 + 3);

    // 6) build the auto-parcel pipeline (paid milestone) and confirm hands-free grind
    expect(run().autoPipelineUnlocked).toBe(false);
    actions.buyAutoPipeline();
    expect(run().autoPipelineUnlocked).toBe(true);
    actions.openParcel();
    const before = run().money;
    for (let i = 0; i < 80; i++) actions.tickMachines();
    expect(run().money).toBeGreaterThan(before); // passive income flowing
  });
});
