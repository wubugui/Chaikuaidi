import { describe, expect, it } from 'vitest';
import { initialState } from '../state';
import { doClick, doTick, makeParcel, newOut } from '../engine';
import { rollPart, partChance, BASE_PART_CHANCE, sellValue } from '../systems/loot';
import { neededParts, BLUEPRINT_MAP } from '../../data/blueprints';
import { mulberry32 } from '../../lib/rng';
import { ITEM_MAP, PARTS } from '../../data/items';
import { useGame } from '../store';

describe('part drops', () => {
  it('rollPart returns null below chance and a part above it', () => {
    // rand >= chance -> null
    expect(rollPart('paper', () => 0.99)).toBeNull();
    // rand=0 < chance -> a part (first by weight = common)
    const p = rollPart('paper', () => 0);
    expect(p).not.toBeNull();
    expect(p!.kind).toBe('part');
  });

  it('material scales part chance (metal/volatile higher than paper)', () => {
    expect(partChance('paper')).toBeCloseTo(BASE_PART_CHANCE);
    expect(partChance('metal')).toBeGreaterThan(partChance('paper'));
    expect(partChance('volatile')).toBeGreaterThan(partChance('metal'));
  });

  it('sorter bonus raises part chance', () => {
    expect(partChance('paper', 0.1)).toBeGreaterThan(partChance('paper'));
  });

  it('opening a parcel can drop a part into inventory (forced RNG)', () => {
    const d = initialState();
    d.ownedTools = ['hand'];
    d.currentTool = 'hand';
    // rand()=0 makes rollItem deterministic AND rollPart succeed
    const rand = () => 0;
    d.workbench.push(makeParcel('small', () => 0.5, { material: 'metal', sealMax: 1, lootMin: 1, lootMax: 1, pool: ['socks'] }));
    const out = newOut();
    for (let i = 0; i < 10 && d.totalUnpacked === 0; i++) doClick(d, Date.now() + i * 10, rand, out);
    expect(d.totalUnpacked).toBe(1);
    const partCount = PARTS.reduce((a, p) => a + (d.inventory[p.id] ?? 0), 0);
    expect(partCount).toBeGreaterThan(0);
  });
});

describe('blueprints + crafting via store', () => {
  it('buyBlueprint then craftBlueprint consumes parts+money and builds a device', () => {
    useGame.setState({ ...initialState(), offline: null } as any);
    const bp = BLUEPRINT_MAP['bp_autoline_paper'];
    useGame.setState({
      money: 100000, stage: 4,
      inventory: { p_screw: 10, p_gear: 10 },
      blueprints: [], devices: {}, deviceAccum: {}, targetBlueprint: null,
    } as any);

    useGame.getState().buyBlueprint('bp_autoline_paper');
    expect(useGame.getState().blueprints).toContain('bp_autoline_paper');
    const moneyAfterBuy = useGame.getState().money;
    expect(moneyAfterBuy).toBe(100000 - bp.buyCost);

    useGame.getState().craftBlueprint('bp_autoline_paper');
    const s = useGame.getState();
    expect(s.devices['autoline_paper']).toBe(1);
    expect(s.money).toBe(moneyAfterBuy - bp.moneyCost);
    expect(s.inventory['p_screw'] ?? 0).toBe(10 - 6);
    expect(s.inventory['p_gear'] ?? 0).toBe(10 - 3);
  });

  it('craftBlueprint is a no-op without enough parts', () => {
    useGame.setState({ ...initialState(), offline: null } as any);
    useGame.setState({
      money: 100000, stage: 4,
      inventory: { p_screw: 1 }, // not enough
      blueprints: ['bp_autoline_paper'], devices: {}, deviceAccum: {},
    } as any);
    useGame.getState().craftBlueprint('bp_autoline_paper');
    expect(useGame.getState().devices['autoline_paper'] ?? 0).toBe(0);
  });

  it('repeatable device stacks; sorter increments count', () => {
    useGame.setState({ ...initialState(), offline: null } as any);
    useGame.setState({
      money: 1000000, stage: 4,
      inventory: { p_circuit: 20, p_servo: 20 },
      blueprints: ['bp_sorter'], devices: {}, deviceAccum: {},
    } as any);
    useGame.getState().craftBlueprint('bp_sorter');
    useGame.getState().craftBlueprint('bp_sorter');
    expect(useGame.getState().devices['sorter']).toBe(2);
  });
});

describe('target blueprint + neededParts', () => {
  it('setTargetBlueprint requires ownership; neededParts returns unmet ids', () => {
    const s = initialState();
    s.blueprints = ['bp_autoline_paper'];
    s.targetBlueprint = 'bp_autoline_paper';
    s.inventory = { p_screw: 6 }; // gear missing
    const need = neededParts(s);
    expect(need.has('p_gear')).toBe(true);
    expect(need.has('p_screw')).toBe(false); // already met
  });

  it('setTargetBlueprint store action only accepts owned ids or null', () => {
    useGame.setState({ ...initialState(), offline: null } as any);
    useGame.setState({ blueprints: ['bp_autoline_paper'], targetBlueprint: null } as any);
    useGame.getState().setTargetBlueprint('bp_autoline_wood'); // not owned
    expect(useGame.getState().targetBlueprint).toBeNull();
    useGame.getState().setTargetBlueprint('bp_autoline_paper');
    expect(useGame.getState().targetBlueprint).toBe('bp_autoline_paper');
    useGame.getState().setTargetBlueprint(null);
    expect(useGame.getState().targetBlueprint).toBeNull();
  });
});

describe('auto-dismantle line (自动拆转区)', () => {
  it('auto-opens paper backlog parcels over ticks, dropping backlog and producing loot/cash', () => {
    const rand = mulberry32(123);
    const d = initialState();
    d.devices = { autoline_paper: 1 };
    d.deviceEnabled = { autoline_paper: true };
    d.deviceAccum = {};
    // fill backlog with paper parcels
    for (let i = 0; i < 5; i++) {
      d.backlog.push(makeParcel('small', rand, { material: 'paper', sealMax: 5, lootMin: 1, lootMax: 1, pool: ['socks'] }));
    }
    const backlogBefore = d.backlog.length;
    const out = newOut();
    for (let i = 0; i < 40; i++) doTick(d, 1, rand, out);
    expect(d.backlog.length).toBeLessThan(backlogBefore);
    expect(d.totalUnpacked).toBeGreaterThan(0);
    // produced loot (inventory) or cash
    const inv = Object.values(d.inventory).reduce((a, b) => a + b, 0);
    expect(inv + out.cash).toBeGreaterThan(0);
  });

  it('only consumes matching material; leaves other materials in backlog', () => {
    const rand = mulberry32(7);
    const d = initialState();
    d.devices = { autoline_paper: 1 };
    d.deviceEnabled = { autoline_paper: true };
    d.backlog.push(makeParcel('crate', rand, { material: 'wood', sealMax: 50, lootMin: 1, lootMax: 1, pool: ['socks'] }));
    for (let i = 0; i < 40; i++) doTick(d, 1, rand, newOut());
    // wood parcel untouched by paper line
    expect(d.backlog.some((p) => p.material === 'wood')).toBe(true);
  });

  it('a danger parcel fed to an auto-line explodes (no loot, dazed)', () => {
    const rand = mulberry32(5);
    const d = initialState();
    d.currentTool = 'disarm'; // even with a safe tool equipped, an auto-line cannot defuse
    d.ownedTools = ['hand', 'disarm'];
    d.devices = { autoline_metal: 1 };
    d.deviceEnabled = { autoline_metal: true };
    d.backlog.push(makeParcel('crate', rand, { material: 'metal', danger: true, sealMax: 10, lootMin: 1, lootMax: 1, pool: ['milchip'] }));
    const out = newOut();
    for (let i = 0; i < 40 && d.dazedUntil === 0; i++) doTick(d, 1, rand, out);
    expect(d.dazedUntil).toBeGreaterThan(0); // it blew up
    expect(d.backlog.length).toBe(0); // consumed
  });

  it('leaves a mutation-gated parcel in backlog when the mutation is not owned', () => {
    const rand = mulberry32(9);
    const d = initialState();
    d.mutations = []; // no brasshead
    d.devices = { autoline_metal: 1 };
    d.deviceEnabled = { autoline_metal: true };
    d.backlog.push(makeParcel('crate', rand, { material: 'metal', requireMutation: 'brasshead', sealMax: 10, lootMin: 1, lootMax: 1, pool: ['titanium'] }));
    for (let i = 0; i < 40; i++) doTick(d, 1, rand, newOut());
    expect(d.backlog.some((p) => p.requireMutation === 'brasshead')).toBe(true);
  });

  it('a device is DISABLED by default and does NOT tick until toggleDevice enables it', () => {
    const rand = mulberry32(321);
    const d = initialState();
    d.devices = { autoline_paper: 1 };
    // 注意：未设 deviceEnabled（默认关停）
    for (let i = 0; i < 5; i++) {
      d.backlog.push(makeParcel('small', rand, { material: 'paper', sealMax: 5, lootMin: 1, lootMax: 1, pool: ['socks'] }));
    }
    const before = d.backlog.length;
    for (let i = 0; i < 40; i++) doTick(d, 1, rand, newOut());
    expect(d.backlog.length).toBe(before); // 停工：一件都没拆
    expect(d.totalUnpacked).toBe(0);

    // 开启后才开始消化积压
    d.deviceEnabled = { autoline_paper: true };
    for (let i = 0; i < 40; i++) doTick(d, 1, rand, newOut());
    expect(d.backlog.length).toBeLessThan(before);
    expect(d.totalUnpacked).toBeGreaterThan(0);
  });

  it('craftBlueprint builds a device but leaves it OFF by default', () => {
    useGame.setState({ ...initialState(), offline: null } as any);
    const bp = BLUEPRINT_MAP['bp_autoline_paper'];
    const inv: Record<string, number> = {};
    for (const inp of bp.inputs) inv[inp.item] = inp.qty;
    useGame.setState({
      stage: 4, money: 1_000_000, blueprints: ['bp_autoline_paper'],
      devices: {}, deviceEnabled: {}, deviceAccum: {}, inventory: inv,
    } as any);
    useGame.getState().craftBlueprint('bp_autoline_paper');
    const s = useGame.getState();
    expect(s.devices['autoline_paper']).toBe(1);
    expect(s.deviceEnabled['autoline_paper']).toBeFalsy(); // 默认停工
    // 开关切换
    useGame.getState().toggleDevice('autoline_paper');
    expect(useGame.getState().deviceEnabled['autoline_paper']).toBe(true);
    useGame.getState().toggleDevice('autoline_paper');
    expect(useGame.getState().deviceEnabled['autoline_paper']).toBe(false);
  });
});

describe('part selling stays cheap (flat baseValue, not rarity-multiplied)', () => {
  it('an epic part sells for ~baseValue, not 40x', () => {
    const servo = ITEM_MAP['p_servo'];
    expect(servo.kind).toBe('part');
    // sellValue path for parts ignores rarity sellMult
    expect(sellValue(servo, servo.rarity, 0)).toBe(servo.baseValue);
  });
});

describe('makeParcel 2-arg still works', () => {
  it('accepts (size, rand) without opts', () => {
    const p = makeParcel('small', () => 0.5);
    expect(p.size).toBe('small');
  });
});
