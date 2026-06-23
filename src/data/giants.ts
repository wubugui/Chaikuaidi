import type { MaterialId } from './materials';

/**
 * 巨型货物：暴力基本拆不开（硬门槛）。
 * 必须建造对应的「拆卸管线」设备，由管线随时间自动把它拆成一堆零件 + 原料。
 * 巨型货 + 管线都占用「厂房」空间，需花钱扩建厂房才放得下。
 */
export interface GiantDef {
  id: string;
  name: string;
  emoji: string;
  flavor: string;
  price: number;
  material: MaterialId;
  space: number; // 占用厂房格子
  sealMax: number;
  lootMin: number;
  lootMax: number;
  luckBonus: number;
  pool: string[]; // 主题掉落（含大量零件/原料）
  requirePipeline: string; // 必须的拆卸管线 device id
  partBonus: number; // 额外零件掉率加成（巨型货爆很多零件）
  unlockStage: 1 | 2 | 3 | 4;
  merchantOnly?: boolean;
}

export const GIANTS: GiantDef[] = [
  {
    id: 'g_car',
    name: '报废汽车',
    emoji: '🚗',
    flavor: '挡风玻璃裂成蛛网，后备箱里还塞着前车主没来得及处理的「东西」。一锤子下去只会震麻你的手——这玩意儿得上管线慢慢肢解。',
    price: 60000,
    material: 'metal',
    space: 2,
    sealMax: 40000,
    lootMin: 14,
    lootMax: 20,
    luckBonus: 0.8,
    pool: [
      'r_scrapiron', 'r_wireharness', 'r_plastic', 'p_screw', 'p_gear', 'p_spring',
      'p_circuit', 'battery', 'carkey', 'cashwad', 'gpu',
    ],
    requirePipeline: 'pipeline_auto',
    partBonus: 0.4,
    unlockStage: 3,
  },
  {
    id: 'g_plane',
    name: '坠毁客机',
    emoji: '✈️',
    flavor: '机身在田里犁出一道焦黑的沟，黑匣子还在滴滴作响。行李架里那些没人认领的箱子，现在归你了。',
    price: 320000,
    material: 'metal',
    space: 3,
    sealMax: 160000,
    lootMin: 22,
    lootMax: 34,
    luckBonus: 1.2,
    pool: [
      'r_scrapiron', 'r_wireharness', 'r_alloyblock', 'r_plastic', 'p_circuit',
      'p_servo', 'p_belt', 'titanium', 'milchip', 'gpu', 'diamond', 'goldbar',
    ],
    requirePipeline: 'pipeline_auto',
    partBonus: 0.5,
    unlockStage: 4,
    merchantOnly: true,
  },
  {
    id: 'g_ship',
    name: '搁浅货轮',
    emoji: '🚢',
    flavor: '半截泡在退潮的泥滩里，集装箱锈死在甲板上。光是把锚链拖回厂房就用了三天——拆它得用重型管线，慢，但成吨地出货。',
    price: 500000,
    material: 'metal',
    space: 4,
    sealMax: 260000,
    lootMin: 30,
    lootMax: 46,
    luckBonus: 1.0,
    pool: [
      'r_scrapiron', 'r_wireharness', 'r_alloyblock', 'r_plastic', 'p_spring',
      'p_circuit', 'p_servo', 'p_belt', 'titanium', 'cashwad', 'goldbar', 'gpu',
    ],
    requirePipeline: 'pipeline_heavy',
    partBonus: 0.5,
    unlockStage: 4,
    merchantOnly: true,
  },
  {
    id: 'g_tank',
    name: '退役坦克',
    emoji: '🚜',
    flavor: '炮管被焊死，但装甲是实打实的好料。某个不愿透露姓名的「渠道」把它运到了你后院——别问出处，拆就完了。',
    price: 420000,
    material: 'metal',
    space: 3,
    sealMax: 220000,
    lootMin: 24,
    lootMax: 38,
    luckBonus: 1.1,
    pool: [
      'r_scrapiron', 'r_alloyblock', 'p_spring', 'p_circuit', 'p_servo', 'p_belt',
      'titanium', 'milchip', 'alienalloy', 'goldbar',
    ],
    requirePipeline: 'pipeline_heavy',
    partBonus: 0.55,
    unlockStage: 4,
    merchantOnly: true,
  },
];

export const GIANT_MAP: Record<string, GiantDef> = Object.fromEntries(
  GIANTS.map((g) => [g.id, g]),
);

/** 一个 device id 是否为拆卸管线（用于厂房空间核算/tick） */
export const PIPELINE_SPACE: Record<string, number> = {
  pipeline_auto: 2,
  pipeline_heavy: 3,
};

/** 管线名（UI 提示用） */
export const PIPELINE_NAME: Record<string, string> = {
  pipeline_auto: '轻型拆卸管线',
  pipeline_heavy: '重型拆卸管线',
};

/** 厂房基础空间 */
export const FACTORY_BASE_SPACE = 4;
/** 每次扩建增加的空间 */
export const FACTORY_EXPAND_STEP = 2;
/** 扩建基础价；成本随已扩建次数指数增长 */
export const FACTORY_EXPAND_BASE_COST = 30000;
export const FACTORY_EXPAND_GROWTH = 1.8;

/** 当前厂房已扩建的次数（由 factorySpace 反推） */
export function factoryExpansions(factorySpace: number): number {
  return Math.max(0, Math.round((factorySpace - FACTORY_BASE_SPACE) / FACTORY_EXPAND_STEP));
}

/** 下一次扩建厂房的花费 */
export function factoryExpandCost(factorySpace: number): number {
  const n = factoryExpansions(factorySpace);
  return Math.round(FACTORY_EXPAND_BASE_COST * Math.pow(FACTORY_EXPAND_GROWTH, n));
}

/** 管线每隔多少秒拆掉一件巨型货 */
export const PIPELINE_INTERVAL = 3; // 秒
