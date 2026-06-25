# 暴躁老哥砸万物

一个 roguelite 增量破坏游戏。玩家扮演越砸越上头的暴躁老哥，从徒手砸普通快递开始，被“胶带缠了八百层的终极快递”彻底点燃，随后走进旧货市场，砸保险柜、报废汽车和危险货物，在事故、传闻和多周目里越砸越离谱。

核心方向已经从“拆快递放置经营”调整为“场景化砸万物”：

- 快递是序章和早期燃料。
- 保险柜、汽车等中大型目标必须有部位、视角和风险。
- 事故不是删档惩罚，而是下一周目的情报和成长。
- 第一阶段只做核心可玩闭环。
- 机甲、高达、奥特曼化、远征现场、外星飞船、黑方碑等高级内容保留到第二阶段。

## 文档

- [DESIGN.md](./DESIGN.md)：完整策划案。
- [DEVELOPMENT_TODO.md](./DEVELOPMENT_TODO.md)：开发执行清单和 P1/P2 任务拆解。
- [ARCHITECTURE.md](./ARCHITECTURE.md)：正式技术架构。
- [docs/legacy-migration-inventory.md](./docs/legacy-migration-inventory.md)：旧系统迁移盘点。

## 第一阶段范围

第一阶段目标是做出能跑通、能反复玩的核心循环：

1. 普通快递教学。
2. 胶带缠了八百层的终极快递。
3. 老哥暴怒并砸坏工作台。
4. 进入旧货市场。
5. 撬不动的保险柜，近景多部位砸击。
6. 报废汽车，场景多视角砸击。
7. 一个代表性危险品事故。
8. 事故档案、信誉、传闻和下一周目。

第一阶段不实装完整远征、完整黑市池、完整管线帝国、机甲、高达、奥特曼化、外星飞船和黑方碑。它们只能以传闻、剪影、锁定图鉴或数据伏笔出现。

## 本地运行

```bash
npm install
npm run dev
```

浏览器打开 Vite 输出的本地地址。

## 常用命令

```bash
npm run build      # 类型检查 + 生产构建
npm run test       # Vitest 单元/集成测试
npm run test:e2e   # Playwright 冒烟测试
npm run test:all   # test + build + test:e2e
npm run preview    # 预览生产构建
```

## 技术栈

- React 18 + Vite + TypeScript。
- PixiJS v8 承载正式 2D 砸击现场。
- Zustand 作为 React 和 Pixi 共用状态入口。
- Zod 校验目标、部位、风险和奖励内容。
- Vitest 验证 core 逻辑、内容完整性和存档迁移。
- Playwright 验证游戏页面和关键渲染流程。
- Web Audio API 合成音效。
