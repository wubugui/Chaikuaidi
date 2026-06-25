# 暴躁老哥砸万物 · 技术架构

配套文档：

- [DESIGN.md](./DESIGN.md)：完整策划案。
- [DEVELOPMENT_TODO.md](./DEVELOPMENT_TODO.md)：开发执行清单。
- [docs/legacy-migration-inventory.md](./docs/legacy-migration-inventory.md)：旧系统迁移盘点。

本项目不再按“纯 DOM/CSS 拆快递放置游戏”继续扩展。正式方向是 React 外壳 + PixiJS 2D 砸击现场 + TypeScript core 逻辑 + 数据驱动内容。旧拆快递系统保留为桌面级序章和早期资源来源，中大型目标必须进入场景化、部位化、视角化表达。

---

## 1. 技术选型

| 关注点 | 选择 | 说明 |
|--------|------|------|
| 构建 | Vite | 保留现有工程基础和快速 HMR |
| 语言 | TypeScript | 目标、部位、风险、奖励和存档都需要强类型约束 |
| React UI | React 18 | HUD、面板、商店、黑市、图鉴、事故结算、设置 |
| 2D 场景 | PixiJS v8 | 场景、目标、部位热区、老哥走位、机械挂载、粒子、震屏 |
| 状态 | Zustand vanilla store + React hook | React 和 Pixi 共用同一状态入口 |
| 内容校验 | Zod | 对 TargetDef、PartDef、RiskDef、RewardDef 做 schema 校验 |
| 逻辑测试 | Vitest | core、数值、内容完整性、存档迁移 |
| 渲染测试 | Playwright | canvas 冒烟、热区点击、关键流程跑通 |
| 存档 | localStorage 兼容，IndexedDB 中长期迁移 | P1 保持旧存档可读，后续承载事故档案和目标局部状态 |
| 音效 | Web Audio API | 保留现有合成音效路线 |

不采用的路线：

- 不继续用纯 DOM/CSS 承载正式砸击现场。
- 不迁移 Unity/Godot。
- 不优先引入 Three.js，除非未来需要真 3D 旋转模型。
- 不优先使用 Phaser，避免替换当前 React/Zustand 应用框架。
- 不把全部 UI 放进 canvas，经营和信息面板继续由 React 负责。

---

## 2. 职责边界

### React

React 负责信息结构和常规 UI：

- 顶栏、资源、怒气、当前轮次。
- 工具栏、视角列表、部位列表。
- 商店、旧货市场、黑市入口、工坊、图鉴、事故档案。
- 目标信息面板、风险线索、检查/撤退/修理按钮。
- 事故结算页、下一周目页面、设置。

React 不直接计算部位伤害、风险触发和奖励结算。

### Pixi

Pixi 负责当前砸击现场：

- 背景层。
- 目标整体图和阶段图。
- 部位热区和弱点高亮。
- 老哥走位、挥锤、受伤、暴怒。
- 机械部署表现。
- 裂痕、碎片、火花、爆炸、烟尘、飘字和镜头抖动。

Pixi 不直接写复杂状态，不结算奖励，不修改存档。Pixi 只把输入转成 action。

### Core

Core 是纯 TypeScript 逻辑层：

- 砸击源、伤害、材质抗性。
- 部位 HP、阶段、解锁链。
- 风险识别、风险触发、事故。
- 奖励、传闻、事故档案、信誉。
- 工具/机械磨损、维修、报废。
- 本轮状态和永久状态结算。

Core 不依赖 React 和 Pixi。

### Content

Content 是数据驱动内容层：

- 目标定义：快递、终极胶带快递、保险柜、报废汽车、危险品。
- 视角、部位、热区、阶段图。
- 风险模板和触发条件。
- 奖励池、传闻、事故档案。
- 工具、机械、材料。

新增目标优先写数据和资源映射，避免为每个目标写一套硬编码组件。

### Store

Store 是唯一状态入口：

- React 通过 hook 读取 selector 和调用 actions。
- Pixi 通过 vanilla store 的 `getState`、`subscribe` 和 actions 工作。
- 旧 store 短期保留兼容，P1 新系统逐步并行接入。

---

## 3. 目标目录结构

```txt
src/
  core/
    simulation/
    damage/
    risk/
    rewards/
    repair/
    save/
    state.ts
  content/
    targets/
    tools/
    machines/
    risks/
    rewards/
    schemas/
    index.ts
  scene/
    PixiStage.tsx
    SceneApp.ts
    layers/
    renderers/
    input/
    effects/
  game/
    store.ts
    actions.ts
    selectors.ts
    loop.ts
  ui/
    hud/
    panels/
    dialogs/
    result/
```

旧目录 `src/data`、`src/ui`、`src/game/engine.ts` 不能立刻删除。它们在 P1 中承担两件事：

- 保留旧拆快递闭环和旧存档可读性。
- 为新 content/core 提供迁移来源和临时兼容。

---

## 4. 核心数据结构

```ts
type TargetScale = 'desktop' | 'closeup' | 'scene' | 'site';

interface TargetDef {
  id: string;
  name: string;
  scale: TargetScale;
  phase: 'p1' | 'p2';
  intro: string;
  sellerId?: string;
  views: ViewDef[];
  parts: PartDef[];
  risks: RiskLink[];
  rewards: RewardDef;
  entryCost?: CostDef;
  unlocks?: UnlockDef[];
}

interface ViewDef {
  id: string;
  name: string;
  background: string;
  hotspots: HotspotDef[];
}

interface PartDef {
  id: string;
  name: string;
  viewId: string;
  material: MaterialId;
  hp: number;
  stages: PartStageDef[];
  machineSlots: MachineSlotDef[];
  riskTriggers: RiskTriggerDef[];
  unlocksParts?: string[];
  unlocksViews?: string[];
  skipAllowed?: boolean;
}
```

第一阶段目标约束：

- `desktop` 目标可以是单视角、少部位。
- `closeup` 目标至少 2 个部位。
- `scene` 目标至少 3 个视角和 4 个部位。
- `site` 目标 P1 只允许以 locked/silhouette 伏笔存在。
- P1 目标不能引用完整远征、完整机甲、高达、奥特曼化、外星飞船、黑方碑实装流程。

---

## 5. 状态模型

### 本轮状态

- 当前钱、废料、怒气。
- 当前目标 id、当前视角、当前选中部位。
- 目标各部位 HP、阶段、暴露状态。
- 已部署机械、机械耐久、过热、卡死。
- 工具耐久和磨损。
- 风险线索、风险等级、触发记录。
- 本轮故事摘要和当前事故状态。

### 永久状态

- 信誉。
- 事故档案。
- 传闻。
- 砸物图鉴。
- 伤疤和死法记录。
- 已发现目标。
- P2 伏笔发现记录。

P1 会先在旧 Zustand store 上增加兼容字段和 actions；后续再把旧快递系统逐步迁入新 run/meta 状态。

---

## 6. Action 边界

建议统一通过 `src/game/actions.ts` 暴露命令：

```ts
actions.startHit(partId, sourceId)
actions.stopHit()
actions.hitPart(partId, sourceId)
actions.deployMachine(machineId, partId)
actions.switchView(viewId)
actions.inspectPart(partId)
actions.repairMachine(machineId)
actions.retreatTarget()
actions.finishRun(reason)
actions.startNextRun()
```

React 和 Pixi 都只能调用 actions。奖励、风险、事故由 core 完成。

---

## 7. Pixi 场景分层

```txt
SceneRoot
  BackgroundLayer
  TargetLayer
  HotspotLayer
  ActorLayer
  MachineLayer
  FxLayer
  CameraOverlayLayer
```

最低 P1-M1 验收：

- canvas 能挂载。
- layer 能创建和销毁。
- resize 不拉伸关键目标。
- 缺失资源能显示占位。
- React HUD 能和 canvas 共存。

P1-M2 以后逐步接入真实砸击输入、部位热区和阶段图。

---

## 8. 存档与迁移

短期策略：

- 继续使用现有 Zustand persist/localStorage。
- 提高存档版本号时必须写旧存档迁移。
- 新字段必须有默认值。
- 旧的快递、工具、图鉴、成就、信誉、变异、图纸不丢。
- 旧“巨型货/离谱货/远征”先保留数据和拥有状态，但 P1 玩法入口收敛到设计范围。

中长期策略：

- 将事故档案、传闻、目标局部破坏状态迁移到 IndexedDB。
- localStorage 只保留轻量配置或迁移指针。

---

## 9. 测试策略

### Vitest

- core 伤害、材质、部位阶段。
- 风险识别、风险触发、事故结算。
- 奖励、传闻、事故档案。
- 存档迁移。
- 内容完整性。
- 旧拆快递兼容测试。

### Playwright

- 新存档能打开。
- 主界面或 Pixi canvas 存在。
- 普通快递能砸。
- 终极胶带快递能触发转场。
- 保险柜能切视角、砸部位。
- 报废汽车能切视角、部署机械。
- 危险品能触发撤退或事故结算。

---

## 10. 第一阶段完成标准

- 游戏能从新存档跑通普通快递、终极胶带快递、保险柜、报废汽车、危险品事故、下一周目。
- 玩家能明确感到核心动词是“砸”。
- 保险柜和报废汽车不是中间图标，而是场景/部位/视角目标。
- 死亡和事故会生成下一轮收益或情报。
- 第一周目不能解锁全部内容。
- P2 高级内容只作为传闻、剪影和锁定图鉴存在。
- `npm run build`、`npm run test`、`npm run test:e2e` 通过。
