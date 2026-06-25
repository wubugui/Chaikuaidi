import type { RunState } from '../state';

export interface SimulationTickResult {
  run: RunState;
  events: string[];
}

export function tickRun(run: RunState, dtSeconds: number): SimulationTickResult {
  const next: RunState = {
    ...run,
    rage: Math.max(0, run.rage - dtSeconds * 0.35),
  };
  return { run: next, events: [] };
}
