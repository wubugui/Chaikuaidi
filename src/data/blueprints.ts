import type { MaterialId } from './materials';
import type { GameState } from '../game/state';

export type CraftResult =
  | { type: 'device'; id: string } // 建造一台设备（自动拆转区等）
  | { type: 'tool'; id: string }; // （预留）造工具

export interface BlueprintDef {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  buyCost: number; // 购买图纸的钱
  unlockStage: 1 | 2 | 3 | 4;
  inputs: { item: string; qty: number }[]; // 合成消耗的零件（item id）
  moneyCost: number; // 合成时额外花钱
  result: CraftResult;
  repeatable: boolean; // 设备可重复造（多台更快）
  /** 自动拆转区处理的材质（仅 autoline_* 设备有） */
  autolineMaterial?: MaterialId;
}

export const BLUEPRINTS: BlueprintDef[] = [
  {
    id: 'bp_autoline_paper',
    name: '自动拆纸线图纸',
    emoji: '📐',
    desc: '建一台自动拆纸线，自动啃掉积压区里的纸壳货。',
    buyCost: 400,
    unlockStage: 2,
    inputs: [{ item: 'p_screw', qty: 6 }, { item: 'p_gear', qty: 3 }],
    moneyCost: 300,
    result: { type: 'device', id: 'autoline_paper' },
    repeatable: true,
    autolineMaterial: 'paper',
  },
  {
    id: 'bp_autoline_wood',
    name: '自动拆木线图纸',
    emoji: '📐',
    desc: '建一台自动拆木线，自动处理积压的木质货柜。',
    buyCost: 1800,
    unlockStage: 3,
    inputs: [{ item: 'p_gear', qty: 6 }, { item: 'p_spring', qty: 3 }],
    moneyCost: 1200,
    result: { type: 'device', id: 'autoline_wood' },
    repeatable: true,
    autolineMaterial: 'wood',
  },
  {
    id: 'bp_autoline_metal',
    name: '自动拆金属线图纸',
    emoji: '📐',
    desc: '建一台自动拆金属线，自动处理积压的金属货柜。',
    buyCost: 3000,
    unlockStage: 3,
    inputs: [{ item: 'p_circuit', qty: 5 }, { item: 'p_spring', qty: 4 }],
    moneyCost: 2500,
    result: { type: 'device', id: 'autoline_metal' },
    repeatable: true,
    autolineMaterial: 'metal',
  },
  {
    id: 'bp_sorter',
    name: '零件分拣机图纸',
    emoji: '📐',
    desc: '装一台分拣机，全局零件掉率 +5%（可叠加多台）。',
    buyCost: 2500,
    unlockStage: 3,
    inputs: [{ item: 'p_circuit', qty: 4 }, { item: 'p_servo', qty: 2 }],
    moneyCost: 2000,
    result: { type: 'device', id: 'sorter' },
    repeatable: true,
  },
  {
    id: 'bp_autoline_stone',
    name: '自动拆石线图纸',
    emoji: '📐',
    desc: '建一台自动拆石线，自动处理积压的石矿货柜。',
    buyCost: 9000,
    unlockStage: 4,
    inputs: [{ item: 'p_servo', qty: 4 }, { item: 'p_belt', qty: 3 }],
    moneyCost: 8000,
    result: { type: 'device', id: 'autoline_stone' },
    repeatable: true,
    autolineMaterial: 'stone',
  },
  {
    id: 'bp_pipeline_auto',
    name: '轻型拆卸管线图纸',
    emoji: '🏭',
    desc: '建一条轻型拆卸管线（占厂房 2 格），自动把报废汽车 🚗 / 坠毁客机 ✈️ 慢慢肢解成成堆零件与原料。',
    buyCost: 12000,
    unlockStage: 3,
    inputs: [{ item: 'p_servo', qty: 4 }, { item: 'p_belt', qty: 4 }, { item: 'p_circuit', qty: 4 }],
    moneyCost: 8000,
    result: { type: 'device', id: 'pipeline_auto' },
    repeatable: true,
  },
  {
    id: 'bp_pipeline_heavy',
    name: '重型拆卸管线图纸',
    emoji: '🏭',
    desc: '建一条重型拆卸管线（占厂房 3 格），啃得动搁浅货轮 🚢 / 退役坦克 🚜——慢，但成吨地出货。',
    buyCost: 60000,
    unlockStage: 4,
    inputs: [{ item: 'p_servo', qty: 8 }, { item: 'p_belt', qty: 8 }, { item: 'p_circuit', qty: 6 }, { item: 'p_spring', qty: 6 }],
    moneyCost: 40000,
    result: { type: 'device', id: 'pipeline_heavy' },
    repeatable: true,
  },
];

export const BLUEPRINT_MAP: Record<string, BlueprintDef> = Object.fromEntries(
  BLUEPRINTS.map((b) => [b.id, b]),
);

/** 设备 id -> 它来自哪张图纸（便于 UI 展示设备效果） */
export const DEVICE_BLUEPRINT: Record<string, BlueprintDef> = Object.fromEntries(
  BLUEPRINTS.filter((b) => b.result.type === 'device').map((b) => [b.result.id, b]),
);

/** 每台分拣机提供的零件掉率加成 */
export const SORTER_PART_BONUS = 0.05;
/** 分拣机加成封顶 */
export const SORTER_PART_BONUS_CAP = 0.3;

/**
 * 目标图纸还缺的零件 id 集合（已满足数量的不算）。
 * 没设目标 / 目标非零件输入 → 空集合。
 */
export function neededParts(s: GameState): Set<string> {
  const out = new Set<string>();
  const id = s.targetBlueprint;
  if (!id) return out;
  const bp = BLUEPRINT_MAP[id];
  if (!bp) return out;
  for (const inp of bp.inputs) {
    const have = s.inventory[inp.item] ?? 0;
    if (have < inp.qty) out.add(inp.item);
  }
  return out;
}

/** 分拣机给的零件掉率加成总量（读 state.devices） */
export function sorterBonus(s: GameState): number {
  const n = s.devices?.sorter ?? 0;
  return Math.min(SORTER_PART_BONUS_CAP, n * SORTER_PART_BONUS);
}
