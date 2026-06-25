import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { createInitialMetaState, createInitialRunState, type MetaState, type RunState } from '../core/state';

export interface RuntimeGameState {
  run: RunState;
  meta: MetaState;
}

export interface RuntimeGameActions {
  setRun: (run: RunState) => void;
  setMeta: (meta: MetaState) => void;
}

export type RuntimeGameStore = RuntimeGameState & RuntimeGameActions;

export const runtimeGameStore = createStore<RuntimeGameStore>()((set) => ({
  run: createInitialRunState(),
  meta: createInitialMetaState(),
  setRun: (run) => set({ run }),
  setMeta: (meta) => set({ meta }),
}));

export function useRuntimeGame<T>(selector: (state: RuntimeGameStore) => T): T {
  return useStore(runtimeGameStore, selector);
}
