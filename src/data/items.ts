import { QUOTES } from './quotes';
import type { ItemDef } from './types';

/**
 * 掉落物清单（emoji 占位，零美术）。
 * - sellable: 按 baseValue × 稀有度倍率 卖钱
 * - material: 自动化/合成用，也可卖（按 baseValue）
 * - collectible: 唯一，进图鉴，附带被动加成
 */
export const ITEMS: ItemDef[] = [
  // ---- 可卖品 ----
  // 普通
  { id: 'socks', name: '袜子', emoji: '🧦', kind: 'sellable', rarity: 'common', baseValue: 2 },
  { id: 'cable', name: '充电线', emoji: '🔌', kind: 'sellable', rarity: 'common', baseValue: 3 },
  { id: 'tissue', name: '卷纸', emoji: '🧻', kind: 'sellable', rarity: 'common', baseValue: 1 },
  { id: 'pen', name: '笔', emoji: '🖊️', kind: 'sellable', rarity: 'common', baseValue: 2 },
  { id: 'lunchbox', name: '饭盒', emoji: '🥡', kind: 'sellable', rarity: 'common', baseValue: 2 },
  // 稀有
  { id: 'headphones', name: '耳机', emoji: '🎧', kind: 'sellable', rarity: 'rare', baseValue: 5 },
  { id: 'watch', name: '手表', emoji: '⌚', kind: 'sellable', rarity: 'rare', baseValue: 6 },
  { id: 'pan', name: '炒锅', emoji: '🍳', kind: 'sellable', rarity: 'rare', baseValue: 4 },
  { id: 'shoes', name: '球鞋', emoji: '👟', kind: 'sellable', rarity: 'rare', baseValue: 5 },
  // 史诗
  { id: 'camera', name: '相机', emoji: '📷', kind: 'sellable', rarity: 'epic', baseValue: 8 },
  { id: 'gamepad', name: '手柄', emoji: '🎮', kind: 'sellable', rarity: 'epic', baseValue: 7 },
  { id: 'skateboard', name: '滑板', emoji: '🛹', kind: 'sellable', rarity: 'epic', baseValue: 6 },
  // 传说
  { id: 'laptop', name: '笔记本', emoji: '💻', kind: 'sellable', rarity: 'legendary', baseValue: 10 },
  { id: 'gpu', name: '显卡', emoji: '🎛️', kind: 'sellable', rarity: 'legendary', baseValue: 15 },
  { id: 'phone', name: '手机', emoji: '📱', kind: 'sellable', rarity: 'legendary', baseValue: 12 },
  // 离谱
  { id: 'diamond', name: '钻石', emoji: '💎', kind: 'sellable', rarity: 'absurd', baseValue: 20 },
  { id: 'goldbar', name: '金条', emoji: '🪙', kind: 'sellable', rarity: 'absurd', baseValue: 30 },
  { id: 'carkey', name: '豪车钥匙', emoji: '🗝️', kind: 'sellable', rarity: 'absurd', baseValue: 50 },

  // ---- 工具/材料 ----
  { id: 'blade', name: '刀片', emoji: '🔪', kind: 'material', rarity: 'common', baseValue: 4 },
  { id: 'screw', name: '螺丝', emoji: '🔩', kind: 'material', rarity: 'common', baseValue: 3 },
  { id: 'gear', name: '齿轮', emoji: '⚙️', kind: 'material', rarity: 'rare', baseValue: 6 },
  { id: 'magnet', name: '磁铁', emoji: '🧲', kind: 'material', rarity: 'rare', baseValue: 5 },
  { id: 'battery', name: '电池', emoji: '🔋', kind: 'material', rarity: 'epic', baseValue: 9 },
  { id: 'arm', name: '机械臂', emoji: '🦾', kind: 'material', rarity: 'legendary', baseValue: 14 },

  // ---- 收藏品（唯一 + 被动加成）----
  {
    id: 'snail', name: '邻居的蜗牛', emoji: '🐌', kind: 'collectible', rarity: 'rare', baseValue: 0,
    passive: { label: '自动拆速 +5%', type: 'autoPower', amount: 0.05 },
  },
  {
    id: 'doll', name: '缺只眼的玩偶', emoji: '🧸', kind: 'collectible', rarity: 'rare', baseValue: 0,
    passive: { label: '幸运 +5%', type: 'luck', amount: 0.05 },
  },
  {
    id: 'tape', name: '酒馆里的录像带', emoji: '📼', kind: 'collectible', rarity: 'epic', baseValue: 0,
    passive: { label: '售价 +8%', type: 'sellPrice', amount: 0.08 },
  },
  {
    id: 'foam', name: '会说话的泡沫', emoji: '📦', kind: 'collectible', rarity: 'epic', baseValue: 0,
    passive: { label: '点击拆解 +10%', type: 'clickPower', amount: 0.1 },
  },
  {
    id: 'statue', name: '表情包石像', emoji: '🗿', kind: 'collectible', rarity: 'legendary', baseValue: 0,
    passive: { label: '到货速度 +10%', type: 'autoSpeed', amount: 0.1 },
  },
  {
    id: 'alien', name: '外星人手办', emoji: '👽', kind: 'collectible', rarity: 'legendary', baseValue: 0,
    passive: { label: '幸运 +15%', type: 'luck', amount: 0.15 },
  },
  {
    id: 'ufo', name: '不明飞行物', emoji: '🛸', kind: 'collectible', rarity: 'absurd', baseValue: 0,
    passive: { label: '全局售价 +25%', type: 'sellPrice', amount: 0.25 },
  },

  // ---- 神秘行李主题收藏品（唯一 + 被动）----
  { id: 'letter', name: '没寄出的情书', emoji: '💌', kind: 'collectible', rarity: 'rare', baseValue: 0,
    passive: { label: '幸运 +6%', type: 'luck', amount: 0.06 } },
  { id: 'polaroid', name: '陌生人的拍立得', emoji: '📷', kind: 'collectible', rarity: 'epic', baseValue: 0,
    passive: { label: '售价 +10%', type: 'sellPrice', amount: 0.1 } },
  { id: 'candle', name: '烧剩半截的蜡烛', emoji: '🕯️', kind: 'collectible', rarity: 'rare', baseValue: 0,
    passive: { label: '到货速度 +6%', type: 'autoSpeed', amount: 0.06 } },
  { id: 'pocketwatch', name: '停摆的怀表', emoji: '⏳', kind: 'collectible', rarity: 'epic', baseValue: 0,
    passive: { label: '连击上限 +0.5', type: 'comboCap', amount: 0.5 } },
  { id: 'beads', name: '褪色的念珠', emoji: '📿', kind: 'collectible', rarity: 'legendary', baseValue: 0,
    passive: { label: '幸运 +20%', type: 'luck', amount: 0.2 } },
  { id: 'knob', name: '第七个门把手', emoji: '🚪', kind: 'collectible', rarity: 'rare', baseValue: 0,
    passive: { label: '点击拆解 +8%', type: 'clickPower', amount: 0.08 } },
  { id: 'namebook', name: '写满名字的本子', emoji: '📔', kind: 'collectible', rarity: 'epic', baseValue: 0,
    passive: { label: '售价 +12%', type: 'sellPrice', amount: 0.12 } },
  { id: 'handmodel', name: '模型的左手', emoji: '🖐️', kind: 'collectible', rarity: 'legendary', baseValue: 0,
    passive: { label: '点击拆解 +30%', type: 'clickPower', amount: 0.3 } },

  // ---- 神秘行李主题可卖品 ----
  { id: 'lipstick', name: '半截口红', emoji: '💄', kind: 'sellable', rarity: 'rare', baseValue: 6 },
  { id: 'perfume', name: '廉价香水', emoji: '🧴', kind: 'sellable', rarity: 'common', baseValue: 2 },
  { id: 'ring', name: '订婚戒指', emoji: '💍', kind: 'sellable', rarity: 'legendary', baseValue: 16 },
  { id: 'urn', name: '空的骨灰盒（吧？）', emoji: '⚱️', kind: 'sellable', rarity: 'epic', baseValue: 9 },

  // ---- 特殊货柜主题可卖品 ----
  { id:'crystal',   name:'紫水晶簇',   emoji:'🔮', kind:'sellable', rarity:'epic',      baseValue:9 },
  { id:'meteoriron',name:'陨铁块',     emoji:'🌑', kind:'sellable', rarity:'legendary', baseValue:14 },
  { id:'alienalloy',name:'外星合金',   emoji:'💠', kind:'sellable', rarity:'absurd',    baseValue:40 },
  { id:'cashwad',   name:'一沓现金',   emoji:'💵', kind:'sellable', rarity:'rare',      baseValue:7 },
  { id:'titanium',  name:'钛合金件',   emoji:'🔗', kind:'sellable', rarity:'epic',      baseValue:10 },
  { id:'milchip',   name:'军用芯片',   emoji:'🛰️', kind:'sellable', rarity:'legendary', baseValue:15 },
  { id:'pearl',     name:'黑珍珠',     emoji:'🫧', kind:'sellable', rarity:'epic',      baseValue:9 },

  // ---- 特殊货柜主题收藏品（唯一 + 被动）----
  { id:'fossil',   name:'三叶虫化石', emoji:'🦴', kind:'collectible', rarity:'epic',      baseValue:0, passive:{ label:'幸运 +12%',     type:'luck',      amount:0.12 } },
  { id:'iou',      name:'一张借条',   emoji:'📜', kind:'collectible', rarity:'rare',      baseValue:0, passive:{ label:'售价 +8%',      type:'sellPrice', amount:0.08 } },
  { id:'amberbug', name:'琥珀里的虫', emoji:'🐛', kind:'collectible', rarity:'rare',      baseValue:0, passive:{ label:'到货速度 +6%',   type:'autoSpeed', amount:0.06 } },
  { id:'mammoth',  name:'迷你冰封猛犸',emoji:'🦣', kind:'collectible', rarity:'legendary', baseValue:0, passive:{ label:'自动拆解 +20%',  type:'autoPower', amount:0.2 } },
  { id:'note',     name:'折叠的纸条',  emoji:'📝', kind:'collectible', rarity:'epic',      baseValue:0, passive:{ label:'连击上限 +0.5',  type:'comboCap',  amount:0.5 } },
  { id:'glove',    name:'冻住的手套（里面好像有东西）', emoji:'🧤', kind:'collectible', rarity:'epic', baseValue:0, passive:{ label:'点击拆解 +14%', type:'clickPower', amount:0.14 } },
  { id:'hatchling',name:'孵出来的小东西', emoji:'🐣', kind:'collectible', rarity:'legendary', baseValue:0, passive:{ label:'幸运 +22%', type:'luck', amount:0.22 } },

  // ---- 零件 🔩（拆解副产物，稀缺；可卖但更想留着合成）----
  { id:'p_screw',  name:'精密螺丝',   emoji:'🪛', kind:'part', rarity:'common', baseValue:3 },
  { id:'p_gear',   name:'传动齿轮',   emoji:'⚙️', kind:'part', rarity:'common', baseValue:5 },
  { id:'p_spring', name:'高张弹簧',   emoji:'🌀', kind:'part', rarity:'rare',   baseValue:8 },
  { id:'p_circuit',name:'电路板',     emoji:'🔲', kind:'part', rarity:'rare',   baseValue:12 },
  { id:'p_servo',  name:'伺服电机',   emoji:'🔧', kind:'part', rarity:'epic',   baseValue:20 },
  { id:'p_belt',   name:'传送带组件', emoji:'🎞️', kind:'part', rarity:'epic',   baseValue:24 },

  // ---- 巨型货拆解原料（成堆掉落，P4b 精炼成元素）----
  { id:'r_scrapiron',  name:'废铁',     emoji:'🧱', kind:'material', rarity:'common', baseValue:2 },
  { id:'r_wireharness',name:'线束',     emoji:'🪢', kind:'material', rarity:'common', baseValue:3 },
  { id:'r_alloyblock', name:'合金块',   emoji:'🟦', kind:'material', rarity:'rare',   baseValue:8 },
  { id:'r_plastic',    name:'工程塑料', emoji:'🧴', kind:'material', rarity:'common', baseValue:2 },

  // ---- 元素 🧪（由原料/零件精炼，平价回收，留着造军火）----
  { id:'e_iron',     name:'铁',     emoji:'🧲', kind:'element', rarity:'common',    baseValue:5 },
  { id:'e_copper',   name:'铜',     emoji:'🟠', kind:'element', rarity:'common',    baseValue:7 },
  { id:'e_silicon',  name:'硅',     emoji:'⬜', kind:'element', rarity:'rare',      baseValue:12 },
  { id:'e_titanium', name:'钛',     emoji:'⚪', kind:'element', rarity:'rare',      baseValue:18 },
  { id:'e_rare',     name:'稀土',   emoji:'💜', kind:'element', rarity:'epic',      baseValue:30 },
  { id:'e_uranium',  name:'浓缩铀', emoji:'☢️', kind:'element', rarity:'legendary', baseValue:60 },

  // ---- 离谱货专属收藏品（轰开高达/变形金刚/飞船/方碑才出）----
  { id:'persona', name:'人格核心', emoji:'🧠', kind:'collectible', rarity:'absurd', baseValue:0,
    passive:{ label:'自动拆解 +25%', type:'autoPower', amount:0.25 } },
  { id:'antimatter', name:'一小瓶反物质', emoji:'🌀', kind:'sellable', rarity:'absurd', baseValue:120 },
  { id:'mechcore', name:'机甲核心', emoji:'🦿', kind:'sellable', rarity:'legendary', baseValue:35 },
  { id:'livingmetal', name:'活体金属', emoji:'🧫', kind:'sellable', rarity:'absurd', baseValue:55 },

  // ---- 原石扑空（价值 0，非收藏）----
  { id:'hollow', name:'空心的……啥也没有', emoji:'💨', kind:'sellable', rarity:'common', baseValue:0 },

  // ---- 陌生女人箱·重口联想掉落（暗黑喜剧，emoji 占位）----
  { id:'bra',     name:'蕾丝内衣',   emoji:'👙', kind:'sellable',   rarity:'rare',   baseValue:6 },
  { id:'panties', name:'一打内裤',   emoji:'🩲', kind:'sellable',   rarity:'common', baseValue:2 },
  { id:'stocking',name:'单只黑丝',   emoji:'🥿', kind:'collectible', rarity:'rare',  baseValue:0, passive:{ label:'幸运 +6%', type:'luck', amount:0.06 } }, // 「另一只的故事你不会想知道」
  { id:'condom',  name:'用过的……套', emoji:'🎈', kind:'sellable',   rarity:'common', baseValue:0 }, // 纯恶心整活，0元，扑空级失落

  // ---- 离场远征专属收藏品（独一无二，远征拆完才返还，附超大被动）----
  { id:'u_singularity', name:'一小撮奇点', emoji:'🌀', kind:'collectible', rarity:'absurd', baseValue:0,
    passive:{ label:'幸运 +40%', type:'luck', amount:0.4 } }, // 粒子对撞机
  { id:'u_fuelrod', name:'还温热的燃料棒', emoji:'🟩', kind:'collectible', rarity:'absurd', baseValue:0,
    passive:{ label:'自动拆解 +35%', type:'autoPower', amount:0.35 } }, // 核电站
  { id:'u_zerogcoffee', name:'失重的咖啡', emoji:'☕', kind:'collectible', rarity:'legendary', baseValue:0,
    passive:{ label:'到货速度 +25%', type:'autoSpeed', amount:0.25 } }, // 空间站
  { id:'u_deedstack', name:'27 张房产证', emoji:'📑', kind:'collectible', rarity:'legendary', baseValue:0,
    passive:{ label:'售价 +30%', type:'sellPrice', amount:0.3 } }, // 烂尾楼
  { id:'u_justicecore', name:'正义流水线核心', emoji:'⚖️', kind:'collectible', rarity:'absurd', baseValue:0,
    passive:{ label:'点击拆解 +40%', type:'clickPower', amount:0.4 } }, // 高达工厂
  { id:'u_midpoint', name:'桥的「中间」', emoji:'🌫️', kind:'collectible', rarity:'legendary', baseValue:0,
    passive:{ label:'连击上限 +1', type:'comboCap', amount:1 } }, // 跨海大桥
  { id:'u_countdown', name:'没数完的倒计时', emoji:'⏱️', kind:'collectible', rarity:'epic', baseValue:0,
    passive:{ label:'幸运 +18%', type:'luck', amount:0.18 } }, // 火箭发射台

  // ---- 暴躁老哥语录（可装备，详见 quotes.ts）----
  ...QUOTES,
];

export const ITEM_MAP: Record<string, ItemDef> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export const COLLECTIBLES = ITEMS.filter((i) => i.kind === 'collectible');
export const COLLECTION_TOTAL = COLLECTIBLES.length;

/** 零件清单（拆解副产物，合成消耗） */
export const PARTS = ITEMS.filter((i) => i.kind === 'part');

/** 元素清单（精炼产物，造军火消耗） */
export const ELEMENTS = ITEMS.filter((i) => i.kind === 'element');
