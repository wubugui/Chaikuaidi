import { z } from 'zod';

const materialIdSchema = z.enum(['paper', 'wood', 'metal', 'stone', 'volatile', 'anomaly', 'organic']);
const phaseSchema = z.enum(['p1', 'p2']);
const damageSourceTagSchema = z.enum([
  'hand',
  'hammer',
  'crowbar',
  'drill',
  'hydraulic',
  'pipeline',
  'mecha',
  'gundam',
  'ultra',
  'remote',
  'absurd',
]);
const riskLevelSchema = z.enum(['unknown', 'suspicious', 'dangerous', 'critical']);

export const costSchema = z.object({
  money: z.number().nonnegative().optional(),
  reputation: z.number().nonnegative().optional(),
  items: z.record(z.string(), z.number().positive()).optional(),
});

export const unlockSchema = z.object({
  kind: z.enum(['target', 'view', 'part', 'rumor', 'archive', 'panel', 'source']),
  id: z.string().min(1),
});

export const hotspotSchema = z.object({
  id: z.string().min(1),
  partId: z.string().min(1),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().positive().max(1),
  height: z.number().positive().max(1),
  label: z.string().optional(),
});

export const viewSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  background: z.string().min(1),
  hotspots: z.array(hotspotSchema),
});

export const partStageSchema = z.object({
  id: z.string().min(1),
  threshold: z.number().min(0).max(1),
  art: z.string().min(1),
  label: z.string().min(1),
});

export const machineSlotSchema = z.object({
  id: z.string().min(1),
  accepts: z.array(damageSourceTagSchema).min(1),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export const riskTriggerSchema = z.object({
  riskId: z.string().min(1),
  level: riskLevelSchema,
  threshold: z.number().min(0).max(1).optional(),
  onAction: z.enum(['hit', 'inspect', 'final-hit']).optional(),
  hint: z.string().min(1),
});

export const partSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  viewId: z.string().min(1),
  material: materialIdSchema,
  hp: z.number().positive(),
  stages: z.array(partStageSchema).min(1),
  machineSlots: z.array(machineSlotSchema),
  riskTriggers: z.array(riskTriggerSchema),
  unlocksParts: z.array(z.string().min(1)).optional(),
  unlocksViews: z.array(z.string().min(1)).optional(),
  requiredTags: z.array(damageSourceTagSchema).optional(),
  skipAllowed: z.boolean().optional(),
});

export const riskSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(['explosion', 'trap', 'anomaly', 'corrosion', 'bio', 'legal', 'pollution', 'world', 'mutation']),
  phase: phaseSchema,
  description: z.string().min(1),
  baseChance: z.number().min(0).max(1),
  preventions: z.array(z.string().min(1)),
});

export const riskLinkSchema = z.object({
  riskId: z.string().min(1),
  partIds: z.array(z.string().min(1)).min(1),
});

export const rewardSchema = z.object({
  cash: z.number().nonnegative().optional(),
  scrap: z.number().nonnegative().optional(),
  items: z.array(z.string().min(1)),
  rumors: z.array(z.string().min(1)),
  accidentArchives: z.array(z.string().min(1)),
  reputation: z.number().nonnegative().optional(),
});

export const targetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  scale: z.enum(['desktop', 'closeup', 'scene', 'site']),
  presentation: z.enum(['workbench', 'multi-part', 'scene', 'locked-preview']),
  phase: phaseSchema,
  intro: z.string().min(1),
  icon: z.string().min(1),
  sellerId: z.string().optional(),
  views: z.array(viewSchema).min(1),
  parts: z.array(partSchema).min(1),
  risks: z.array(riskLinkSchema),
  rewards: rewardSchema,
  entryCost: costSchema.optional(),
  unlocks: z.array(unlockSchema).optional(),
});

export const damageSourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tags: z.array(damageSourceTagSchema).min(1),
  power: z.number().positive(),
  durability: z.number().positive().optional(),
  materialBonus: z.partialRecord(materialIdSchema, z.number().positive()).optional(),
});

export const toolSchema = damageSourceSchema.extend({
  kind: z.literal('tool'),
  price: z.number().nonnegative(),
});

export const machineSchema = damageSourceSchema.extend({
  kind: z.literal('machine'),
  slotTags: z.array(damageSourceTagSchema).min(1),
  repairCost: costSchema,
  overheatSeconds: z.number().positive(),
});

export const materialSchema = z.object({
  id: materialIdSchema,
  toughness: z.number().positive(),
  weakTo: z.array(damageSourceTagSchema),
});

export const rumorSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  text: z.string().min(1),
  phase: phaseSchema,
});

export const accidentArchiveSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  riskId: z.string().min(1),
  text: z.string().min(1),
  phase: phaseSchema,
});

export const blackMarketOfferSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  sellerId: z.string().min(1),
  targetId: z.string().min(1),
  phase: phaseSchema,
  rarity: z.enum(['common', 'rare', 'legendary', 'unique']),
  cost: costSchema,
  limited: z.boolean(),
  unique: z.boolean(),
  lock: z.object({
    rumors: z.array(z.string().min(1)).optional(),
    accidentArchives: z.array(z.string().min(1)).optional(),
    completedTargets: z.array(z.string().min(1)).optional(),
    reputation: z.number().nonnegative().optional(),
    runCount: z.number().int().nonnegative().optional(),
  }),
  acceptText: z.string().min(1),
  declineText: z.string().min(1),
});
