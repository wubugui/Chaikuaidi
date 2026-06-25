import type { MaterialId } from '../data/materials';

export type ContentPhase = 'p1' | 'p2';
export type TargetScale = 'desktop' | 'closeup' | 'scene' | 'site';
export type TargetPresentation = 'workbench' | 'multi-part' | 'scene' | 'locked-preview';
export type RiskLevel = 'unknown' | 'suspicious' | 'dangerous' | 'critical';
export type DamageSourceTag =
  | 'hand'
  | 'hammer'
  | 'crowbar'
  | 'drill'
  | 'hydraulic'
  | 'pipeline'
  | 'mecha'
  | 'gundam'
  | 'ultra'
  | 'remote'
  | 'absurd';

export interface CostDef {
  money?: number;
  reputation?: number;
  items?: Record<string, number>;
}

export interface UnlockDef {
  kind: 'target' | 'view' | 'part' | 'rumor' | 'archive' | 'panel' | 'source';
  id: string;
}

export interface HotspotDef {
  id: string;
  partId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

export interface ViewDef {
  id: string;
  name: string;
  background: string;
  hotspots: HotspotDef[];
}

export interface PartStageDef {
  id: string;
  threshold: number;
  art: string;
  label: string;
}

export interface MachineSlotDef {
  id: string;
  accepts: DamageSourceTag[];
  x: number;
  y: number;
}

export interface RiskTriggerDef {
  riskId: string;
  level: RiskLevel;
  threshold?: number;
  onAction?: 'hit' | 'inspect' | 'final-hit';
  hint: string;
}

export interface PartDef {
  id: string;
  name: string;
  viewId: string;
  material: MaterialId;
  hp: number;
  stages: PartStageDef[];
  machineSlots: MachineSlotDef[];
  riskTriggers: RiskTriggerDef[];
  unlocksParts?: string[];
  unlocksViews?: string[];
  requiredTags?: DamageSourceTag[];
  skipAllowed?: boolean;
}

export interface RiskDef {
  id: string;
  name: string;
  category: 'explosion' | 'trap' | 'anomaly' | 'corrosion' | 'bio' | 'legal' | 'pollution' | 'world' | 'mutation';
  phase: ContentPhase;
  description: string;
  baseChance: number;
  preventions: string[];
}

export interface RiskLink {
  riskId: string;
  partIds: string[];
}

export interface RewardDef {
  cash?: number;
  scrap?: number;
  items: string[];
  rumors: string[];
  accidentArchives: string[];
  reputation?: number;
}

export interface TargetDef {
  id: string;
  name: string;
  scale: TargetScale;
  presentation: TargetPresentation;
  phase: ContentPhase;
  intro: string;
  icon: string;
  sellerId?: string;
  views: ViewDef[];
  parts: PartDef[];
  risks: RiskLink[];
  rewards: RewardDef;
  entryCost?: CostDef;
  unlocks?: UnlockDef[];
}

export interface DamageSourceDef {
  id: string;
  name: string;
  tags: DamageSourceTag[];
  power: number;
  durability?: number;
  materialBonus?: Partial<Record<MaterialId, number>>;
}

export interface ToolDef extends DamageSourceDef {
  kind: 'tool';
  price: number;
}

export interface MachineDef extends DamageSourceDef {
  kind: 'machine';
  slotTags: DamageSourceTag[];
  repairCost: CostDef;
  overheatSeconds: number;
}

export interface MaterialDef {
  id: MaterialId;
  toughness: number;
  weakTo: DamageSourceTag[];
}

export interface RumorDef {
  id: string;
  title: string;
  text: string;
  phase: ContentPhase;
}

export interface AccidentArchiveDef {
  id: string;
  title: string;
  riskId: string;
  text: string;
  phase: ContentPhase;
}

export interface BlackMarketOfferDef {
  id: string;
  title: string;
  sellerId: string;
  targetId: string;
  phase: ContentPhase;
  rarity: 'common' | 'rare' | 'legendary' | 'unique';
  cost: CostDef;
  limited: boolean;
  unique: boolean;
  lock: {
    rumors?: string[];
    accidentArchives?: string[];
    completedTargets?: string[];
    reputation?: number;
    runCount?: number;
  };
  acceptText: string;
  declineText: string;
}
