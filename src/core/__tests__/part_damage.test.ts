import { describe, expect, it } from 'vitest';
import { applyPartHit, previewDamage } from '../damage';
import { createTargetRuntime, stageForHp } from '../target';
import { P1_MATERIAL_MAP } from '../../content/materials/p1';
import { P1_TARGET_MAP } from '../../content/targets/p1';
import { P1_TOOLS } from '../../content/tools/p1';

describe('P1 part damage core', () => {
  it('calculates material-sensitive damage previews', () => {
    const hand = P1_TOOLS.find((tool) => tool.id === 'hand')!;
    const paper = previewDamage(hand, P1_MATERIAL_MAP.paper);
    const metal = previewDamage(hand, P1_MATERIAL_MAP.metal);

    expect(paper.amount).toBeGreaterThan(metal.amount);
    expect(paper.effective).toBe(true);
  });

  it('maps hp percentages to part stages', () => {
    const safe = P1_TARGET_MAP['safe-stubborn'];
    const dial = safe.parts.find((part) => part.id === 'safe-dial')!;

    expect(stageForHp(dial, dial.hp, dial.hp)).toBe('intact');
    expect(stageForHp(dial, dial.hp * 0.4, dial.hp)).toBe('loose');
    expect(stageForHp(dial, 0, dial.hp)).toBe('broken');
  });

  it('damages an exposed part and unlocks follow-up content when destroyed', () => {
    const target = createTargetRuntime(P1_TARGET_MAP['safe-stubborn']);
    let current = target;
    let last = applyPartHit(current, 'safe-dial', 'hammer', 0);

    for (let i = 0; i < 40 && !last.destroyed; i++) {
      current = last.target;
      last = applyPartHit(current, 'safe-dial', 'hammer', i);
    }

    expect(last.destroyed).toBe(true);
    expect(last.target.parts['safe-dial'].hp).toBe(0);
    expect(last.target.unlockedViews).toContain('inside');
    expect(last.target.unlockedParts).toContain('safe-inner-box');
    expect(last.target.parts['safe-inner-box'].exposed).toBe(true);
  });

  it('does not damage hidden or missing parts', () => {
    const target = createTargetRuntime(P1_TARGET_MAP['safe-stubborn']);
    const hit = applyPartHit(target, 'safe-inner-box', 'hammer', 0);

    expect(hit.damage).toBe(0);
    expect(hit.effective).toBe(false);
    expect(hit.target.parts['safe-inner-box'].hp).toBe(hit.target.parts['safe-inner-box'].maxHp);
  });
});
