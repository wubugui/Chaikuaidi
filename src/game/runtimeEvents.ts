import type { RiskLevel } from '../content/types';

export type GameFxEventKind =
  | 'hit'
  | 'ineffective'
  | 'crack'
  | 'debris'
  | 'float'
  | 'stage'
  | 'danger'
  | 'final-ready'
  | 'final-break'
  | 'rage-ready'
  | 'rage-burst'
  | 'accident'
  | 'reward';

export interface GameFxEvent {
  id: number;
  kind: GameFxEventKind;
  targetId?: string;
  partId?: string;
  sourceId?: string;
  x?: number;
  y?: number;
  intensity: number;
  message: string;
  riskLevel?: RiskLevel;
  value?: number;
}

type GameFxHandler = (event: GameFxEvent) => void;

const fxListeners = new Set<GameFxHandler>();
let nextFxId = 1;

export function emitGameFx(event: Omit<GameFxEvent, 'id'>): GameFxEvent {
  const fullEvent = { ...event, id: nextFxId++ };
  for (const listener of fxListeners) listener(fullEvent);
  return fullEvent;
}

export function onGameFx(listener: GameFxHandler): () => void {
  fxListeners.add(listener);
  return () => fxListeners.delete(listener);
}
