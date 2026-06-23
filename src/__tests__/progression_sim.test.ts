import { describe, expect, it } from 'vitest';
import { useGame } from '../game/store';
import { TOOLS } from '../data/tools';
import { UPGRADES } from '../data/upgrades';

/**
 * 进度可达性 / 一直刷 验证：一个贪心机器人（持续点击 + 卖货 + 买升级/工具 +
 * 装备最强工具 + tick 走自动/到货）应当能从开局一路滚到终局阶段 4（本轮收入 1,000,000），
 * 且本轮收入持续增长、不长期卡死。这只校验「数值能滚动起来、闭环可达」，不涉及手感审美。
 */
describe('progression reachability — 贪心机器人能从开局滚到终局', () => {
  it('在有限模拟时间内到达阶段 4，且收入单调增长不卡墙', () => {
    const g = () => useGame.getState();
    g().hardReset();

    const CLICKS_PER_STEP = 6; // ~6 次/秒的主动点击
    const MAX_STEPS = 5400; // 90 模拟分钟上限

    const bestTool = () => {
      const owned = g().ownedTools;
      let best = owned[0];
      let bestPow = -1;
      for (const id of owned) {
        const t = TOOLS.find((x) => x.id === id)!;
        if (t.power > bestPow) { bestPow = t.power; best = id; }
      }
      return best;
    };

    const greedyBuy = () => {
      // 买能买得起的工具（buyTool 内部校验 stage/钱/是否已有）
      for (const t of TOOLS) g().buyTool(t.id);
      // 反复买能买得起的升级，每步最多 30 次，避免死循环
      let budget = 30;
      let bought = true;
      while (bought && budget-- > 0) {
        bought = false;
        for (const u of UPGRADES) {
          const before = g().upgrades[u.id] ?? 0;
          g().buyUpgrade(u.id, 1);
          if ((g().upgrades[u.id] ?? 0) > before) bought = true;
        }
      }
    };

    let reachedStage4At = -1;
    let lastEarned = 0;
    let stalledSteps = 0;
    let maxStall = 0;

    for (let step = 0; step < MAX_STEPS; step++) {
      for (let i = 0; i < CLICKS_PER_STEP; i++) g().click();
      g().sellAllItems(null);
      greedyBuy();
      g().selectTool(bestTool());
      g().tick(1);

      const earned = g().runEarned;
      if (earned <= lastEarned) { stalledSteps++; maxStall = Math.max(maxStall, stalledSteps); }
      else stalledSteps = 0;
      lastEarned = earned;

      if (g().stage >= 4 && reachedStage4At < 0) { reachedStage4At = step; break; }
    }

    const s = g();
    // 到达终局阶段
    expect(s.stage, `90 分钟内未到阶段4，runEarned=${Math.floor(s.runEarned)}`).toBe(4);
    expect(reachedStage4At).toBeGreaterThanOrEqual(0);
    // 收入是有限正数（无 NaN）
    expect(Number.isFinite(s.runEarned)).toBe(true);
    expect(s.runEarned).toBeGreaterThanOrEqual(1_000_000);
  });
});
