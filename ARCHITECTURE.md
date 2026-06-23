# 拆快递 · 技术架构（React）

配套文档：[DESIGN.md](./DESIGN.md)。本文件定义工程层面的实现方案。

---

## 1. 技术选型

| 关注点 | 选择 | 理由 |
|--------|------|------|
| 构建 | **Vite** | 启动/HMR 快，零配置上手 |
| 语言 | **TypeScript** | 数值/掉落表类型多，强类型省心 |
| UI | **React 18** | 组件化管理面板/Tab/弹窗 |
| 状态 | **Zustand** | 轻量、适合游戏全局状态、自带 persist 中间件 |
| 大数 | 先用原生 `number`，**逼近上限再引入 `break_infinity.js`** | 增量游戏数字会爆 `2^53` |
| 样式 | **CSS Modules + CSS 变量** | 零美术、按稀有度用 CSS 控制表现 |
| 音效 | **Web Audio API** 合成 | 零资源 |
| 测试 | **Vitest** | 与 Vite 同生态，覆盖数值逻辑 |

> 不引入重型游戏引擎：本作是 DOM/CSS 驱动的增量游戏，React + CSS 足够，避免 Canvas/Phaser 的复杂度。

---

## 2. 状态与游戏循环分层

关键原则：**游戏逻辑与 React 渲染解耦**。逻辑跑在固定频率 tick 上，React 只做订阅式渲染。

```
┌─────────────────────────────────────────┐
│ GameLoop (requestAnimationFrame)         │
│  - 累加 dt，按 100ms 固定步长跑 tick      │
│  - tick: 自动拆/到货/自动卖/离线结算       │
│        ↓ 调用 store actions               │
├─────────────────────────────────────────┤
│ Zustand Store (single source of truth)    │
│  state: 金钱/工具/升级/快递/掉落/图鉴/转生   │
│  actions: clickUnpack / buyUpgrade / sell │
│        ↓ 订阅                              │
├─────────────────────────────────────────┤
│ React 组件 (selectors 精准订阅，避免重渲)   │
└─────────────────────────────────────────┘
```

- **固定步长 tick（10Hz）**：保证自动产出与帧率无关；落后多帧时补算（带上限防卡顿后爆量）。
- **离线收益**：存档写 `lastSeen` 时间戳，加载时用 `now - lastSeen` 按离线效率结算。
- **渲染优化**：组件用 Zustand selector 只订阅自己关心的字段；高频变化（飘字/粒子）用局部组件或 CSS 动画，不进全局 state。

---

## 3. 状态模型（TypeScript 草图）

```ts
type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'absurd';
type ItemKind = 'sellable' | 'material' | 'collectible';

interface ItemDef {
  id: string; name: string; emoji: string;
  kind: ItemKind; rarity: Rarity; baseValue: number;
  passive?: PassiveBonus;       // 收藏品被动
}

interface Parcel {
  id: string; size: ParcelSize; emoji: string;
  sealMax: number; sealHP: number;   // 封装强度
  lootCount: number;
}

interface Upgrade { id: string; level: number; }     // 成本由公式算

interface GameState {
  // 资源
  money: number;
  reputation: number;            // 转生货币 ⭐
  totalEarned: number;           // 阶段解锁 & 转生计算用
  // 拆包
  currentTool: ToolId;
  workbench: Parcel[];           // 同时处理的快递（批量）
  incomingQueue: Parcel[];       // 到货队列
  combo: { count: number; lastClickAt: number };
  // 进度
  upgrades: Record<string, number>;
  inventory: Record<string, number>;   // 可卖/材料库存
  collection: Set<string>;              // 图鉴
  achievements: Set<string>;
  prestigeTree: Record<string, number>;
  stage: 1 | 2 | 3 | 4;
  // 设置
  autoSell: { enabled: boolean; keepRarityAbove: Rarity | null };
  lastSeen: number;              // 离线结算
}
```

掉落表 / 工具 / 升级 / 成就等**静态配置**放 `src/data/*`，与运行时 state 分离，便于调参。

---

## 4. 目录结构

```
src/
├─ main.tsx
├─ App.tsx
├─ game/
│  ├─ store.ts            # Zustand store + persist
│  ├─ loop.ts             # 固定步长游戏循环
│  ├─ actions/            # clickUnpack / buyUpgrade / sell / prestige ...
│  ├─ systems/            # loot.ts(掉落roll) / economy.ts / offline.ts / unlock.ts
│  └─ selectors.ts
├─ data/
│  ├─ items.ts            # ItemDef[]（emoji 占位）
│  ├─ parcels.ts          # 快递规格表
│  ├─ tools.ts            # 工具主线
│  ├─ upgrades.ts         # 升级定义 + 成本公式
│  ├─ rarity.ts           # 概率/倍率/颜色
│  └─ achievements.ts
├─ ui/
│  ├─ Topbar.tsx
│  ├─ Workbench.tsx       # 拆包区 + 进度条 + Combo
│  ├─ IncomingQueue.tsx
│  ├─ UpgradePanel.tsx
│  ├─ Inventory.tsx
│  ├─ Shop.tsx            # 进货批次
│  ├─ Collection.tsx
│  ├─ Achievements.tsx
│  ├─ Prestige.tsx
│  └─ effects/            # FloatingText / Particles（CSS 动画）
├─ lib/
│  ├─ format.ts           # 大数格式化 K/M/B/T
│  ├─ rng.ts              # 带种子随机（掉落可复现/测试）
│  └─ audio.ts            # Web Audio 合成音效
└─ styles/
   ├─ rarity.module.css   # 稀有度颜色/流光
   └─ animations.css
```

---

## 5. 关键算法

**掉落 roll**（`systems/loot.ts`）
```
1. roll 稀有度：按 rarity 权重 + 幸运值迁移高档权重
2. roll 类别：可卖75% / 材料15% / 收藏10%
3. 在该(稀有度,类别)候选池里随机取 ItemDef
4. 售价 = baseValue × rarityMult × (1 + 卖价加成) × 转生加成
```

**拆解伤害**：`power = tool.base × (1 + 力度等级×0.2) × comboMult × prestigeMult`，批量时对工作台每个快递分别施加。

**升级成本**：`cost = base × 1.15^level`；可做"买10/买Max"批量购买（等比数列求和）。

**存档**：Zustand `persist` → localStorage（节流写入，~每5s 或关键操作）。`Set` 字段序列化为数组。版本号 + 迁移函数兼容老存档。

---

## 6. 测试重点（Vitest）
- 掉落概率分布（大样本统计逼近设计值）。
- 升级成本/回本时间曲线。
- 离线结算正确性（含上限）。
- 转生公式与永久加成叠加。
- 存档 序列化/反序列化 往返一致。

---

## 7. 性能注意
- 飘字/粒子用对象池或 CSS 动画结束后自动卸载，避免 DOM 堆积。
- 批量满屏开箱时合并状态更新（一次 tick 一次 setState）。
- 高频 selector 用浅比较；列表用稳定 key。
- 大数到 `1e15` 量级前切换 `break_infinity.js`。
