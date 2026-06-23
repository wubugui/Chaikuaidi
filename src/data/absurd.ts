import type { MaterialId } from './materials';
import type { SellerLine } from './missions';

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
  unique?: boolean; // 独一无二：买过一次后从黑市消失
  seller?: SellerLine; // 荒诞卖家对白（买入时弹出）
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
    unique: true,
    seller: {
      name: '黑衣人',
      emoji: '🕴️',
      lines: [
        '机体一具，十八米，装甲等级最高，常规手段啃不动，只有轨道炮够当量。',
        '前任机师的私人物品我都清空了，驾驶舱那枚红钮除外——没人敢拆。',
        '整具出，不零售。轰开归您，里面的东西也归您。来路别问。',
      ],
    },
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
    unique: true,
    seller: {
      name: '黑衣人',
      emoji: '🕴️',
      lines: [
        '活体金属载具一台，有自主意识，运输全程上了电磁封印。',
        '它能听懂话，也能签字，但合同我只跟您签，不跟它签。',
        '处理前先上 EMP 把它瘫了。它要是跑了，我概不追回。现结。',
      ],
    },
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
    unique: true,
    seller: {
      name: '黑衣人',
      emoji: '🕴️',
      lines: [
        '飞行器一台，非本星制造，反重力引擎尚有余温。',
        '舱门是种合金，常规手段打不开，得够当量的军火才行。',
        '过户文件齐全，籍贯仙女座，落户您自理。来路，别问。',
      ],
    },
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
    unique: true,
    // 黑方碑：黑衣人也讲不清它
    seller: {
      name: '黑衣人',
      emoji: '🕴️',
      lines: [
        '这一件，我不报参数。',
        '我经手过很多东西。它是唯一一件，我经手的时候，它在看我。',
        '钱您付。合同它自己会签——签在哪，您回头就知道了。',
      ],
    },
    // 轰开黑方碑额外奖励大额信誉
  },
];

export const ABSURD_MAP: Record<string, AbsurdDef> = Object.fromEntries(
  ABSURDS.map((a) => [a.id, a]),
);

/** 轰开黑方碑额外发放的信誉奖励（转生级甜头） */
export const MONOLITH_REPUTATION = 50;
