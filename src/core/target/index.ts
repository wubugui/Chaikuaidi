import type { PartDef, TargetDef } from '../../content/types';
import type { TargetPartRuntimeState, TargetRuntimeState } from '../state';

export function stageForHp(part: PartDef, hp: number, maxHp: number): string {
  const pct = maxHp > 0 ? hp / maxHp : 0;
  let stageId = part.stages[0]?.id ?? 'unknown';
  for (const stage of part.stages) {
    if (pct <= stage.threshold) stageId = stage.id;
  }
  return stageId;
}

export function createTargetRuntime(target: TargetDef): TargetRuntimeState {
  const firstView = target.views[0];
  const unlockGatedViews = new Set(target.parts.flatMap((part) => part.unlocksViews ?? []));
  const unlockGatedParts = new Set(target.parts.flatMap((part) => part.unlocksParts ?? []));
  const initiallyUnlockedViews = target.views
    .filter((view) => view.id === firstView.id || !unlockGatedViews.has(view.id))
    .map((view) => view.id);
  const initiallyUnlockedParts = target.parts
    .filter((part) => initiallyUnlockedViews.includes(part.viewId) && !unlockGatedParts.has(part.id))
    .map((part) => part.id);
  const parts: Record<string, TargetPartRuntimeState> = {};

  for (const part of target.parts) {
    const exposed = initiallyUnlockedParts.includes(part.id);
    parts[part.id] = {
      partId: part.id,
      hp: part.hp,
      maxHp: part.hp,
      stageId: stageForHp(part, part.hp, part.hp),
      exposed,
      destroyed: false,
    };
  }

  return {
    targetId: target.id,
    currentViewId: firstView.id,
    selectedPartId: initiallyUnlockedParts[0] ?? null,
    parts,
    unlockedViews: initiallyUnlockedViews,
    unlockedParts: initiallyUnlockedParts,
    completed: false,
  };
}

export function isTargetCompleted(runtime: TargetRuntimeState): boolean {
  return Object.values(runtime.parts)
    .filter((part) => part.exposed)
    .every((part) => part.destroyed);
}
