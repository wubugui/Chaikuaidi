import { Container } from 'pixi.js';

export interface SceneLayers {
  background: Container;
  target: Container;
  hotspot: Container;
  actor: Container;
  machine: Container;
  fx: Container;
  cameraOverlay: Container;
}

function namedLayer(label: string): Container {
  const layer = new Container();
  (layer as Container & { label?: string }).label = label;
  return layer;
}

export function createSceneLayers(): SceneLayers {
  return {
    background: namedLayer('BackgroundLayer'),
    target: namedLayer('TargetLayer'),
    hotspot: namedLayer('HotspotLayer'),
    actor: namedLayer('ActorLayer'),
    machine: namedLayer('MachineLayer'),
    fx: namedLayer('FxLayer'),
    cameraOverlay: namedLayer('CameraOverlayLayer'),
  };
}

export function orderedLayers(layers: SceneLayers): Container[] {
  return [layers.background, layers.target, layers.hotspot, layers.actor, layers.machine, layers.fx, layers.cameraOverlay];
}
