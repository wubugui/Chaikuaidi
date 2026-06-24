import { assetUrl } from '../lib/asset';

export const SCENE_BACKGROUNDS: Record<1 | 2 | 3 | 4, string> = {
  1: assetUrl('/game-art/backgrounds/stage-1-depot.png'),
  2: assetUrl('/game-art/backgrounds/stage-2-market.png'),
  3: assetUrl('/game-art/backgrounds/stage-3-factory.png'),
  4: assetUrl('/game-art/backgrounds/stage-4-reactor.png'),
};

export const MISSION_BACKGROUNDS: Record<string, string> = {
  m_launchpad: assetUrl('/game-art/backgrounds/mission-m-launchpad.png'),
  m_building: assetUrl('/game-art/backgrounds/mission-m-building.png'),
  m_bridge: assetUrl('/game-art/backgrounds/mission-m-bridge.png'),
  m_gundamfac: assetUrl('/game-art/backgrounds/mission-m-gundamfac.png'),
  m_nuclear: assetUrl('/game-art/backgrounds/mission-m-nuclear.png'),
  m_station: assetUrl('/game-art/backgrounds/mission-m-station.png'),
  m_collider: assetUrl('/game-art/backgrounds/mission-m-collider.png'),
};

export const WORKER_PORTRAITS = {
  neutral: assetUrl('/game-art/characters/worker-neutral.png'),
  angry: assetUrl('/game-art/characters/worker-angry.png'),
  heated: assetUrl('/game-art/characters/worker-heated.png'),
  furious: assetUrl('/game-art/characters/worker-furious.png'),
  demon: assetUrl('/game-art/characters/worker-demon.png'),
} as const;

export type WorkerPortraitId = keyof typeof WORKER_PORTRAITS;

export function sceneBackground(stage: number, missionId?: string | null): string {
  if (missionId && MISSION_BACKGROUNDS[missionId]) return MISSION_BACKGROUNDS[missionId];
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
