export interface ScenePointer {
  x: number;
  y: number;
}

export function normalizePointer(x: number, y: number, width: number, height: number): ScenePointer {
  return {
    x: width > 0 ? x / width : 0,
    y: height > 0 ? y / height : 0,
  };
}
