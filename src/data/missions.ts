/**
 * 离场远征（off-site expeditions）：有些东西大到根本运不回厂房——你只能「亲自前往」。
 * 派出一支远征队，花一笔出勤费，远征跑一段时间后返还一堆战利品 + 一件独一无二的收藏。
 * 每个地点都是一次性的（拆一次就没了），且每个都配一个一本正经胡说八道的卖家。
 */

/** 卖家对白：一个角色，几句台词 */
export interface SellerLine {
  name: string;
  emoji: string;
  lines: string[];
}

export interface MissionDef {
  id: string;
  name: string;
  emoji: string;
  flavor: string;
  cost: number; // 出勤费（钱）
  durationSec: number; // 远征耗时
  unlockStage: 1 | 2 | 3 | 4;
  /** 轻量前置：某远征已完成 / 拥有某军火 / 拥有某变异 */
  requires?: { mission?: string; ordnance?: string; mutation?: string };
  rewards: {
    cash?: number;
    parts?: number; // 随机塞入库存的零件数量
    elements?: number; // 随机塞入库存的元素数量
    pool: string[]; // 主题掉落池（item id），抽样若干进库存
    unique: string; // 独一无二的收藏品 id（见 items.ts u_*）
    reputation?: number;
  };
  seller: SellerLine;
}

export const MISSIONS: MissionDef[] = [
  {
    id: 'm_launchpad',
    name: '火箭发射台',
    emoji: '🚀',
    flavor: '一座完整的发射台，塔架、导流槽、加注系统俱全。原计划今年首飞，资金断了，设备却一天三检从没落下。你得亲自过去，一块块拆运回来。',
    cost: 800_000,
    durationSec: 90,
    unlockStage: 3,
    rewards: {
      cash: 200_000,
      parts: 4,
      elements: 2,
      pool: ['titanium', 'milchip', 'p_servo', 'p_circuit', 'e_titanium', 'goldbar', 'gpu'],
      unique: 'u_countdown',
      reputation: 2,
    },
    seller: {
      name: '发射台总工程师',
      emoji: '🚀',
      lines: [
        '您好，我是这个发射台的总工。塔架、导流槽、加注系统，都按国标建的。',
        '原计划今年首飞，窗口错过了，资金也断了，但设备一天三检，从没落下过。',
        '梦想我抱不动了，台子交给您。倒计时程序还在，从十开始，剩下的您接着数。',
      ],
    },
  },
  {
    id: 'm_building',
    name: '烂尾楼',
    emoji: '🏢',
    flavor: '三十二层的钢筋水泥骨架，封顶差两层，停工三年。证件齐全，二十七户业主还住着。物理意义上，没人拦你拆。',
    cost: 1_200_000,
    durationSec: 150,
    unlockStage: 3,
    rewards: {
      cash: 350_000,
      parts: 5,
      elements: 2,
      pool: ['r_scrapiron', 'r_alloyblock', 'cashwad', 'goldbar', 'p_belt', 'p_spring', 'titanium'],
      unique: 'u_deedstack',
      reputation: 3,
    },
    seller: {
      name: '原项目负责人·陈工',
      emoji: '🏢',
      lines: [
        '您好，我是这个项目的工程负责人。三十二层，封顶差两层。',
        '证件在档案室，图纸编号我背得出。二十七户业主还住着，物业费收到去年年底。',
        '公司清算了，可楼是好楼。您要是接手——把顶上那两层补完，行吗。',
      ],
    },
  },
  {
    id: 'm_bridge',
    name: '跨海大桥',
    emoji: '🌉',
    flavor: '一座主跨一千零八十八米的斜拉桥，桥墩里全是好钢。守桥三十四年的老人腿脚不行了，桥得有人接着守。河是租的，租约在抽屉里。',
    cost: 2_500_000,
    durationSec: 240,
    unlockStage: 4,
    requires: { mission: 'm_building' },
    rewards: {
      cash: 700_000,
      parts: 6,
      elements: 3,
      pool: ['r_alloyblock', 'titanium', 'goldbar', 'diamond', 'p_belt', 'p_servo', 'e_titanium', 'milchip'],
      unique: 'u_midpoint',
      reputation: 4,
    },
    seller: {
      name: '守桥人·老黄',
      emoji: '🌉',
      lines: [
        '您好。这座桥我守了三十四年，主跨一千零八十八米。',
        '每天走两遍，数螺栓，听缆绳的声音——哪一根不舒服，我听得出来。',
        '我腿脚不行了，走不完全程。桥得有人守。河是租的，租约在抽屉里，记得续。',
      ],
    },
  },
  {
    id: 'm_gundamfac',
    name: '高达工厂',
    emoji: '🏭',
    flavor: '一条还能运转的量产型机甲流水线，年产十二台，出厂前逐台试机。机械臂夜里自检时，动作有点像在祈祷。老厂长扛不动这条线了。',
    cost: 3_500_000,
    durationSec: 300,
    unlockStage: 4,
    requires: { mutation: 'sixarms' },
    rewards: {
      cash: 1_000_000,
      parts: 8,
      elements: 3,
      pool: ['mechcore', 'p_servo', 'p_belt', 'p_circuit', 'e_titanium', 'e_rare', 'titanium', 'milchip', 'goldbar'],
      unique: 'u_justicecore',
      reputation: 5,
    },
    seller: {
      name: '老厂长',
      emoji: '🏭',
      lines: [
        '欢迎。本厂年产量产型机体十二台，出厂前逐台试机，精度达标。',
        '生产线是我亲手调的，机械臂力矩误差不超过千分之三。夜里它们会自检，动作有点像祈祷，不影响生产。',
        '我老了，扛不动这条线。工艺手册一共四十一本，都在我办公室，一并交接给您。',
      ],
    },
  },
  {
    id: 'm_nuclear',
    name: '核电站',
    emoji: '☢️',
    flavor: '装机一百万千瓦，供着下游三座城市。值班三十年的老李心脏不行了，再不能值夜班。三号机组的轴承上月刚换，台账一笔一笔都记着。',
    cost: 5_000_000,
    durationSec: 400,
    unlockStage: 4,
    requires: { ordnance: 'nuke' },
    rewards: {
      cash: 1_500_000,
      parts: 8,
      elements: 5,
      pool: ['e_uranium', 'e_rare', 'antimatter', 'milchip', 'titanium', 'goldbar', 'p_servo', 'p_circuit'],
      unique: 'u_fuelrod',
      reputation: 7,
    },
    seller: {
      name: '值班三十年的老李',
      emoji: '☢️',
      lines: [
        '同志你好。这座电站装机一百万千瓦，供着下游三座城市。',
        '三号机组的轴承上个月刚换，台账在这儿，一笔一笔都记着。',
        '转让不是因为它不好。是我心脏不行了，医生不让我再值夜班。它怕黑，得有人守着。',
      ],
    },
  },
  {
    id: 'm_station',
    name: '空间站',
    emoji: '🛰️',
    flavor: '一座在轨空间站，三个对接口、生命维持系统俱全，舷窗朝东，一天看十六次日出。驻站工程师在上面待了四千二百天，该回家了。二号舱里还有一片菜地。',
    cost: 8_000_000,
    durationSec: 500,
    unlockStage: 4,
    requires: { mission: 'm_launchpad' },
    rewards: {
      cash: 2_500_000,
      parts: 10,
      elements: 6,
      pool: ['milchip', 'antimatter', 'alienalloy', 'e_uranium', 'e_rare', 'titanium', 'goldbar', 'diamond', 'gpu'],
      unique: 'u_zerogcoffee',
      reputation: 10,
    },
    seller: {
      name: '驻站工程师',
      emoji: '🛰️',
      lines: [
        '您好。我在这座空间站驻了四千二百天。',
        '三个对接口，两个还能用，生命维持系统我每周三检修。舷窗朝东，一天看十六次日出。',
        '我该回家了，在上面待太久，腿不太会走路。二号舱有片菜地，接手了，麻烦您浇水。',
      ],
    },
  },
  {
    id: 'm_collider',
    name: '粒子对撞机',
    emoji: '⚛️',
    flavor: '一圈二十七公里的地下隧道，束流能量十三太电子伏，里面还在撞着什么。管理它十九年的老周退休了，带不走，也不忍心让它停。后半夜机房很凉。',
    cost: 15_000_000,
    durationSec: 600,
    unlockStage: 4,
    requires: { mission: 'm_station' },
    rewards: {
      cash: 5_000_000,
      parts: 12,
      elements: 8,
      pool: ['antimatter', 'persona', 'alienalloy', 'livingmetal', 'e_uranium', 'e_rare', 'diamond', 'goldbar', 'carkey'],
      unique: 'u_singularity',
      reputation: 20,
    },
    seller: {
      name: '对撞机管理员·老周',
      emoji: '⚛️',
      lines: [
        '您好。我是这台对撞机的管理员，姓周，管了它十九年。',
        '环形周长二十七公里，束流我每天清晨六点校准一次，风雨无阻。它认人，校准的时候得跟它说话。',
        '我退休了，带不走它，也不忍心让它停。后半夜机房凉，记得给它留一盏灯。',
      ],
    },
  },
];

export const MISSION_MAP: Record<string, MissionDef> = Object.fromEntries(
  MISSIONS.map((m) => [m.id, m]),
);
