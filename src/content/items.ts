// 奖励物品注册表（图鉴 / 收藏 / 卖品）。自包含，不依赖任何旧 data/ 系统。
// 目标的 rewards.items 引用这里的 id；validateContent 校验 id 存在。

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'absurd';
export type ItemKind = 'sellable' | 'material' | 'collectible' | 'part' | 'element';

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  rarity: Rarity;
  baseValue: number;
  passive?: { label: string; amount: number };
}

export const ITEMS: ItemDef[] = [
  // ---- 可卖品 ----
  { id: 'socks', name: '袜子', kind: 'sellable', rarity: 'common', baseValue: 2 },
  { id: 'cable', name: '充电线', kind: 'sellable', rarity: 'common', baseValue: 3 },
  { id: 'tissue', name: '卷纸', kind: 'sellable', rarity: 'common', baseValue: 1 },
  { id: 'pen', name: '笔', kind: 'sellable', rarity: 'common', baseValue: 2 },
  { id: 'lunchbox', name: '饭盒', kind: 'sellable', rarity: 'common', baseValue: 2 },
  { id: 'headphones', name: '耳机', kind: 'sellable', rarity: 'rare', baseValue: 5 },
  { id: 'watch', name: '手表', kind: 'sellable', rarity: 'rare', baseValue: 6 },
  { id: 'pan', name: '炒锅', kind: 'sellable', rarity: 'rare', baseValue: 4 },
  { id: 'shoes', name: '球鞋', kind: 'sellable', rarity: 'rare', baseValue: 5 },
  { id: 'camera', name: '相机', kind: 'sellable', rarity: 'epic', baseValue: 8 },
  { id: 'gamepad', name: '手柄', kind: 'sellable', rarity: 'epic', baseValue: 7 },
  { id: 'skateboard', name: '滑板', kind: 'sellable', rarity: 'epic', baseValue: 6 },
  { id: 'laptop', name: '笔记本', kind: 'sellable', rarity: 'legendary', baseValue: 10 },
  { id: 'gpu', name: '显卡', kind: 'sellable', rarity: 'legendary', baseValue: 15 },
  { id: 'phone', name: '手机', kind: 'sellable', rarity: 'legendary', baseValue: 12 },
  { id: 'diamond', name: '钻石', kind: 'sellable', rarity: 'absurd', baseValue: 20 },
  { id: 'goldbar', name: '金条', kind: 'sellable', rarity: 'absurd', baseValue: 30 },
  { id: 'carkey', name: '豪车钥匙', kind: 'sellable', rarity: 'absurd', baseValue: 50 },

  // ---- 材料 ----
  { id: 'blade', name: '刀片', kind: 'material', rarity: 'common', baseValue: 4 },
  { id: 'screw', name: '螺丝', kind: 'material', rarity: 'common', baseValue: 3 },
  { id: 'gear', name: '齿轮', kind: 'material', rarity: 'rare', baseValue: 6 },
  { id: 'magnet', name: '磁铁', kind: 'material', rarity: 'rare', baseValue: 5 },
  { id: 'battery', name: '电池', kind: 'material', rarity: 'epic', baseValue: 9 },
  { id: 'arm', name: '机械臂', kind: 'material', rarity: 'legendary', baseValue: 14 },

  // ---- 收藏品（唯一，进图鉴）----
  { id: 'tape', name: '酒馆里的录像带', kind: 'collectible', rarity: 'epic', baseValue: 0, passive: { label: '售价 +8%', amount: 0.08 } },
  { id: 'foam', name: '会说话的泡沫', kind: 'collectible', rarity: 'epic', baseValue: 0, passive: { label: '点击拆解 +10%', amount: 0.1 } },
  { id: 'ufo', name: '不明飞行物', kind: 'collectible', rarity: 'absurd', baseValue: 0, passive: { label: '全局售价 +25%', amount: 0.25 } },
  { id: 'ring', name: '订婚戒指', kind: 'sellable', rarity: 'legendary', baseValue: 16 },
  { id: 'note', name: '折叠的纸条', kind: 'collectible', rarity: 'epic', baseValue: 0, passive: { label: '连击上限 +0.5', amount: 0.5 } },
  { id: 'iou', name: '一张借条', kind: 'collectible', rarity: 'rare', baseValue: 0, passive: { label: '售价 +8%', amount: 0.08 } },
  { id: 'hatchling', name: '孵出来的小东西', kind: 'collectible', rarity: 'legendary', baseValue: 0, passive: { label: '幸运 +22%', amount: 0.22 } },

  // ---- 货柜主题可卖品 ----
  { id: 'crystal', name: '紫水晶簇', kind: 'sellable', rarity: 'epic', baseValue: 9 },
  { id: 'meteoriron', name: '陨铁块', kind: 'sellable', rarity: 'legendary', baseValue: 14 },
  { id: 'alienalloy', name: '外星合金', kind: 'sellable', rarity: 'absurd', baseValue: 40 },
  { id: 'cashwad', name: '一沓现金', kind: 'sellable', rarity: 'rare', baseValue: 7 },
  { id: 'titanium', name: '钛合金件', kind: 'sellable', rarity: 'epic', baseValue: 10 },
  { id: 'milchip', name: '军用芯片', kind: 'sellable', rarity: 'legendary', baseValue: 15 },

  // ---- 零件 ----
  { id: 'p_gear', name: '传动齿轮', kind: 'part', rarity: 'common', baseValue: 5 },
  { id: 'p_circuit', name: '电路板', kind: 'part', rarity: 'rare', baseValue: 12 },
  { id: 'p_servo', name: '伺服电机', kind: 'part', rarity: 'epic', baseValue: 20 },
  { id: 'p_belt', name: '传送带组件', kind: 'part', rarity: 'epic', baseValue: 24 },

  // ---- 巨型货拆解原料 ----
  { id: 'r_scrapiron', name: '废铁', kind: 'material', rarity: 'common', baseValue: 2 },
  { id: 'r_wireharness', name: '线束', kind: 'material', rarity: 'common', baseValue: 3 },
  { id: 'r_alloyblock', name: '合金块', kind: 'material', rarity: 'rare', baseValue: 8 },

  // ---- 机器升级专用稀有材料（砸特殊货物掉落，越逆天的升级越难凑齐）----
  { id: 'm_hardcore', name: '硬核料', kind: 'material', rarity: 'rare', baseValue: 12 },
  { id: 'm_pressgem', name: '压力晶核', kind: 'material', rarity: 'epic', baseValue: 28 },
  { id: 'm_oddmatter', name: '异常物质', kind: 'material', rarity: 'legendary', baseValue: 70 },

  // ---- 元素 ----
  { id: 'e_iron', name: '铁', kind: 'element', rarity: 'common', baseValue: 5 },
  { id: 'e_titanium', name: '钛', kind: 'element', rarity: 'rare', baseValue: 18 },
  { id: 'e_rare', name: '稀土', kind: 'element', rarity: 'epic', baseValue: 30 },
  { id: 'e_uranium', name: '浓缩铀', kind: 'element', rarity: 'legendary', baseValue: 60 },

  // ---- 离谱货专属 ----
  { id: 'persona', name: '人格核心', kind: 'collectible', rarity: 'absurd', baseValue: 0, passive: { label: '自动产线 +25%', amount: 0.25 } },
  { id: 'antimatter', name: '一小瓶反物质', kind: 'sellable', rarity: 'absurd', baseValue: 120 },
  { id: 'mechcore', name: '机甲核心', kind: 'sellable', rarity: 'legendary', baseValue: 35 },
  { id: 'livingmetal', name: '活体金属', kind: 'sellable', rarity: 'absurd', baseValue: 55 },

  // ---- 远征专属收藏品（独一无二）----
  { id: 'u_singularity', name: '一小撮奇点', kind: 'collectible', rarity: 'absurd', baseValue: 0, passive: { label: '幸运 +40%', amount: 0.4 } },
  { id: 'u_fuelrod', name: '还温热的燃料棒', kind: 'collectible', rarity: 'absurd', baseValue: 0, passive: { label: '自动产线 +35%', amount: 0.35 } },
  { id: 'u_zerogcoffee', name: '失重的咖啡', kind: 'collectible', rarity: 'legendary', baseValue: 0, passive: { label: '到货速度 +25%', amount: 0.25 } },
  { id: 'u_deedstack', name: '27 张房产证', kind: 'collectible', rarity: 'legendary', baseValue: 0, passive: { label: '售价 +30%', amount: 0.3 } },
  { id: 'u_justicecore', name: '正义流水线核心', kind: 'collectible', rarity: 'absurd', baseValue: 0, passive: { label: '点击拆解 +40%', amount: 0.4 } },
  { id: 'u_midpoint', name: '桥的「中间」', kind: 'collectible', rarity: 'legendary', baseValue: 0, passive: { label: '连击上限 +1', amount: 1 } },
  { id: 'u_countdown', name: '没数完的倒计时', kind: 'collectible', rarity: 'epic', baseValue: 0, passive: { label: '幸运 +18%', amount: 0.18 } },
];

export const ITEM_MAP: Record<string, ItemDef> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
export const COLLECTIBLES = ITEMS.filter((i) => i.kind === 'collectible');
export const COLLECTION_TOTAL = COLLECTIBLES.length;
