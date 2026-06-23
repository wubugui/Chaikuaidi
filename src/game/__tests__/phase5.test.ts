import { beforeEach, describe, expect, it } from 'vitest';
import { initialState, type GameState } from '../state';
import { makeParcel } from '../engine';
import { on } from '../events';
import { useGame } from '../store';
import { MISSION_MAP } from '../../data/missions';
import { ABSURD_MAP } from '../../data/absurd';
import { GIANT_MAP } from '../../data/giants';
import { MERCHANT_DURATION } from '../../data/merchant';

function freshStore(over: Partial<GameState> = {}) {
  useGame.setState({ ...initialState(), offline: null } as any);
  useGame.setState(over as any);
}

describe('P5 离场远征 — dispatch + tick complete', () => {
  beforeEach(() => freshStore());

  it('dispatchMission gates on cost', () => {
    const def = MISSION_MAP['m_launchpad'];
    freshStore({ stage: 4, money: def.cost - 1 });
    useGame.getState().dispatchMission('m_launchpad');
    expect(useGame.getState().missions.length).toBe(0);
  });

  it('dispatchMission gates on stage', () => {
    const def = MISSION_MAP['m_launchpad'];
    freshStore({ stage: 1, money: def.cost * 10 });
    useGame.getState().dispatchMission('m_launchpad');
    expect(useGame.getState().missions.length).toBe(0);
  });

  it('dispatchMission gates on requires (prerequisite mission)', () => {
    const def = MISSION_MAP['m_station']; // requires m_launchpad done
    freshStore({ stage: 4, money: def.cost * 10 });
    useGame.getState().dispatchMission('m_station');
    expect(useGame.getState().missions.length).toBe(0); // blocked
    // satisfy prerequisite
    freshStore({ stage: 4, money: def.cost * 10, doneMissions: ['m_launchpad'] });
    useGame.getState().dispatchMission('m_station');
    expect(useGame.getState().missions.some((m) => m.id === 'm_station')).toBe(true);
  });

  it('dispatch starts an active mission and deducts cost', () => {
    const def = MISSION_MAP['m_launchpad'];
    freshStore({ stage: 4, money: def.cost + 5000 });
    useGame.getState().dispatchMission('m_launchpad');
    const s = useGame.getState();
    expect(s.missions.some((m) => m.id === 'm_launchpad')).toBe(true);
    expect(s.money).toBe(5000);
  });

  it('tick past endsAt completes mission: rewards granted, id in doneMissions, cannot re-dispatch', () => {
    const def = MISSION_MAP['m_launchpad'];
    freshStore({ stage: 4, money: def.cost + 1 });
    useGame.getState().dispatchMission('m_launchpad');
    // force the mission to be already over
    const mm = useGame.getState().missions.map((m) => ({ ...m, endsAt: Date.now() - 1 }));
    useGame.setState({ missions: mm } as any);

    const moneyBefore = useGame.getState().money;
    useGame.getState().tick(0.1);
    const s = useGame.getState();
    expect(s.missions.length).toBe(0); // removed from active
    expect(s.doneMissions).toContain('m_launchpad'); // moved to done
    expect(s.collection).toContain(def.rewards.unique); // unique collectible granted
    expect(s.money).toBeGreaterThan(moneyBefore); // cash reward via money path

    // cannot re-dispatch (one-time)
    useGame.setState({ money: def.cost * 10 } as any);
    useGame.getState().dispatchMission('m_launchpad');
    expect(useGame.getState().missions.length).toBe(0);
  });
});

describe('P5 唯一货物 — bought absurd excluded from future merchant offers', () => {
  beforeEach(() => freshStore());

  it('a unique absurd in boughtUniques is excluded when the merchant restocks', () => {
    // force a merchant visit now, with all uniques already bought
    const allAbsurd = Object.keys(ABSURD_MAP);
    freshStore({
      stage: 4,
      money: 0,
      boughtUniques: allAbsurd,
      merchant: null,
      merchantNextAt: Date.now() - 1,
    });
    useGame.getState().tick(0.1);
    const merchant = useGame.getState().merchant;
    expect(merchant).not.toBeNull();
    // none of the offers should be an already-bought unique absurd
    for (const o of merchant!.offers) {
      if (o.kind === 'absurd') expect(allAbsurd).not.toContain(o.id);
    }
  });

  it('buying a unique absurd from merchant records it in boughtUniques', () => {
    const a = ABSURD_MAP['a_ufo'];
    freshStore({
      stage: 4,
      money: a.price * 2,
      factorySpace: 20,
      merchant: { until: Date.now() + MERCHANT_DURATION, offers: [{ id: 'a_ufo', kind: 'absurd', price: a.price, stock: 1 }] },
    });
    useGame.getState().buyFromMerchant('a_ufo');
    expect(useGame.getState().boughtUniques).toContain('a_ufo');
  });
});

describe('P5 荒诞卖家对白 — seller event fires', () => {
  beforeEach(() => freshStore());

  it('buying an absurd from merchant emits a seller event', () => {
    const a = ABSURD_MAP['a_ufo'];
    freshStore({
      stage: 4,
      money: a.price * 2,
      factorySpace: 20,
      merchant: { until: Date.now() + MERCHANT_DURATION, offers: [{ id: 'a_ufo', kind: 'absurd', price: a.price, stock: 1 }] },
    });
    let fired: any = null;
    const off = on('seller', (s) => { fired = s; });
    useGame.getState().buyFromMerchant('a_ufo');
    off();
    expect(fired).not.toBeNull();
    expect(fired.item).toBe(a.name);
    expect(Array.isArray(fired.lines)).toBe(true);
    expect(fired.lines.length).toBeGreaterThan(0);
  });

  it('buying a giant emits a seller event', () => {
    const g = GIANT_MAP['g_car'];
    freshStore({ stage: 4, money: g.price * 2, factorySpace: 20 });
    let fired: any = null;
    const off = on('seller', (s) => { fired = s; });
    useGame.getState().buyGiant('g_car');
    off();
    expect(fired).not.toBeNull();
    expect(fired.item).toBe(g.name);
  });

  it('dispatching a mission emits a seller event', () => {
    const def = MISSION_MAP['m_launchpad'];
    freshStore({ stage: 4, money: def.cost + 1 });
    let fired: any = null;
    const off = on('seller', (s) => { fired = s; });
    useGame.getState().dispatchMission('m_launchpad');
    off();
    expect(fired).not.toBeNull();
    expect(fired.name).toBe(def.seller.name);
  });
});

describe('P5 makeParcel 2-arg still works', () => {
  it('makeParcel(size, rand) returns a parcel', () => {
    const p = makeParcel('small', () => 0.5);
    expect(p.size).toBe('small');
    expect(p.sealHP).toBe(p.sealMax);
  });
});
