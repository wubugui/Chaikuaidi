import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONTENT, validateContent } from '../index';

function publicAssetExists(path: string): boolean {
  if (!path.startsWith('/game-art/')) return true;
  return existsSync(join(process.cwd(), 'public', path));
}

describe('P1 content integrity', () => {
  it('passes schema and link validation', () => {
    expect(validateContent()).toEqual([]);
  });

  it('gives every target at least one view', () => {
    for (const target of CONTENT.targets) {
      expect(target.views.length, target.id).toBeGreaterThan(0);
    }
  });

  it('requires non-desktop targets to have multiple parts', () => {
    for (const target of CONTENT.targets) {
      if (target.scale !== 'desktop') expect(target.parts.length, target.id).toBeGreaterThan(1);
    }
  });

  it('prevents scene and site targets from using the workbench presentation', () => {
    for (const target of CONTENT.targets) {
      if (target.scale === 'scene' || target.scale === 'site') {
        expect(target.presentation, target.id).not.toBe('workbench');
      }
    }
  });

  it('binds every hotspot to an existing part and every part to an existing view', () => {
    for (const target of CONTENT.targets) {
      const partIds = new Set(target.parts.map((part) => part.id));
      const viewIds = new Set(target.views.map((view) => view.id));
      for (const view of target.views) {
        for (const hotspot of view.hotspots) expect(partIds.has(hotspot.partId), `${target.id}:${hotspot.id}`).toBe(true);
      }
      for (const part of target.parts) expect(viewIds.has(part.viewId), `${target.id}:${part.id}`).toBe(true);
    }
  });

  it('binds every risk trigger to a valid risk', () => {
    const riskIds = new Set(CONTENT.risks.map((risk) => risk.id));
    for (const target of CONTENT.targets) {
      for (const part of target.parts) {
        for (const trigger of part.riskTriggers) expect(riskIds.has(trigger.riskId), `${target.id}:${part.id}`).toBe(true);
      }
    }
  });

  it('uses existing public assets for target icons, view backgrounds, and part stage art', () => {
    for (const target of CONTENT.targets) {
      expect(publicAssetExists(target.icon), `${target.id}:icon`).toBe(true);
      for (const view of target.views) expect(publicAssetExists(view.background), `${target.id}:${view.id}`).toBe(true);
      for (const part of target.parts) {
        for (const stage of part.stages) expect(publicAssetExists(stage.art), `${target.id}:${part.id}:${stage.id}`).toBe(true);
      }
    }
  });

  it('keeps P1 targets out of P2-only playable systems', () => {
    for (const target of CONTENT.targets) {
      if (target.phase !== 'p1') continue;
      expect(target.scale === 'site' && target.presentation !== 'locked-preview', target.id).toBe(false);
      expect(target.id.includes('gundam'), target.id).toBe(false);
      expect(target.id.includes('monolith'), target.id).toBe(false);
      expect(target.id.includes('ufo'), target.id).toBe(false);
    }
  });
});
