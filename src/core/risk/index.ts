import type { RiskDef } from '../../content/types';
import type { HitMode } from '../state';

export function riskChanceAfterInspection(risk: RiskDef, clueCount: number): number {
  const reduction = Math.min(0.5, clueCount * 0.12);
  return Math.max(0.02, risk.baseChance * (1 - reduction));
}

export type RiskChoice = 'inspect' | 'remote-probe' | 'careful-hit' | 'force-hit' | 'rage-hit';

export interface RiskOutcomeInput {
  risk: RiskDef;
  clueCount: number;
  level: 'unknown' | 'suspicious' | 'dangerous' | 'critical';
  mode: HitMode;
  sourceTags: string[];
  rageBurst: boolean;
  hpRatio: number;
}

export interface RiskOutcome {
  chance: number;
  dangerScore: number;
  shouldTrigger: boolean;
  severity: 'minor' | 'major' | 'run-ending' | 'death';
  choice: RiskChoice;
}

export function calculateRiskOutcome(input: RiskOutcomeInput): RiskOutcome {
  const levelWeight = { unknown: 0.35, suspicious: 0.55, dangerous: 0.82, critical: 1.15 }[input.level];
  const remoteReduction = input.mode === 'remote' || input.sourceTags.includes('remote') ? 0.45 : 1;
  const heavyControlReduction =
    input.risk.category === 'anomaly' && (input.sourceTags.includes('gundam') || input.sourceTags.includes('ultra'))
      ? 0.62
      : input.risk.category === 'world' && (input.sourceTags.includes('mecha') || input.sourceTags.includes('gundam'))
        ? 0.72
        : input.risk.category === 'mutation' && input.sourceTags.includes('ultra')
          ? 0.68
          : 1;
  const rageMultiplier = input.rageBurst ? 1.55 : 1;
  const lowHpMultiplier = input.hpRatio <= 0.35 ? 1.25 : input.hpRatio <= 0.65 ? 1 : 0.72;
  const clueReduction = Math.max(0.45, 1 - input.clueCount * 0.12);
  const chance = Math.min(0.95, input.risk.baseChance * levelWeight * remoteReduction * heavyControlReduction * rageMultiplier * lowHpMultiplier * clueReduction);
  const dangerScore = chance + (input.level === 'critical' ? 0.22 : 0) + (input.rageBurst ? 0.18 : 0);
  const choice: RiskChoice = input.rageBurst
    ? 'rage-hit'
    : input.mode === 'remote' || input.sourceTags.includes('remote')
      ? 'remote-probe'
      : input.clueCount > 0
        ? 'careful-hit'
        : 'force-hit';
  const shouldTrigger =
    input.hpRatio <= 0.55 &&
    input.level !== 'unknown' &&
    (dangerScore >= 0.62 || (input.level === 'critical' && choice === 'force-hit'));
  const severity =
    input.risk.category === 'explosion' && input.level === 'critical'
      ? 'run-ending'
      : input.risk.category === 'world' && input.level === 'critical'
        ? 'run-ending'
      : input.risk.category === 'pollution' && input.level === 'critical'
        ? 'run-ending'
      : input.risk.category === 'mutation' && input.level === 'critical'
        ? 'death'
      : input.risk.category === 'explosion'
        ? 'major'
        : input.risk.category === 'trap'
          ? 'minor'
          : input.risk.category === 'legal'
            ? 'minor'
            : 'major';

  return { chance, dangerScore, shouldTrigger, severity, choice };
}
