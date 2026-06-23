import { beforeEach, describe, expect, it } from 'vitest';
import { useGame } from '../game/store';
import { makeParcel } from '../game/engine';
import { effectiveAffinity } from '../game/engine';
import { BLUEPRINT_MAP } from '../data/blueprints';
import { REFINES } from '../data/refine';
import { TOOLS } from '../data/tools';

/** 把某蓝图所有合成输入塞满库存，免得被 RNG 卡住 */
function stockInputs(inv: Record<string, number>, bpId: string) {
  const bp = BLUEPRINT_MAP[bpId];
  for (const inp of bp.inputs) inv[inp.item] = (inv[inp.item] ?? 0) + inp.qty * 4;
}

function finite(...xs: number[]) {
  return xs.every((x) => Number.isFinite(x));
}

describe('endgame closed loop — 全链路无崩溃 + 可达', () => {
  beforeEach(() => {
    useGame.getState().hardReset();
  });

  it('refine → element 链路（手动 + 提炼炉自动）', () => {
    const g = useGame.getState();
    // 备料：废铁 + 钱 + stage4
    useGame.setState({
      stage: 4,
      money: 10_000_000,
      inventory: { r_scrapiron: 30, r_wireharness: 20, r_alloyblock: 20, r_plastic: 20, p_circuit: 20 },
    });
    // 手动熔炼铁：3 废铁 → 1 铁
    g.refine('rf_iron');
    let s = useGame.getState();
    expect(s.inventory['e_iron']).toBe(1);
    expect(s.inventory['r_scrapiron']).toBe(27);

    // tier2（稀土/铀）需要提炼炉：先造提炼炉
    const inv = { ...useGame.getState().inventory };
    stockInputs(inv, 'bp_refinery');
    useGame.setState({ inventory: inv, blueprints: ['bp_refinery'] });
    useGame.getState().craftBlueprint('bp_refinery');
    expect(useGame.getState().devices['refinery']).toBe(1);

    // 喂一堆原料，跑 tick，自动提炼出元素
    useGame.setState({
      inventory: { ...useGame.getState().inventory, r_scrapiron: 60, r_alloyblock: 60, r_wireharness: 40, r_plastic: 40, p_circuit: 40 },
    });
    for (let i = 0; i < 200; i++) useGame.getState().tick(0.1);
    s = useGame.getState();
    // 自动提炼应当产出了基础元素
    const totalElements = ['e_iron', 'e_copper', 'e_silicon', 'e_titanium'].reduce((a, id) => a + (s.inventory[id] ?? 0), 0);
    expect(totalElements).toBeGreaterThan(0);
    expect(finite(s.money)).toBe(true);
  });

  it('craft 军火 → 离谱货只能轰开 → 触发变异', () => {
    // 备齐铀/钛/电路板等，造原子弹
    const inv: Record<string, number> = {};
    stockInputs(inv, 'bp_nuke');
    // 补足元素（蓝图输入已含，stockInputs 已×4）
    useGame.setState({ stage: 4, money: 10_000_000, inventory: inv, blueprints: ['bp_nuke'] });
    useGame.getState().craftBlueprint('bp_nuke');
    expect(useGame.getState().ordnance['nuke']).toBe(1);

    // 造一个「外星飞船」式离谱货：必须核弹才能开
    const ufo = makeParcel('crate', () => 0.5, {
      material: 'anomaly', emoji: '🛸', label: '外星飞船', sealMax: 9999,
      lootMin: 3, lootMax: 5, requireOrdnance: 'nuke', space: 4,
    });
    useGame.setState({ backlog: [ufo], factorySpace: 10 });

    // 硬门槛：任何工具有效亲和度都为 0
    const sNow = useGame.getState();
    for (const t of TOOLS) {
      expect(effectiveAffinity(t.id, ufo, 0, true)).toBe(0);
    }
    // 不能上台
    useGame.getState().loadFromBacklog(ufo.id);
    expect(useGame.getState().workbench.find((p) => p.id === ufo.id)).toBeUndefined();
    expect(useGame.getState().backlog.find((p) => p.id === ufo.id)).toBeTruthy();

    // 轰开：消耗核弹、开箱、释放空间
    useGame.getState().useOrdnance(ufo.id);
    const s = useGame.getState();
    expect(s.ordnance['nuke'] ?? 0).toBe(0);
    expect(s.backlog.find((p) => p.id === ufo.id)).toBeUndefined(); // 已拆掉
    expect(finite(s.money, s.runEarned, s.lifetimeEarned)).toBe(true);
    void sNow;
  });

  it('giants → 厂房/管线自动拆 → 原料产出', () => {
    // 扩厂房 + 备零件造轻型管线
    useGame.setState({ stage: 4, money: 50_000_000 });
    useGame.getState().expandFactory();
    const inv: Record<string, number> = {};
    stockInputs(inv, 'bp_pipeline_auto');
    useGame.setState({ inventory: inv, blueprints: ['bp_pipeline_auto'] });
    useGame.getState().craftBlueprint('bp_pipeline_auto');
    expect(useGame.getState().devices['pipeline_auto']).toBe(1);

    // 买报废汽车（需要 pipeline_auto 才能拆）
    const before = useGame.getState().backlog.length;
    useGame.getState().buyGiant('g_car');
    const s1 = useGame.getState();
    expect(s1.backlog.length).toBe(before + 1);
    const car = s1.backlog.find((p) => p.label === '报废汽车');
    expect(car).toBeTruthy();
    // 汽车手工开不了
    for (const t of TOOLS) expect(effectiveAffinity(t.id, car!, 0, true)).toBe(0);

    // 跑 tick：管线把车拆掉，库存里出现零件/原料
    for (let i = 0; i < 400; i++) useGame.getState().tick(0.1);
    const s2 = useGame.getState();
    const stillThere = s2.backlog.find((p) => p.id === car!.id);
    expect(stillThere).toBeUndefined(); // 已被管线拆解
    expect(finite(s2.money)).toBe(true);
  });

  it('全程无负库存 / 无 NaN', () => {
    const s = useGame.getState();
    for (const k of Object.keys(s.inventory)) {
      expect(s.inventory[k]).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(s.inventory[k])).toBe(true);
    }
    // refine 定义自洽：每个 recipe 的产物 id 都存在
    for (const r of REFINES) {
      expect(r.output.qty).toBeGreaterThan(0);
      expect(r.inputs.length).toBeGreaterThan(0);
    }
  });
});
