// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// 构造一个「重构前」的旧存档（线性工具 / 快递无 material / 无 ownedTools / 无 mutations）
const OLD_SAVE = {
  state: {
    money: 5000,
    reputation: 0,
    runEarned: 5000,
    lifetimeEarned: 60000,
    currentTool: 'electric', // 旧线性工具 id
    workbench: [
      { id: 11, size: 'reinforced', emoji: '🗳️', sealMax: 60, sealHP: 40, lootCount: 2 },
      { id: 12, size: 'crate', emoji: '🧰', sealMax: 200, sealHP: 200, lootCount: 4 },
    ],
    queue: [
      { id: 13, size: 'container', emoji: '🚛', sealMax: 1000, sealHP: 1000, lootCount: 12 },
    ],
    combo: 0,
    lastClickAt: 0,
    upgrades: { clickPower: 5, workbench: 1, autoWorker: 2 },
    autoSellUnlocked: true,
    autoSellEnabled: true,
    autoSellKeepAbove: 'epic',
    inventory: { socks: 3, headphones: 1 },
    collection: ['snail', 'doll'],
    quotes: ['q_hand'],
    equippedQuotes: ['q_hand'],
    achievements: [],
    prestigeTree: {},
    stage: 3,
    totalUnpacked: 800,
    maxCombo: 40,
    maxBatch: 4,
    legendaryFound: true,
    absurdFound: false,
    audioEnabled: true,
    introSeen: true,
    lastSeen: Date.now() - 60000,
    deliverAccum: 0,
  },
  version: 1,
};

describe('old-save rehydrate', () => {
  it('mounts with a pre-refactor save, ticks, and opens every panel without crashing', async () => {
    localStorage.setItem('chaikuaidi-save', JSON.stringify(OLD_SAVE));

    const { default: App } = await import('../App');
    const { useGame } = await import('../game/store');

    const div = document.createElement('div');
    document.body.appendChild(div);
    const root = createRoot(div);
    await act(async () => {
      root.render(<App />);
    });
    expect(div.textContent).toContain('拆快递');

    // 跑几个 tick
    await act(async () => {
      for (let i = 0; i < 5; i++) useGame.getState().tick(0.1);
    });
    // 点几下
    await act(async () => {
      for (let i = 0; i < 5; i++) useGame.getState().click();
    });

    await act(async () => {
      root.unmount();
    });
    div.remove();

    // 旧存档下逐个渲染所有抽屉面板，确保都不崩
    const panels = await Promise.all([
      import('../ui/Inventory').then((m) => m.Inventory),
      import('../ui/UpgradePanel').then((m) => m.UpgradePanel),
      import('../ui/Shop').then((m) => m.Shop),
      import('../ui/Workshop').then((m) => m.Workshop),
      import('../ui/Refinery').then((m) => m.Refinery),
      import('../ui/Backlog').then((m) => m.Backlog),
      import('../ui/Factory').then((m) => m.Factory),
      import('../ui/Missions').then((m) => m.Missions),
      import('../ui/Quotes').then((m) => m.Quotes),
      import('../ui/Mutations').then((m) => m.Mutations),
      import('../ui/Collection').then((m) => m.Collection),
      import('../ui/Achievements').then((m) => m.Achievements),
      import('../ui/Prestige').then((m) => m.Prestige),
    ]);
    for (const Panel of panels) {
      const pd = document.createElement('div');
      document.body.appendChild(pd);
      const pr = createRoot(pd);
      await act(async () => {
        pr.render(<Panel />);
      });
      await act(async () => {
        pr.unmount();
      });
      pd.remove();
    }

    localStorage.clear();
  });
});
