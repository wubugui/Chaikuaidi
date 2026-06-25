import type { DamageSourceTag, RiskLevel } from '../content/types';

export type RunEndReason = 'completed' | 'retreated' | 'death' | 'accident' | 'manual-restart';
export type AccidentSeverity = 'minor' | 'major' | 'death' | 'run-ending';
export type HitMode = 'melee' | 'remote';

export interface TargetPartRuntimeState {
  partId: string;
  hp: number;
  maxHp: number;
  stageId: string;
  exposed: boolean;
  destroyed: boolean;
}

export interface TargetRuntimeState {
  targetId: string;
  currentViewId: string;
  selectedPartId: string | null;
  parts: Record<string, TargetPartRuntimeState>;
  unlockedViews: string[];
  unlockedParts: string[];
  completed: boolean;
}

export interface MachineRuntimeState {
  machineId: string;
  deployedPartId: string | null;
  durability: number;
  maxDurability: number;
  overheat: number;
  jammed: boolean;
  repairing: boolean;
  level: number;
}

export interface ToolRuntimeState {
  toolId: string;
  durability: number;
  maxDurability: number;
  broken: boolean;
  tags: DamageSourceTag[];
}

// 货架上的一件独一无二货物：玩家可以拥有很多件，但同时只能把一件放上工作台砸。
// runtime 持久化每件货物自己的砸击进度，切换时不丢。revealed=半盲购买：买来时只看外形，
// 真正的材质/结构要砸了才知道。
export interface OwnedGoodState {
  instanceId: string;
  targetId: string;
  runtime: TargetRuntimeState;
  revealed: boolean;
  acquiredAt: number;
}

export interface RiskRuntimeState {
  riskId: string;
  level: RiskLevel;
  clues: string[];
  triggered: boolean;
}

export interface AccidentState {
  id: string;
  riskId: string;
  severity: AccidentSeverity;
  targetId: string;
  summary: string;
}

export interface BlackMarketState {
  sellerTrust: number;
  refreshCount: number;
  currentOfferIds: string[];
  seenOfferIds: string[];
  acceptedOfferIds: string[];
  declinedOfferIds: string[];
  uniqueClaimedTargetIds: string[];
  lastRefreshRunId: number | null;
}

export interface FactoryState {
  level: number;
  capacity: number;
  usedSlots: number;
  unlockedPipelineIds: string[];
  damagedPipelineIds: string[];
}

export interface ExpeditionState {
  unlockedLocationIds: string[];
  completedLocationIds: string[];
  worldAccidents: string[];
}

export interface GiantFormState {
  unlockedSourceIds: string[];
  activeSourceId: string | null;
  repairsDue: string[];
  mutationLevel: number;
}

export interface RunState {
  runId: number;
  money: number;
  scrap: number;
  rage: number;
  combo: number;
  comboExpiresAt: number;
  rageCooldownUntil: number;
  rageBurstUntil: number;
  activeHit: { partId: string; sourceId: string } | null;
  selectedSourceId: string;
  hitMode: HitMode;
  autoPipeline: boolean;
  currentTarget: TargetRuntimeState | null;
  ownedGoods: OwnedGoodState[];
  activeGoodInstanceId: string | null;
  // 稀有升级材料的计数库存：砸特殊货物掉落，用来升级自动砸机器（越逆天的升级越难凑齐）。
  materials: Record<string, number>;
  tools: Record<string, ToolRuntimeState>;
  machines: Record<string, MachineRuntimeState>;
  risks: Record<string, RiskRuntimeState>;
  accident: AccidentState | null;
  targetHistory: string[];
  completedTargets: string[];
  runResult: RunResult | null;
  storyLog: string[];
}

export interface MetaState {
  reputation: number;
  accidentArchives: string[];
  rumors: string[];
  collection: string[];
  scars: string[];
  discoveredTargets: string[];
  completedTargets: string[];
  unlockedPanels: string[];
  bossDiscoveries: string[];
  deathRecords: string[];
  worldChanges: string[];
  unlockedSources: string[];
  routeFocus: string | null;
  blackMarket: BlackMarketState;
  factory: FactoryState;
  expedition: ExpeditionState;
  giantForms: GiantFormState;
}

export interface RunResult {
  reason: RunEndReason;
  targetId?: string;
  money: number;
  scrap: number;
  reputation: number;
  rumors: string[];
  accidentArchives: string[];
  worldChanges: string[];
}

export function createInitialRunState(): RunState {
  return {
    runId: Date.now(),
    money: 0,
    scrap: 0,
    rage: 0,
    combo: 0,
    comboExpiresAt: 0,
    rageCooldownUntil: 0,
    rageBurstUntil: 0,
    activeHit: null,
    selectedSourceId: 'hand',
    hitMode: 'melee',
    autoPipeline: false,
    currentTarget: null,
    ownedGoods: [],
    activeGoodInstanceId: null,
    materials: {},
    tools: {},
    machines: {},
    risks: {},
    accident: null,
    targetHistory: [],
    completedTargets: [],
    runResult: null,
    storyLog: [],
  };
}

export function createInitialMetaState(): MetaState {
  return {
    reputation: 0,
    accidentArchives: [],
    rumors: [],
    collection: [],
    scars: [],
    discoveredTargets: ['parcel-basic'],
    completedTargets: [],
    unlockedPanels: [],
    bossDiscoveries: [],
    deathRecords: [],
    worldChanges: [],
    unlockedSources: [],
    routeFocus: null,
    blackMarket: {
      sellerTrust: 0,
      refreshCount: 0,
      currentOfferIds: [],
      seenOfferIds: [],
      acceptedOfferIds: [],
      declinedOfferIds: [],
      uniqueClaimedTargetIds: [],
      lastRefreshRunId: null,
    },
    factory: {
      level: 0,
      capacity: 0,
      usedSlots: 0,
      unlockedPipelineIds: [],
      damagedPipelineIds: [],
    },
    expedition: {
      unlockedLocationIds: [],
      completedLocationIds: [],
      worldAccidents: [],
    },
    giantForms: {
      unlockedSourceIds: [],
      activeSourceId: null,
      repairsDue: [],
      mutationLevel: 0,
    },
  };
}
