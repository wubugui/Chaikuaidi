import type { RewardDef } from '../../content/types';

export interface RewardSummary {
  cash: number;
  scrap: number;
  items: string[];
  rumors: string[];
  accidentArchives: string[];
  reputation: number;
}

export function summarizeReward(reward: RewardDef): RewardSummary {
  return {
    cash: reward.cash ?? 0,
    scrap: reward.scrap ?? 0,
    items: reward.items.slice(),
    rumors: reward.rumors.slice(),
    accidentArchives: reward.accidentArchives.slice(),
    reputation: reward.reputation ?? 0,
  };
}
