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
  it('P7：全屏特写已退役——任何稀有度（含离谱）都不再全屏阻塞', () => {
    expect(isShowcase(reveal('common', true))).toBe(false);
    expect(isShowcase(reveal('rare', true))).toBe(false);
    expect(isShowcase(reveal('epic', true))).toBe(false);
    expect(isShowcase(reveal('legendary', true))).toBe(false);
    expect(isShowcase(reveal('absurd', true))).toBe(false);
  });
  it('自动揭晓同样不再全屏（含离谱）', () => {
    expect(isShowcase(reveal('legendary', false))).toBe(false);
    expect(isShowcase(reveal('absurd', false))).toBe(false);
  });
});
