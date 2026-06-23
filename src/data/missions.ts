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
    flavor: '某个跳票了五年的航天创业者把它挂在二手平台上甩卖，占了人家三亩地。你得开车过去，把它一块块拆下来运走。',
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
      name: '跳票的航天创业者',
      emoji: '🚀',
      lines: [
        '发射窗口还剩……（看表）……算了错过了，打折。',
        '梦想是星辰大海，现实是这玩意占了我家三亩地。',
        '倒计时我数到 3 就不数了，剩下的留给你数。',
      ],
    },
  },
  {
    id: 'm_building',
    name: '烂尾楼',
    emoji: '🏢',
    flavor: '二十七层的钢筋水泥骨架，停工三年，开发商跑了。法律意义上它还不算你的，但物理意义上没人拦你拆。',
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
      name: '跑路的开发商',
      emoji: '🏢',
      lines: [
        '毛坯，带 27 户还没搬走的住户，赠送，算我大方。',
        '我人跑了，情怀没跑——这栋楼承载了我整个首付的梦。',
        '拆吧，反正我本来也没打算盖完。',
      ],
    },
  },
  {
    id: 'm_bridge',
    name: '跨海大桥',
    emoji: '🌉',
    flavor: '一座连接此岸与彼岸的斜拉桥，桥墩里全是好钢。收过路费的老大爷蹲在桥头，说桥可以卖，但河得你自己跟它谈。',
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
      name: '收过路费的老大爷',
      emoji: '🌉',
      lines: [
        '这桥连接此岸、彼岸，和一个我也不知道在哪的中间。',
        '桥卖你，河是租的，你得自己跟河谈。',
        '走过的人都说值，没走过的人——都还没走到。',
      ],
    },
  },
  {
    id: 'm_gundamfac',
    name: '高达工厂',
    emoji: '🏭',
    flavor: '一条还能运转的量产型机甲流水线，机械臂半夜会自己合十祈祷。中二的厂长说这属于功能，不退。',
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
      name: '中二的厂长',
      emoji: '🏭',
      lines: [
        '这里下线过三台量产型，和一台……那台我们不谈。',
        '拆了它，你就拥有了制造正义的流水线。正义另购。',
        '警告：夜里机械臂会自己合十祈祷。这属于功能，不退。',
      ],
    },
  },
  {
    id: 'm_nuclear',
    name: '核电站',
    emoji: '☢️',
    flavor: '穿拖鞋的工程师老李便宜出，主要是嫌它晚上发光影响他老婆睡觉，外加电费交不起了。三号反应堆只是偶尔咳嗽。',
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
      name: '穿拖鞋的工程师老李',
      emoji: '☢️',
      lines: [
        '不是质量问题啊，就是我老婆嫌它晚上发光，影响睡觉。',
        '便宜出，主要是电费我交不起了——以后它帮你交。',
        '三号反应堆只是偶尔咳嗽，吃片药就好，别慌。',
      ],
    },
  },
  {
    id: 'm_station',
    name: '空间站',
    emoji: '🛰️',
    flavor: '失联的宇航员在轨道上待久了，开始怀疑地球是他自己编的。他想脚踏实地地——飘着，于是把整座空间站卖了。',
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
      name: '失联的宇航员',
      emoji: '🛰️',
      lines: [
        '在上面待久了，我开始怀疑地球是不是我编的。',
        '卖了它，我想脚踏实地地——飘着。',
        '信号不好，我说三遍成交、你听一遍就行。成交成交成交。',
      ],
    },
  },
  {
    id: 'm_collider',
    name: '粒子对撞机',
    emoji: '⚛️',
    flavor: '一圈二十七公里的隧道，里面还在撞着什么。退休的上帝说他开过三次：第一次撞出了宇宙，第二次撞出了你妈，第三次撞出一张优惠券。',
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
      name: '退休的上帝',
      emoji: '⚛️',
      lines: [
        '对撞机我开过三次。第一次撞出了宇宙，第二次撞出了你妈，第三次撞出一张优惠券。',
        '我不卖你机器，我卖你一次重新定义因果的机会。售后不包。',
        '它现在还在运行。别问撞的是什么——问就是你。',
      ],
    },
  },
];

export const MISSION_MAP: Record<string, MissionDef> = Object.fromEntries(
  MISSIONS.map((m) => [m.id, m]),
);
