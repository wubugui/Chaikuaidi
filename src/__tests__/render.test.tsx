// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import App from '../App';
import { isShowcase } from '../ui/effects/RevealLayer';
import type { RevealData } from '../game/events';

function reveal(topRarity: RevealData['topRarity'], manual: boolean): RevealData {
  return { id: 1, parcelEmoji: '📦', parcelName: 't', items: [], topRarity, manual };
}

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  localStorage.clear();
});

describe('App renders', () => {
  it('mounts without crashing and shows the game', async () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    const root = createRoot(div);
    await act(async () => {
      root.render(<App />);
    });
    expect(div.textContent).toContain('拆快递');
    await act(async () => {
      root.unmount();
    });
    div.remove();
  });
});

describe('isShowcase threshold', () => {
  it('only legendary+ full-screens (manual rare/epic are pops, not showcases)', () => {
    expect(isShowcase(reveal('common', true))).toBe(false);
    expect(isShowcase(reveal('rare', true))).toBe(false);
    expect(isShowcase(reveal('epic', true))).toBe(false);
    expect(isShowcase(reveal('legendary', true))).toBe(true);
    expect(isShowcase(reveal('absurd', true))).toBe(true);
  });
  it('auto reveals also only showcase at legendary+', () => {
    expect(isShowcase(reveal('epic', false))).toBe(false);
    expect(isShowcase(reveal('legendary', false))).toBe(true);
  });
});
