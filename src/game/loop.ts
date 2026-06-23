import { useEffect } from 'react';
import { useGame } from './store';

const TICK_MS = 100; // 10Hz 逻辑步进

/** 启动固定步长游戏循环（在根组件调用一次） */
export function useGameLoop() {
  useEffect(() => {
    let raf = 0;
    let acc = 0;
    let last = performance.now();
    const tick = useGame.getState().tick;

    const frame = (now: number) => {
      acc += now - last;
      last = now;
      // 落后太多（切后台）只补有限次，离线收益由 rehydrate 处理
      let steps = 0;
      while (acc >= TICK_MS && steps < 20) {
        tick(TICK_MS / 1000);
        acc -= TICK_MS;
        steps++;
      }
      if (acc > TICK_MS * 20) acc = 0;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);
}
