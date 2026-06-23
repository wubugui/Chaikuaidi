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

  it('can buy and equip a tool from the toolbox', () => {
    useGame.setState({ money: 100, stage: 1, ownedTools: ['hand'], currentTool: 'hand' } as any);
    useGame.getState().buyTool('cutter');
    expect(useGame.getState().ownedTools).toContain('cutter');
    useGame.getState().selectTool('cutter');
    expect(useGame.getState().currentTool).toBe('cutter');
  });

  it('upgrades a tool spending money and materials', () => {
    useGame.setState({
      money: 100000,
      ownedTools: ['hand', 'cutter'],
      currentTool: 'cutter',
      toolLevels: {},
      inventory: { blade: 10 },
    } as any);
    useGame.getState().upgradeTool('cutter');
    expect(useGame.getState().toolLevels.cutter).toBe(1);
    expect(useGame.getState().inventory.blade ?? 0).toBeLessThan(10);
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

  it('buying a container lands in backlog, not workbench/queue', () => {
    useGame.setState({ money: 1_000_000, stage: 4 } as any);
    const qBefore = useGame.getState().queue.length;
    const wBefore = useGame.getState().workbench.length;
    useGame.getState().buyContainer('safe');
    const s = useGame.getState();
    expect(s.backlog.length).toBe(1);
    expect(s.backlog[0].label).toBe('撬不动的保险箱');
    expect(s.queue.length).toBe(qBefore);
    expect(s.workbench.length).toBe(wBefore);
  });

  it('loadFromBacklog moves a parcel onto the bench when there is space', () => {
    useGame.setState({
      money: 1_000_000, stage: 4, workbench: [], backlog: [],
      upgrades: { workbench: 5 }, // 容量充足
    } as any);
    useGame.getState().buyContainer('safe');
    const id = useGame.getState().backlog[0].id;
    useGame.getState().loadFromBacklog(id);
    const s = useGame.getState();
    expect(s.backlog.length).toBe(0);
    expect(s.workbench.some((p) => p.id === id)).toBe(true);
  });

  it('loadFromBacklog is a no-op when the bench is full', () => {
    useGame.setState({
      money: 1_000_000, stage: 4, upgrades: {},
      workbench: [{ id: 9001, size: 'small', emoji: '📦', material: 'paper', sealMax: 5, sealHP: 5, lootCount: 1 }],
      backlog: [],
    } as any);
    useGame.getState().buyContainer('safe'); // cap=1, bench already has 1
    const id = useGame.getState().backlog[0].id;
    useGame.getState().loadFromBacklog(id);
    const s = useGame.getState();
    expect(s.backlog.some((p) => p.id === id)).toBe(true); // still in backlog
    expect(s.workbench.length).toBe(1);
  });

  it('shelveToBacklog round-trips a bench parcel to backlog', () => {
    useGame.setState({
      workbench: [{ id: 7777, size: 'crate', emoji: '🧰', material: 'wood', sealMax: 50, sealHP: 50, lootCount: 1 }],
      queue: [], backlog: [],
    } as any);
    useGame.getState().shelveToBacklog(7777);
    const s = useGame.getState();
    expect(s.workbench.some((p) => p.id === 7777)).toBe(false);
    expect(s.backlog.some((p) => p.id === 7777)).toBe(true);
  });

  it('a merchant spawns after merchantNextAt via tick, and buyFromMerchant decrements stock + appends to backlog', () => {
    useGame.setState({
      money: 10_000_000, stage: 4, backlog: [],
      merchant: null, merchantNextAt: Date.now() - 1000, // 已到时间
    } as any);
    useGame.getState().tick(0.1);
    const m = useGame.getState().merchant;
    expect(m).not.toBeNull();
    expect(m!.offers.length).toBeGreaterThan(0);
    const offer = m!.offers[0];
    const stockBefore = offer.stock;
    const backlogBefore = useGame.getState().backlog.length;
    useGame.getState().buyFromMerchant(offer.id);
    const s = useGame.getState();
    const after = s.merchant!.offers.find((o) => o.id === offer.id)!;
    expect(after.stock).toBe(stockBefore - 1);
    expect(s.backlog.length).toBe(backlogBefore + 1);
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
