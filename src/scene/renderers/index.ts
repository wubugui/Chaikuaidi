import { Graphics } from 'pixi.js';

export function drawP1StagePlaceholder(graphics: Graphics, width: number, height: number) {
  graphics.clear();
  graphics.rect(0, 0, width, height).fill({ color: 0x0b0716, alpha: 0.1 });
  graphics.roundRect(width * 0.24, height * 0.26, width * 0.52, height * 0.34, 18).fill({ color: 0xffce3a, alpha: 0.08 });
  graphics.roundRect(width * 0.34, height * 0.38, width * 0.32, height * 0.12, 12).fill({ color: 0xffffff, alpha: 0.06 });
}
