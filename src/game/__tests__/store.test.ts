import { beforeEach, describe, expect, it } from 'vitest';
import { ensureStarter, useGame } from '../store';
import { initialState } from '../state';

beforeEach(() => {
  // 复位到干净状态再补起始快递
  useGame.setState({ ...initialState(), offline: null } as any);
  ensureStarter();
});

describe('store gameplay loop', () => {
  it('clicking unpacks parcels and yields loot', () => {
    for (let i = 0; i < 300; i++) useGame.getState().click();
    const s = useGame.getState();
    expect(s.totalUnpacked).toBeGreaterThan(0);
    const lootCount =
      Object.values(s.inventory).reduce((a, b) => a + b, 0) + s.collection.length + s.quotes.length;
    expect(lootCount).toBeGreaterThan(0);
  });

  it('sell-all converts inventory into money', () => {
    for (let i = 0; i < 400; i++) useGame.getState().click();
    const before = useGame.getState().money;
    useGame.getState().sellAllItems(null);
    const s = useGame.getState();
    expect(s.money).toBeGreaterThanOrEqual(before);
    expect(Object.keys(s.inventory).length).toBe(0);
  });

  it('can buy an upgrade when affordable', () => {
    useGame.setState({ money: 1000 } as any);
    useGame.getState().buyUpgrade('clickPower', 1);
    expect(useGame.getState().upgrades.clickPower).toBe(1);
    expect(useGame.getState().money).toBeLessThan(1000);
  });

  it('can upgrade the tool', () => {
    useGame.setState({ money: 100 } as any);
    useGame.getState().buyTool();
    expect(useGame.getState().currentTool).toBe('key');
  });

  it('equips and unequips a quote within slot limits', () => {
    useGame.setState({ quotes: ['q_hand'], equippedQuotes: [] } as any);
    useGame.getState().equipQuote('q_hand');
    expect(useGame.getState().equippedQuotes).toContain('q_hand');
    // 槽位只有 1，再装别的应被拒绝
    useGame.setState({ quotes: ['q_hand', 'q_zen'] } as any);
    useGame.getState().equipQuote('q_zen');
    expect(useGame.getState().equippedQuotes).not.toContain('q_zen');
    useGame.getState().unequipQuote('q_hand');
    expect(useGame.getState().equippedQuotes).toHaveLength(0);
  });

  it('prestige resets the run but keeps collection and quotes', () => {
    useGame.setState({ runEarned: 4_000_000, collection: ['snail'], quotes: ['q_hand'] } as any);
    useGame.getState().prestige();
    const s = useGame.getState();
    expect(s.reputation).toBe(2); // sqrt(4)
    expect(s.runEarned).toBe(0);
    expect(s.collection).toContain('snail');
    expect(s.quotes).toContain('q_hand');
  });
});
