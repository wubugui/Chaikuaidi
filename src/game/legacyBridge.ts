import { createInitialMetaState, createInitialRunState } from '../core/state';
import { P1_MACHINES } from '../content/machines/p1';
import { P1_TOOLS } from '../content/tools/p1';
import type { GameState } from './state';
import { runtimeGameStore, type RuntimeGameState } from './runtimeStore';

export function legacyStateToRuntime(legacy: GameState): RuntimeGameState {
  const run = createInitialRunState();
  run.tools = Object.fromEntries(
    P1_TOOLS.map((tool) => [
      tool.id,
      {
        toolId: tool.id,
        durability: tool.durability ?? 999,
        maxDurability: tool.durability ?? 999,
        broken: false,
        tags: tool.tags,
      },
    ]),
  );
  run.machines = Object.fromEntries(
    P1_MACHINES.map((machine) => [
      machine.id,
      {
        machineId: machine.id,
        deployedPartId: null,
        durability: machine.durability ?? 100,
        maxDurability: machine.durability ?? 100,
        overheat: 0,
        jammed: false,
        repairing: false,
      },
    ]),
  );
  return {
    run: {
      ...run,
      money: legacy.money,
      rage: legacy.rage ?? 0,
      combo: legacy.combo ?? 0,
      storyLog: [`legacy-stage:${legacy.stage}`, `legacy-tool:${legacy.currentTool}`],
    },
    meta: {
      ...createInitialMetaState(),
      reputation: legacy.reputation,
      collection: legacy.collection.slice(),
      discoveredTargets: ['parcel-basic'],
    },
  };
}

export function syncRuntimeFromLegacy(legacy: GameState) {
  const runtime = legacyStateToRuntime(legacy);
  runtimeGameStore.setState(runtime);
}
