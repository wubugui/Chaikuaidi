import type { RuntimeGameStore } from './runtimeStore';

export const selectors = {
  currentTarget: (state: RuntimeGameStore) => state.run.currentTarget,
  currentViewId: (state: RuntimeGameStore) => state.run.currentTarget?.currentViewId ?? null,
  selectedPartId: (state: RuntimeGameStore) => state.run.currentTarget?.selectedPartId ?? null,
  rage: (state: RuntimeGameStore) => state.run.rage,
  combo: (state: RuntimeGameStore) => state.run.combo,
  rumors: (state: RuntimeGameStore) => state.meta.rumors,
  accidentArchives: (state: RuntimeGameStore) => state.meta.accidentArchives,
};
