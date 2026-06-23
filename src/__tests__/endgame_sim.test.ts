import { describe, expect, it } from 'vitest';
import { useGame } from '../game/store';
import { REFINES } from '../data/refine';

/**
 * 终局自给「一直刷」可达性：从一个已建好首批设备（拆卸管线/金属自动线/提炼炉）的
 * 阶段4 玩家出发，持续喂巨型货 + 提炼原料，验证终局产线的吞吐足以在有限模拟时间内
 * 攒出一发军火（EMP = e_copper×4 + e_silicon×4 + p_servo×3）。
 * 这校验的是「终局产线速率够不够、闭环能不能自我维持」，纯客观，不涉及手感。
 */
describe('endgame self-sustaining loop — 终局产线能持续产出军火', () => {
  it('在有限模拟时间内靠产线攒出一发 EMP', () => {
    const g = () => useGame.getState();
    g().hardReset();

    // 引导到「已铺好首批产线」的阶段4 玩家状态
    useGame.setState({
      stage: 4,
      money: 20_000_000,
      runEarned: 2_000_000,
      ownedTools: ['hand', 'cutter', 'crowbar', 'grinder', 'chisel', 'torch'],
      currentTool: 'torch',
      factorySpace: 16,
      devices: { pipeline_auto: 1, autoline_metal: 1, refinery: 1, sorter: 1 },
      deviceAccum: {},
      blueprints: [
        'bp_autoline_metal', 'bp_pipeline_auto', 'bp_refinery', 'bp_sorter', 'bp_emp',
      ],
      upgrades: { autoWorker: 12, autoPower: 8, workbench: 6, sellPrice: 10, luck: 8 },
    });

    const tier1 = REFINES.filter((r) => r.tier === 1).map((r) => r.id);
    const MAX_STEPS = 7200; // 2 模拟小时上限
    let crafted = -1;

    for (let step = 0; step < MAX_STEPS; step++) {
      // 持续供货：积压里待拆的巨型货不足就再买一台报废汽车（喂管线 → 原料/零件）
      const pending = g().backlog.filter((p) => p.requirePipeline === 'pipeline_auto').length;
      if (pending < 2) g().buyGiant('g_car');
      // 偶尔买个金属货柜，给金属自动线/手开补点零件
      if (step % 20 === 0) g().buyContainer('safe');

      // 手动提炼所有 tier1 配方（原料 → 基础元素）
      for (const id of tier1) {
        let guard = 20;
        while (g().refine(id) !== false && guard-- > 0) { /* 反复炼到没料 */ }
      }

      g().tick(1);

      // 凑齐就造 EMP
      g().craftBlueprint('bp_emp');
      if ((g().ordnance['emp'] ?? 0) >= 1) { crafted = step; break; }
    }

    const s = g();
    expect(
      s.ordnance['emp'] ?? 0,
      `2 小时内没造出 EMP；p_servo=${s.inventory['p_servo'] ?? 0} e_copper=${s.inventory['e_copper'] ?? 0} e_silicon=${s.inventory['e_silicon'] ?? 0}`,
    ).toBeGreaterThanOrEqual(1);
    expect(crafted).toBeGreaterThanOrEqual(0);
  });
});
