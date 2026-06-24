export const SCENE_BACKGROUNDS: Record<1 | 2 | 3 | 4, string> = {
  1: '/game-art/backgrounds/stage-1-depot.png',
  2: '/game-art/backgrounds/stage-2-market.png',
  3: '/game-art/backgrounds/stage-3-factory.png',
  4: '/game-art/backgrounds/stage-4-reactor.png',
};

export const WORKER_PORTRAITS = {
  neutral: '/game-art/characters/worker-neutral.png',
  angry: '/game-art/characters/worker-angry.png',
  heated: '/game-art/characters/worker-heated.png',
  furious: '/game-art/characters/worker-furious.png',
  demon: '/game-art/characters/worker-demon.png',
} as const;

export type WorkerPortraitId = keyof typeof WORKER_PORTRAITS;

export function sceneBackground(stage: number): string {
  const clamped = Math.min(4, Math.max(1, Math.floor(stage))) as 1 | 2 | 3 | 4;
  return SCENE_BACKGROUNDS[clamped];
}

export function workerPortraitId(combo: number): WorkerPortraitId {
  if (combo >= 50) return 'demon';
  if (combo >= 20) return 'furious';
  if (combo >= 8) return 'heated';
  if (combo >= 1) return 'angry';
  return 'neutral';
}
