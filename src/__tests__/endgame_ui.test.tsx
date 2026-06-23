// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { useGame } from '../game/store';
import { makeParcel } from '../game/engine';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

/** 富终局状态：进行中的远征 + 设备 + 军火 + 黑市在场 + 积压区有巨型货/离谱货 */
function seedEndgame() {
  const car = makeParcel('crate', () => 0.5, {
    material: 'metal', emoji: '🚗', label: '报废汽车', sealMax: 9999,
    lootMin: 3, lootMax: 5, requirePipeline: 'pipeline_auto', space: 2,
  });
  const ufo = makeParcel('crate', () => 0.5, {
    material: 'anomaly', emoji: '🛸', label: '外星飞船', sealMax: 9999,
    lootMin: 3, lootMax: 5, requireOrdnance: 'nuke', space: 4,
  });
  useGame.setState({
    stage: 4,
    money: 50_000_000,
    factorySpace: 12,
    inventory: { p_screw: 40, p_circuit: 20, e_iron: 10, e_titanium: 8, e_uranium: 4, r_scrapiron: 30, socks: 5 },
    backlog: [car, ufo],
    devices: { autoline_paper: 2, pipeline_auto: 1, refinery: 1 },
    deviceAccum: {},
    ordnance: { nuke: 1, railgun: 2 },
    blueprints: ['bp_autoline_paper', 'bp_pipeline_auto', 'bp_refinery', 'bp_nuke'],
    targetBlueprint: 'bp_nuke',
    missions: [{ id: 'm_launchpad', endsAt: Date.now() + 60_000 }],
    doneMissions: ['m_bridge'],
    boughtUniques: ['a_gundam'],
    merchant: {
      until: Date.now() + 60_000,
      offers: [
        { id: 'meteor', kind: 'container', price: 17_500, stock: 2 },
        { id: 'g_ship', kind: 'giant', price: 350_000, stock: 1 },
        { id: 'a_ufo', kind: 'absurd', price: 2_450_000, stock: 1 },
      ],
    },
    mutations: ['mecharm', 'brasshead'],
  });
}

async function loadPanels(): Promise<Record<string, () => JSX.Element>> {
  const [F, Mi, Me, W, R, B, I, C, A, P, Mu] = await Promise.all([
    import('../ui/Factory'), import('../ui/Missions'), import('../ui/Merchant'),
    import('../ui/Workshop'), import('../ui/Refinery'), import('../ui/Backlog'),
    import('../ui/Inventory'), import('../ui/Collection'), import('../ui/Achievements'),
    import('../ui/Prestige'), import('../ui/Mutations'),
  ]);
  return {
    Factory: F.Factory, Missions: Mi.Missions, Merchant: Me.Merchant, Workshop: W.Workshop,
    Refinery: R.Refinery, Backlog: B.Backlog, Inventory: I.Inventory, Collection: C.Collection,
    Achievements: A.Achievements, Prestige: P.Prestige, Mutations: Mu.Mutations,
  };
}

async function renderPanel(Panel: () => JSX.Element) {
  const div = document.createElement('div');
  document.body.appendChild(div);
  const root = createRoot(div);
  await act(async () => {
    root.render(<Panel />);
  });
  const text = div.textContent ?? '';
  await act(async () => {
    root.unmount();
  });
  div.remove();
  return text;
}

describe('endgame UI 富状态渲染 — 所有面板不崩', () => {
  it('每个面板在终局富状态下都能渲染', async () => {
    useGame.getState().hardReset();
    seedEndgame();
    const panels = await loadPanels();
    for (const name of Object.keys(panels)) {
      const text = await renderPanel(panels[name]);
      expect(typeof text).toBe('string'); // 渲染未抛异常即通过
    }
  });

  it('SellerDialog 与 App 整体在终局态挂载不崩', async () => {
    useGame.getState().hardReset();
    seedEndgame();
    const { default: App } = await import('../App');
    const div = document.createElement('div');
    document.body.appendChild(div);
    const root = createRoot(div);
    await act(async () => {
      root.render(<App />);
    });
    expect(div.textContent).toContain('拆快递');
    // 跑几个 tick：远征推进 / 设备运转 / 黑市倒计时
    await act(async () => {
      for (let i = 0; i < 10; i++) useGame.getState().tick(0.1);
    });
    await act(async () => {
      root.unmount();
    });
    div.remove();
  });
});
