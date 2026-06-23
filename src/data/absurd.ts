import type { MaterialId } from './materials';

/**
 * 离谱货：暴力/管线统统拆不开（硬门 requireOrdnance）。
 * 只能用对应军火「轰开」——轰开 = 大爆闪 + 高概率变异（闭环高潮）。
 * 离谱货占厂房空间，只能从 🕶️ 黑市商人处抢到（merchantOnly，限量 1）。
 */
export interface AbsurdDef {
  id: string;
  name: string;
  emoji: string;
  flavor: string;
  price: number;
  material: MaterialId;
  space: number;
  sealMax: number;
  lootMin: number;
  lootMax: number;
  luckBonus: number;
  pool: string[];
  requireOrdnance: string; // 必须的军火 id
  partBonus: number;
  unlockStage: 1 | 2 | 3 | 4;
}

export const ABSURDS: AbsurdDef[] = [
  {
    id: 'a_gundam',
    name: '高达',
    emoji: '🤖',
    flavor: '十八米高的机甲斜插在你后院的菜地里，装甲厚到只有轨道炮才啃得动。拆开它，够你吃一辈子。',
    price: 1_500_000,
    material: 'metal',
    space: 3,
    sealMax: 800_000,
    lootMin: 26,
    lootMax: 40,
    luckBonus: 1.4,
    pool: [
      'mechcore', 'p_servo', 'p_belt', 'p_circuit', 'e_titanium', 'e_rare',
      'r_alloyblock', 'titanium', 'milchip', 'gpu', 'goldbar',
    ],
    requireOrdnance: 'railgun',
    partBonus: 0.6,
    unlockStage: 4,
  },
  {
    id: 'a_transformer',
    name: '变形金刚',
    emoji: '🚙',
    flavor: '它伪装成一辆破皮卡，但发动机盖下面是会动的活体金属。先用 EMP 把它瘫了，再拆——不然它会跑。',
    price: 2_200_000,
    material: 'metal',
    space: 3,
    sealMax: 1_100_000,
    lootMin: 28,
    lootMax: 44,
    luckBonus: 1.5,
    pool: [
      'persona', 'livingmetal', 'milchip', 'p_circuit', 'p_servo', 'e_titanium',
      'e_silicon', 'e_rare', 'alienalloy', 'gpu',
    ],
    requireOrdnance: 'emp',
    partBonus: 0.6,
    unlockStage: 4,
  },
  {
    id: 'a_ufo',
    name: '外星飞船',
    emoji: '🛸',
    flavor: '坠在戈壁滩上还嗡嗡冒蓝光，舱门是种你没见过的合金。只有核爆的当量能把它撬开。',
    price: 3_500_000,
    material: 'anomaly',
    space: 4,
    sealMax: 1_800_000,
    lootMin: 30,
    lootMax: 48,
    luckBonus: 1.8,
    pool: [
      'alienalloy', 'ufo', 'alien', 'livingmetal', 'e_rare', 'e_uranium',
      'antimatter', 'milchip', 'goldbar',
    ],
    requireOrdnance: 'nuke',
    partBonus: 0.6,
    unlockStage: 4,
  },
  {
    id: 'a_monolith',
    name: '黑方碑',
    emoji: '⬛',
    flavor: '一块完美的黑色长方体，没有缝、没有重量、不反光。砸它毫无意义——只有核爆的瞬间它才会「让开」。里面是什么？没人活着回答过。',
    price: 6_000_000,
    material: 'anomaly',
    space: 2,
    sealMax: 3_000_000,
    lootMin: 18,
    lootMax: 30,
    luckBonus: 2.6,
    pool: [
      'antimatter', 'persona', 'ufo', 'alien', 'e_uranium', 'diamond',
      'goldbar', 'carkey',
    ],
    requireOrdnance: 'nuke',
    partBonus: 0.3,
    unlockStage: 4,
    // 轰开黑方碑额外奖励大额信誉
  },
];

export const ABSURD_MAP: Record<string, AbsurdDef> = Object.fromEntries(
  ABSURDS.map((a) => [a.id, a]),
);

/** 轰开黑方碑额外发放的信誉奖励（转生级甜头） */
export const MONOLITH_REPUTATION = 50;
