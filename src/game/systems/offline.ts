import { offlineEfficiency } from '../compute';
import { doTick, newOut, type EngineOut } from '../engine';
import type { GameState } from '../state';

export interface OfflineResult {
  seconds: number;
  opened: number;
  cash: number;
}

const MAX_OFFLINE = 8 * 3600; // 最多结算 8 小时
const MAX_STEPS = 4000;

/** 结算离线收益（就地修改 d） */
export function settleOffline(d: GameState, realSeconds: number, rand: () => number): OfflineResult {
  if (realSeconds <= 1) return { seconds: 0, opened: 0, cash: 0 };
  const eff = offlineEfficiency(d);
  const simSec = Math.min(realSeconds, MAX_OFFLINE) * eff;

  let step = 0.5;
  if (simSec / step > MAX_STEPS) step = simSec / MAX_STEPS;

  const out: EngineOut = newOut();
  let t = 0;
  while (t < simSec) {
    doTick(d, Math.min(step, simSec - t), rand, out);
    t += step;
  }
  return { seconds: Math.min(realSeconds, MAX_OFFLINE), opened: out.opened, cash: out.cash };
}
