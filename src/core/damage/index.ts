import { MACHINES, MATERIAL_MAP, TARGET_MAP, TOOLS } from '../../content';
import type { DamageSourceDef, MaterialDef } from '../../content/types';
import type { TargetRuntimeState } from '../state';
import { isTargetCompleted, stageForHp } from '../target';

export interface DamagePreview {
  amount: number;
  effective: boolean;
  multiplier: number;
}

export function previewDamage(source: DamageSourceDef, material: MaterialDef): DamagePreview {
  const tagMatch = source.tags.some((tag) => material.weakTo.includes(tag));
  const materialBonus = source.materialBonus?.[material.id] ?? 1;
  const multiplier = Math.max(0.1, materialBonus / material.toughness) * (tagMatch ? 1.25 : 1);
  return {
    amount: Math.max(1, Math.round(source.power * multiplier)),
    effective: multiplier >= 0.35,
    multiplier,
  };
}

export interface PartHitResult {
  target: TargetRuntimeState;
  damage: number;
  effective: boolean;
  stageChanged: boolean;
  destroyed: boolean;
  completed: boolean;
  unlockedParts: string[];
  unlockedViews: string[];
}

const DAMAGE_SOURCE_MAP = Object.fromEntries([...TOOLS, ...MACHINES].map((source) => [source.id, source]));

export function applyPartHit(
  runtime: TargetRuntimeState,
  partId: string,
  sourceId: string,
  combo: number,
  damageMultiplier = 1,
  ignoreRequiredTags = false,
): PartHitResult {
  const targetDef = TARGET_MAP[runtime.targetId];
  const partDef = targetDef?.parts.find((part) => part.id === partId);
  const partState = runtime.parts[partId];
  const source = DAMAGE_SOURCE_MAP[sourceId];
  const material = partDef ? MATERIAL_MAP[partDef.material] : undefined;

  if (!targetDef || !partDef || !partState || !source || !material || !partState.exposed || partState.destroyed) {
    return {
      target: runtime,
      damage: 0,
      effective: false,
      stageChanged: false,
      destroyed: false,
      completed: runtime.completed,
      unlockedParts: [],
      unlockedViews: [],
    };
  }
  if (!ignoreRequiredTags && partDef.requiredTags?.length && !source.tags.some((tag) => partDef.requiredTags?.includes(tag))) {
    return {
      target: runtime,
      damage: 0,
      effective: false,
      stageChanged: false,
      destroyed: false,
      completed: runtime.completed,
      unlockedParts: [],
      unlockedViews: [],
    };
  }

  const preview = previewDamage(source, material);
  const comboMultiplier = Math.min(3, 1 + combo * 0.028);
  const damage = Math.max(1, Math.round(preview.amount * comboMultiplier * damageMultiplier));
  const nextHp = Math.max(0, partState.hp - damage);
  const nextStageId = stageForHp(partDef, nextHp, partState.maxHp);
  const destroyed = nextHp <= 0;
  const unlockedParts = destroyed ? (partDef.unlocksParts ?? []).filter((id) => !runtime.unlockedParts.includes(id)) : [];
  const unlockedViews = destroyed ? (partDef.unlocksViews ?? []).filter((id) => !runtime.unlockedViews.includes(id)) : [];

  const nextParts = { ...runtime.parts };
  const unlockGatedParts = new Set(targetDef.parts.flatMap((part) => part.unlocksParts ?? []));
  nextParts[partId] = {
    ...partState,
    hp: nextHp,
    stageId: nextStageId,
    destroyed,
  };
  for (const id of unlockedParts) {
    if (nextParts[id]) nextParts[id] = { ...nextParts[id], exposed: true };
  }
  for (const viewId of unlockedViews) {
    for (const part of targetDef.parts) {
      if (part.viewId !== viewId || unlockGatedParts.has(part.id)) continue;
      if (nextParts[part.id]) nextParts[part.id] = { ...nextParts[part.id], exposed: true };
    }
  }

  const nextTarget: TargetRuntimeState = {
    ...runtime,
    parts: nextParts,
    unlockedParts: [...runtime.unlockedParts, ...unlockedParts],
    unlockedViews: [...runtime.unlockedViews, ...unlockedViews],
  };
  nextTarget.completed = isTargetCompleted(nextTarget);

  return {
    target: nextTarget,
    damage,
    effective: preview.effective,
    stageChanged: partState.stageId !== nextStageId,
    destroyed,
    completed: nextTarget.completed,
    unlockedParts,
    unlockedViews,
  };
}

export function damageSourceExists(sourceId: string): boolean {
  return !!DAMAGE_SOURCE_MAP[sourceId];
}
