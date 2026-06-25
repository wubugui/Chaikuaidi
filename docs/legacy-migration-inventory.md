# 旧系统迁移盘点

本表用于 P1-M0 范围收敛。目标不是删除旧内容，而是判断它们在“暴躁老哥砸万物”正式架构下如何归位。

---

## 1. 数据系统

| 文件 | 当前内容 | P1 处理 | P2 处理 | 风险 |
|------|----------|---------|---------|------|
| `src/data/parcels.ts` | 信封、小纸箱、标准箱、木箱、集装箱等旧快递规格 | 迁移为 `desktop` 目标，服务普通快递教学和早期资源 | 可继续作为轻量刷钱目标 | 不能让后期目标继续被当成快递图标 |
| `src/data/tools.ts` | 徒手、美工刀、撬棍、角磨机、拆弹钳、液压机等工具 | 保留为 P1 工具来源，映射为 `DamageSourceDef` | 扩展为巨型形态和高级砸击源前置 | 旧工具数值偏“拆包”，需要改为材质砸击 |
| `src/data/materials.ts` | 纸壳、木质、金属、石矿、危险、异常、生物 | 直接保留，作为新材质抗性基础 | 增加高级风险材质或异常变体 | 命名可沿用，含义要从拆封转为破坏 |
| `src/data/shop.ts` | 批次、行李、货柜、保险箱、导弹、外星蛋等购买物 | P1 只启用普通快递、保险柜、导弹相关入口；其它作为伏笔或锁定 | 扩展黑市、神秘货物、异常目标 | 旧购买物很多会诱导范围发散 |
| `src/data/giants.ts` | 报废汽车、坠毁客机、搁浅货轮、坦克等巨型货 | P1 只把报废汽车重做为 `scene` 目标；其它锁定或隐藏 | 迁移为厂房、管线、远征和现场目标 | 旧巨型货是“管线拆快递”，需要重做 |
| `src/data/absurd.ts` | 高达、变形金刚、外星飞船、黑方碑等离谱货 | P1 只保留剪影、传闻、图鉴锁定 | P2 做终局和巨型形态内容 | 绝不能第一阶段开放实装入口 |
| `src/data/missions.ts` | 火箭发射台、烂尾楼、跨海大桥、高达工厂等远征 | P1 只保留传闻伏笔，不进入完整远征玩法 | P2 重做为现场级砸击，不再是计时领奖 | 旧实现把现场结构当快递拆，不符合新设计 |
| `src/data/ordnance.ts` | 原子弹、EMP、轨道炮 | P1 可作为锁定图鉴或传闻，不作为可用军火 | P2 用于终局风险和离谱砸击源 | 太早开放会破坏第一阶段平衡 |
| `src/data/mutations.ts` | 机械臂、三头六臂、铜头铁臂、激光眼等变异 | P1 可保留旧存档兼容和少量事故伏笔，不做完整变异路线 | P2 扩展为变异路线和奥特曼化前置 | 旧变异偏增量加成，需要接入事故档案 |
| `src/data/blueprints.ts` | 图纸、设备、军火制造 | P1 只保留最小机械辅助需要的部分 | P2 扩展厂房、管线、军火 | 旧图纸会过早打开高级内容 |
| `src/data/refine.ts` | 元素提炼设备和配方 | P1 暂不作为核心循环 | P2 服务军火和终局内容 | 早期会增加无关管理负担 |
| `src/data/merchant.ts` | 黑市商人刷新和报价 | P1 只做入口、少量传闻或危险品引导 | P2 扩完整黑市委托池 | 旧黑市会提前卖出终局目标 |
| `src/data/items.ts` | 掉落、收藏、材料、唯一物 | P1 复用钱、废料、车件、保险柜奖励、事故档案奖励 | P2 继续扩展收藏和终局奖励 | 奖励池需要按目标和风险重组 |
| `src/data/stages.ts` | 旧阶段解锁 | P1 需要压缩为核心闭环阶段，不允许第一周目全开 | P2 扩展多周目阶段 | 旧阶段可能过快解锁所有任务 |

---

## 2. Game 逻辑

| 文件 | 当前职责 | P1 处理 | 风险 |
|------|----------|---------|------|
| `src/game/state.ts` | 旧单轮状态，快递、工具、自动线、巨型货、远征、黑市 | 短期保留，新增 run/meta 兼容字段时必须写迁移 | 字段已经很宽，继续硬塞会不可维护 |
| `src/game/store.ts` | Zustand store、actions、persist、旧存档迁移 | 保留 React hook，同时拆出新 `actions.ts` 和 `selectors.ts`；P1 先并行接入新系统 | 大量 action 混在一个文件，Pixi 不应直接依赖旧 action |
| `src/game/engine.ts` | 旧拆包伤害、掉落、危险品、远征奖励 | 保留旧快递兼容，新的部位伤害和风险放进 `src/core` | 不能继续把保险柜和汽车当 Parcel |
| `src/game/compute.ts` | 旧数值派生 | 可复用格式和局部公式，核心砸击公式迁入 `core/damage` | 旧公式服务拆封，不完全适合部位破坏 |
| `src/game/loop.ts` | 固定 tick | 保留，后续调度新 simulation tick | 需要避免旧自动线和新机械双重结算 |
| `src/game/events.ts` | UI 特效事件 | 可复用，后续扩展 `GameFxEvent` | 事件过多会难追踪，需分清短期特效和状态 |

---

## 3. UI 与表现

| 文件/目录 | 当前职责 | P1 处理 | 风险 |
|-----------|----------|---------|------|
| `src/ui/GameScene.tsx` | DOM/CSS 工作台砸快递主舞台 | 保留为桌面级序章或过渡，PixiStage 会逐步接管正式场景目标 | 不能继续承载保险柜和汽车正式体验 |
| `src/ui/Shop.tsx` | 旧进货批次和货柜购买 | P1 收敛入口，只显示第一阶段相关内容 | 容易提前暴露高级目标 |
| `src/ui/Factory.tsx` | 旧厂房和拆卸管线 | P1 不做完整管线帝国，保留锁定或隐藏 | 和 P1 自动砸边界冲突 |
| `src/ui/Missions.tsx` | 旧离场远征 | P1 锁定或只显示伏笔 | 旧模型与新“现场砸击”冲突 |
| `src/ui/Merchant.tsx` | 黑市商人 | P1 只做入口和少量传闻 | 旧黑市池太大 |
| `src/ui/Prestige.tsx` | 旧转生 | P1 保留并逐步改为多周目“跑路重开/事故结算” | 需要从纯 prestige 变成叙事循环 |
| `src/ui/effects/*` | DOM 特效、爆闪、揭晓 | 可复用一部分，Pixi 特效另建 | DOM 特效不能遮挡 Pixi 热区 |

---

## 4. 测试

| 测试 | 当前价值 | P1 处理 |
|------|----------|---------|
| `src/__tests__/render.test.tsx` | 保证 app 能渲染 | 保留并扩展 Pixi/主界面存在检查 |
| `src/__tests__/repro_oldsave.test.tsx` | 旧存档回归 | 必须保留，新增 run/meta 字段时扩展 |
| `src/__tests__/data_integrity.test.ts` | 旧数据完整性 | 保留，另加 content integrity 测试 |
| `src/__tests__/progression_sim.test.ts` | 旧进度模拟 | 改写或新增 P1 多周目模拟 |
| `src/__tests__/endgame_sim.test.ts` | 旧终局模拟 | P1 不以此为完成标准，P2 再恢复价值 |
| `src/game/__tests__/engine.test.ts` | 旧拆包核心 | 保留桌面级兼容 |
| `src/game/__tests__/giants.test.ts` | 旧巨型货和管线 | P1 中不作为目标验收，P2 需重写 |
| `src/game/__tests__/phase*.test.ts` | 旧阶段推进 | P1 需要新阶段和锁定规则测试 |

---

## 5. 美术资源

| 资源 | P1 用法 | P2 用法 |
|------|---------|---------|
| `public/game-art/characters/worker-*.png` | 老哥情绪、走位、暴怒状态 | 变异、巨型形态驾驶反馈 |
| `public/game-art/backgrounds/stage-1-depot.png` | 快递序章背景 | 保留 |
| `public/game-art/backgrounds/stage-2-market.png` | 旧货市场背景 | 黑市和更多中型目标 |
| `public/game-art/backgrounds/stage-3-factory.png` | P1 可作为报废汽车或机械辅助背景 | 厂房和管线 |
| `public/game-art/icons/shop-safe.png` | 保险柜入口或占位资源 | 可替换为完整阶段图 |
| `public/game-art/icons/giant-g-car.png` | 报废汽车占位资源 | 可替换为多视角完整资源 |
| `public/game-art/icons/shop-missile.png` | 危险品占位资源 | 高级军火链 |
| `public/game-art/icons/absurd-a-*` | P1 只能作为锁定剪影或传闻 | P2 终局目标和巨型形态 |
| `public/game-art/backgrounds/mission-*` | P1 只可作为传闻图或锁定预览 | P2 远征现场 |

---

## 6. P1 内容锁定结论

第一阶段只进入可玩闭环的目标：

- 普通快递。
- 胶带缠了八百层的终极快递。
- 撬不动的保险柜。
- 报废汽车。
- 不该捡的导弹。

第一阶段只进入正式风险闭环的风险：

- 爆炸。
- 机关。
- 异常。

第一阶段只进入自动砸闭环的机械：

- 液压锤或机械臂，二选一或都做最小版。

第一阶段只能作为伏笔的内容：

- 完整黑市池。
- 完整远征现场。
- 完整厂房管线帝国。
- 机甲。
- 高达。
- 奥特曼化。
- 外星飞船。
- 黑方碑。

