import { describe, expect, it } from 'vitest';
import { assetUrl } from '../lib/asset';
import { gameArtSrc } from '../ui/GameIcon';
import { MISSION_BACKGROUNDS, SCENE_BACKGROUNDS, WORKER_PORTRAITS } from '../assets/sceneArt';

describe('assetUrl — public 资源路径带 base 前缀（防 GitHub Pages 子路径 404）', () => {
  it('给绝对 public 路径加 base 前缀并去掉裸前导斜杠', () => {
    // 测试环境 BASE_URL 为 "/"，所以结果应当不再是「站点根的裸路径直引」而是经 base 规整后的路径
    const u = assetUrl('/game-art/icons/item-socks.png');
    expect(u.endsWith('game-art/icons/item-socks.png')).toBe(true);
    // 关键：结果一定经过 base 拼接，绝不会把原始数据里的裸 "/game-art" 直接漏出去
    expect(u).toBe(import.meta.env.BASE_URL.replace(/\/?$/, '/') + 'game-art/icons/item-socks.png');
  });

  it('外链/内联资源原样返回', () => {
    expect(assetUrl('https://x/y.png')).toBe('https://x/y.png');
    expect(assetUrl('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
  });

  it('图标/背景/人物的 URL 都已经过 base 规整（不是裸 /game-art 开头）', () => {
    const icon = gameArtSrc({ kind: 'item', id: 'socks', emoji: '🧦' });
    expect(icon).toBeTruthy();
    expect(icon!.includes('game-art/')).toBe(true);
    const base = import.meta.env.BASE_URL;
    // base 为 "./" 时不应以裸 "/" 开头；base 为 "/" 时允许
    if (base !== '/') {
      expect(icon!.startsWith('/game-art')).toBe(false);
      expect(SCENE_BACKGROUNDS[1].startsWith('/game-art')).toBe(false);
      expect(WORKER_PORTRAITS.neutral.startsWith('/game-art')).toBe(false);
    }
    expect(SCENE_BACKGROUNDS[1].includes('backgrounds/stage-1-depot.png')).toBe(true);
    expect(MISSION_BACKGROUNDS.m_launchpad.includes('backgrounds/mission-m-launchpad.png')).toBe(true);
    expect(WORKER_PORTRAITS.demon.includes('characters/worker-demon.png')).toBe(true);
  });
});
