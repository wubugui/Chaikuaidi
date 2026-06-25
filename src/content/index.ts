import { ITEM_MAP } from './items';
import { P2_BLACK_MARKET_OFFER_MAP, P2_BLACK_MARKET_OFFERS } from './blackMarket/p2';
import { P1_MACHINES } from './machines/p1';
import { P2_MACHINES } from './machines/p2';
import { P1_MATERIALS } from './materials/p1';
import { P1_ACCIDENT_ARCHIVE_MAP, P1_ACCIDENT_ARCHIVES, P1_RUMOR_MAP, P1_RUMORS } from './rewards/p1';
import { P2_ACCIDENT_ARCHIVE_MAP, P2_ACCIDENT_ARCHIVES, P2_RUMOR_MAP, P2_RUMORS } from './rewards/p2';
import { P1_RISK_MAP, P1_RISKS } from './risks/p1';
import { P2_RISK_MAP, P2_RISKS } from './risks/p2';
import {
  accidentArchiveSchema,
  blackMarketOfferSchema,
  machineSchema,
  materialSchema,
  riskSchema,
  rumorSchema,
  targetSchema,
  toolSchema,
} from './schemas';
import { P1_TARGETS } from './targets/p1';
import { P2_TARGETS } from './targets/p2';
import { P1_TOOLS } from './tools/p1';
import { P2_TOOLS } from './tools/p2';
import type { TargetDef } from './types';

export const TARGETS = [...P1_TARGETS, ...P2_TARGETS];
export const RISKS = [...P1_RISKS, ...P2_RISKS];
export const RUMORS = [...P1_RUMORS, ...P2_RUMORS];
export const ACCIDENT_ARCHIVES = [...P1_ACCIDENT_ARCHIVES, ...P2_ACCIDENT_ARCHIVES];
export const TOOLS = [...P1_TOOLS, ...P2_TOOLS];
export const MACHINES = [...P1_MACHINES, ...P2_MACHINES];
export const MATERIALS = P1_MATERIALS;
export const BLACK_MARKET_OFFERS = P2_BLACK_MARKET_OFFERS;

export const TARGET_MAP = Object.fromEntries(TARGETS.map((target) => [target.id, target]));
export const RISK_MAP = { ...P1_RISK_MAP, ...P2_RISK_MAP };
export const RUMOR_MAP = { ...P1_RUMOR_MAP, ...P2_RUMOR_MAP };
export const ACCIDENT_ARCHIVE_MAP = { ...P1_ACCIDENT_ARCHIVE_MAP, ...P2_ACCIDENT_ARCHIVE_MAP };
export const TOOL_MAP = Object.fromEntries(TOOLS.map((tool) => [tool.id, tool]));
export const MACHINE_MAP = Object.fromEntries(MACHINES.map((machine) => [machine.id, machine]));
export const MATERIAL_MAP = Object.fromEntries(MATERIALS.map((material) => [material.id, material]));
export const BLACK_MARKET_OFFER_MAP = P2_BLACK_MARKET_OFFER_MAP;

export const CONTENT = {
  targets: TARGETS,
  risks: RISKS,
  rumors: RUMORS,
  accidentArchives: ACCIDENT_ARCHIVES,
  tools: TOOLS,
  machines: MACHINES,
  materials: MATERIALS,
  blackMarketOffers: BLACK_MARKET_OFFERS,
};

export interface ContentValidationIssue {
  scope: string;
  message: string;
}

function pushIssue(issues: ContentValidationIssue[], scope: string, message: string) {
  issues.push({ scope, message });
}

function validateTargetLinks(target: TargetDef, issues: ContentValidationIssue[]) {
  const viewIds = new Set(target.views.map((view) => view.id));
  const partIds = new Set(target.parts.map((part) => part.id));

  for (const view of target.views) {
    for (const hotspot of view.hotspots) {
      if (!partIds.has(hotspot.partId)) pushIssue(issues, target.id, `hotspot ${hotspot.id} points to missing part ${hotspot.partId}`);
    }
  }

  for (const part of target.parts) {
    if (!viewIds.has(part.viewId)) pushIssue(issues, target.id, `part ${part.id} points to missing view ${part.viewId}`);
    for (const trigger of part.riskTriggers) {
      if (!RISK_MAP[trigger.riskId]) pushIssue(issues, target.id, `part ${part.id} points to missing risk ${trigger.riskId}`);
    }
    for (const nextPart of part.unlocksParts ?? []) {
      if (!partIds.has(nextPart)) pushIssue(issues, target.id, `part ${part.id} unlocks missing part ${nextPart}`);
    }
    for (const nextView of part.unlocksViews ?? []) {
      if (!viewIds.has(nextView)) pushIssue(issues, target.id, `part ${part.id} unlocks missing view ${nextView}`);
    }
  }

  for (const risk of target.risks) {
    if (!RISK_MAP[risk.riskId]) pushIssue(issues, target.id, `target links missing risk ${risk.riskId}`);
    for (const partId of risk.partIds) {
      if (!partIds.has(partId)) pushIssue(issues, target.id, `risk ${risk.riskId} links missing part ${partId}`);
    }
  }

  for (const itemId of target.rewards.items) {
    if (!ITEM_MAP[itemId]) pushIssue(issues, target.id, `reward item ${itemId} is missing`);
  }
  for (const rumorId of target.rewards.rumors) {
    if (!RUMOR_MAP[rumorId]) pushIssue(issues, target.id, `reward rumor ${rumorId} is missing`);
  }
  for (const archiveId of target.rewards.accidentArchives) {
    if (!ACCIDENT_ARCHIVE_MAP[archiveId]) pushIssue(issues, target.id, `reward accident archive ${archiveId} is missing`);
  }
  for (const unlock of target.unlocks ?? []) {
    if (unlock.kind === 'target' && !TARGET_MAP[unlock.id]) pushIssue(issues, target.id, `unlock target ${unlock.id} is missing`);
    if (unlock.kind === 'source' && !TOOL_MAP[unlock.id] && !MACHINE_MAP[unlock.id]) {
      pushIssue(issues, target.id, `unlock source ${unlock.id} is missing`);
    }
    if (unlock.kind === 'rumor' && !RUMOR_MAP[unlock.id]) pushIssue(issues, target.id, `unlock rumor ${unlock.id} is missing`);
    if (unlock.kind === 'archive' && !ACCIDENT_ARCHIVE_MAP[unlock.id]) pushIssue(issues, target.id, `unlock archive ${unlock.id} is missing`);
  }

  if (target.scale !== 'desktop' && target.parts.length < 2) {
    pushIssue(issues, target.id, 'non-desktop target must have at least two parts');
  }
  if ((target.scale === 'scene' || target.scale === 'site') && target.presentation === 'workbench') {
    pushIssue(issues, target.id, 'scene/site targets cannot use workbench presentation');
  }
  if (target.phase === 'p1' && target.scale === 'site' && target.presentation !== 'locked-preview') {
    pushIssue(issues, target.id, 'P1 site targets can only be locked previews');
  }
}

export function validateContent(): ContentValidationIssue[] {
  const issues: ContentValidationIssue[] = [];

  for (const target of CONTENT.targets) {
    const result = targetSchema.safeParse(target);
    if (!result.success) pushIssue(issues, target.id, result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '));
    validateTargetLinks(target, issues);
  }
  for (const risk of CONTENT.risks) {
    const result = riskSchema.safeParse(risk);
    if (!result.success) pushIssue(issues, risk.id, result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '));
  }
  for (const rumor of CONTENT.rumors) {
    const result = rumorSchema.safeParse(rumor);
    if (!result.success) pushIssue(issues, rumor.id, result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '));
  }
  for (const archive of CONTENT.accidentArchives) {
    const result = accidentArchiveSchema.safeParse(archive);
    if (!result.success) pushIssue(issues, archive.id, result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '));
    if (!RISK_MAP[archive.riskId]) pushIssue(issues, archive.id, `archive links missing risk ${archive.riskId}`);
  }
  for (const tool of CONTENT.tools) {
    const result = toolSchema.safeParse(tool);
    if (!result.success) pushIssue(issues, tool.id, result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '));
  }
  for (const machine of CONTENT.machines) {
    const result = machineSchema.safeParse(machine);
    if (!result.success) pushIssue(issues, machine.id, result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '));
  }
  for (const material of CONTENT.materials) {
    const result = materialSchema.safeParse(material);
    if (!result.success) pushIssue(issues, material.id, result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '));
  }
  for (const offer of CONTENT.blackMarketOffers) {
    const result = blackMarketOfferSchema.safeParse(offer);
    if (!result.success) pushIssue(issues, offer.id, result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '));
    if (!TARGET_MAP[offer.targetId]) pushIssue(issues, offer.id, `offer target ${offer.targetId} is missing`);
    for (const rumorId of offer.lock.rumors ?? []) {
      if (!RUMOR_MAP[rumorId]) pushIssue(issues, offer.id, `offer lock rumor ${rumorId} is missing`);
    }
    for (const archiveId of offer.lock.accidentArchives ?? []) {
      if (!ACCIDENT_ARCHIVE_MAP[archiveId]) pushIssue(issues, offer.id, `offer lock archive ${archiveId} is missing`);
    }
    for (const targetId of offer.lock.completedTargets ?? []) {
      if (!TARGET_MAP[targetId]) pushIssue(issues, offer.id, `offer lock target ${targetId} is missing`);
    }
  }

  return issues;
}
