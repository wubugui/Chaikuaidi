export type SceneFxKind = 'hit' | 'crack' | 'open' | 'danger' | 'rage';

export interface SceneFxEvent {
  kind: SceneFxKind;
  x: number;
  y: number;
  intensity: number;
}
