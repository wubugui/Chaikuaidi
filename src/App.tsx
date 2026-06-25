import { PixiStage } from './scene/PixiStage';
import { P1Campaign } from './ui/P1Campaign';

/**
 * 《暴躁老哥砸万物》—— 正式技术框架（DESIGN.md §27）。
 * React 外壳 + PixiJS 砸击现场（PixiStage）+ 纯 TS core 驱动的战役 UI（P1Campaign）。
 * 旧 DOM/CSS 拆快递放置经营系统已彻底移除。P1Campaign 自带启动与固定 tick 循环。
 */
export default function App() {
  return (
    <div className="game">
      <PixiStage />
      <P1Campaign />
    </div>
  );
}
