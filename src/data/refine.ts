/**
 * 元素提炼配方：把巨型货拆出来的原料/零件精炼成元素（铁/铜/硅/钛/稀土/浓缩铀）。
 * - tier1 可徒手手搓（任何地方都能 refine）。
 * - tier2（稀土/浓缩铀）需要建好「提炼炉」refinery 才能跑。
 * 提炼炉每隔 REFINE_INTERVAL 自动跑一条当前库存满足的配方（优先 tier1，再 tier2）。
 */
export interface RefineRecipe {
  id: string;
  name: string;
  inputs: { item: string; qty: number }[];
  output: { item: string; qty: number };
  tier: 1 | 2;
}

export const REFINES: RefineRecipe[] = [
  { id: 'rf_iron',     name: '熔炼铁',   inputs: [{ item: 'r_scrapiron', qty: 3 }], output: { item: 'e_iron', qty: 1 }, tier: 1 },
  { id: 'rf_copper',   name: '抽提铜',   inputs: [{ item: 'r_wireharness', qty: 2 }, { item: 'r_scrapiron', qty: 1 }], output: { item: 'e_copper', qty: 1 }, tier: 1 },
  { id: 'rf_silicon',  name: '提纯硅',   inputs: [{ item: 'r_plastic', qty: 2 }, { item: 'p_circuit', qty: 1 }], output: { item: 'e_silicon', qty: 1 }, tier: 1 },
  { id: 'rf_titanium', name: '精炼钛',   inputs: [{ item: 'r_alloyblock', qty: 2 }], output: { item: 'e_titanium', qty: 1 }, tier: 1 },
  { id: 'rf_rare',     name: '分离稀土', inputs: [{ item: 'r_alloyblock', qty: 2 }, { item: 'e_copper', qty: 1 }], output: { item: 'e_rare', qty: 1 }, tier: 2 },
  { id: 'rf_uranium',  name: '离心浓缩', inputs: [{ item: 'e_rare', qty: 2 }, { item: 'e_titanium', qty: 2 }], output: { item: 'e_uranium', qty: 1 }, tier: 2 },
];

export const REFINE_MAP: Record<string, RefineRecipe> = Object.fromEntries(
  REFINES.map((r) => [r.id, r]),
);

/** 提炼炉每隔多少秒自动跑一条配方 */
export const REFINE_INTERVAL = 3; // 秒
/** 提炼炉占用厂房空间 */
export const REFINERY_SPACE = 2;
/** 提炼炉设备 id */
export const REFINERY_DEVICE = 'refinery';
