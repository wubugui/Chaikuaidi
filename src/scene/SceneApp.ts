import { Application, Graphics, Text } from 'pixi.js';
import { P1_TARGET_MAP } from '../content/targets/p1';
import { runtimeGameStore } from '../game/runtimeStore';
import { placeholderTexture } from './assetLoader';
import { createSceneLayers, orderedLayers, type SceneLayers } from './layers';
import { drawP1StagePlaceholder } from './renderers';

export class SceneApp {
  private app: Application | null = null;
  private placeholder: Graphics | null = null;
  private layers: SceneLayers | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private unsubscribe: (() => void) | null = null;

  async mount(host: HTMLElement) {
    if (this.app) return;

    const app = new Application();
    await app.init({
      backgroundAlpha: 0,
      antialias: true,
      resizeTo: host,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });

    app.canvas.dataset.testid = 'pixi-stage-canvas';
    app.canvas.setAttribute('aria-hidden', 'true');
    host.appendChild(app.canvas);

    const layers = createSceneLayers();
    for (const layer of orderedLayers(layers)) app.stage.addChild(layer);

    const placeholder = new Graphics();
    placeholderTexture();
    layers.background.addChild(placeholder);

    this.app = app;
    this.placeholder = placeholder;
    this.layers = layers;
    this.draw();

    this.resizeObserver = new ResizeObserver(() => this.draw());
    this.resizeObserver.observe(host);
    this.unsubscribe = runtimeGameStore.subscribe(() => this.draw());
  }

  destroy() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.placeholder = null;
    this.layers = null;
    if (this.app) {
      this.app.destroy(true);
      this.app = null;
    }
  }

  private draw() {
    if (!this.app || !this.placeholder || !this.layers) return;
    const width = this.app.screen.width;
    const height = this.app.screen.height;
    drawP1StagePlaceholder(this.placeholder, width, height);

    for (const layer of [this.layers.target, this.layers.hotspot, this.layers.actor, this.layers.machine, this.layers.fx, this.layers.cameraOverlay]) {
      for (const child of layer.removeChildren()) child.destroy();
    }

    const run = runtimeGameStore.getState().run;
    const runtime = run.currentTarget;
    const target = runtime ? P1_TARGET_MAP[runtime.targetId] : null;
    if (!target || !runtime) {
      const label = new Text({ text: 'P1 作业台待命', style: { fill: '#ffce3a', fontSize: 18, fontWeight: '800' } });
      label.anchor.set(0.5);
      label.x = width / 2;
      label.y = height * 0.42;
      this.layers.target.addChild(label);
      return;
    }

    const currentView = target.views.find((view) => view.id === runtime.currentViewId) ?? target.views[0];
    const viewIndex = target.views.findIndex((view) => view.id === currentView.id);
    const palette = [0x7a4b22, 0x244c5c, 0x4e3a75, 0x5b242b, 0x2f5a38];
    const base = palette[Math.max(0, viewIndex) % palette.length];

    const viewPlate = new Graphics();
    viewPlate.roundRect(width * 0.12, height * 0.12, width * 0.76, height * 0.72, 20)
      .fill({ color: base, alpha: 0.16 })
      .stroke({ color: 0xffce3a, alpha: 0.22, width: 2 });
    this.layers.target.addChild(viewPlate);

    const body = new Graphics();
    if (target.scale === 'scene') {
      body.roundRect(width * 0.18, height * 0.38, width * 0.64, height * 0.2, 16)
        .fill({ color: 0x2d3438, alpha: 0.8 })
        .stroke({ color: 0xf0c15a, alpha: 0.55, width: 3 });
      body.circle(width * 0.3, height * 0.6, height * 0.055).fill({ color: 0x111111, alpha: 0.9 });
      body.circle(width * 0.7, height * 0.6, height * 0.055).fill({ color: 0x111111, alpha: 0.9 });
    } else if (target.scale === 'closeup') {
      body.roundRect(width * 0.34, height * 0.23, width * 0.32, height * 0.44, 22)
        .fill({ color: 0x3b4650, alpha: 0.82 })
        .stroke({ color: 0xd7c7aa, alpha: 0.6, width: 3 });
    } else {
      body.roundRect(width * 0.38, height * 0.32, width * 0.24, height * 0.24, 14)
        .fill({ color: 0x9b6a35, alpha: 0.82 })
        .stroke({ color: 0xffce3a, alpha: 0.55, width: 3 });
    }
    this.layers.target.addChild(body);

    for (const hotspot of currentView.hotspots) {
      const part = runtime.parts[hotspot.partId];
      if (!part?.exposed) continue;
      const hpPct = part.maxHp > 0 ? part.hp / part.maxHp : 0;
      const box = new Graphics();
      box.roundRect(hotspot.x * width, hotspot.y * height, hotspot.width * width, hotspot.height * height, 8)
        .fill({ color: part.destroyed ? 0xffffff : 0xffce3a, alpha: part.destroyed ? 0.08 : 0.16 })
        .stroke({ color: part.destroyed ? 0xffffff : 0xffce3a, alpha: runtime.selectedPartId === hotspot.partId ? 0.95 : 0.5, width: runtime.selectedPartId === hotspot.partId ? 3 : 2 });
      box.rect(hotspot.x * width, (hotspot.y + hotspot.height) * height - 5, hotspot.width * width * hpPct, 4).fill({ color: 0x54e08a, alpha: 0.9 });
      this.layers.hotspot.addChild(box);
    }

    const title = new Text({
      text: `${target.name} · ${currentView.name}`,
      style: { fill: '#fff3e0', fontSize: 16, fontWeight: '900', dropShadow: { color: '#000000', blur: 2, distance: 2 } },
    });
    title.anchor.set(0.5);
    title.x = width / 2;
    title.y = height * 0.15;
    this.layers.cameraOverlay.addChild(title);
  }
}
