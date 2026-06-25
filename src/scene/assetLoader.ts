import { Assets, Texture } from 'pixi.js';

export async function loadTextureOrPlaceholder(src: string): Promise<Texture> {
  try {
    return await Assets.load<Texture>(src);
  } catch {
    return Texture.WHITE;
  }
}

export function placeholderTexture(): Texture {
  return Texture.WHITE;
}
