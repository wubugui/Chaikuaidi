import { applyPartHit, damageSourceExists, previewDamage } from '../core/damage';
import { calculateRiskOutcome } from '../core/risk';
import {
  createInitialRunState,
  type AccidentSeverity,
  type MetaState,
  type HitMode,
  type MachineRuntimeState,
  type RunResult,
  type RunState,
  type ToolRuntimeState,
} from '../core/state';
import { createTargetRuntime } from '../core/target';
import {
  ACCIDENT_ARCHIVES,
  BLACK_MARKET_OFFERS,
  MACHINE_MAP,
  MACHINES,
  MATERIAL_MAP,
  RISK_MAP,
  TARGET_MAP,
  TARGETS,
  TOOL_MAP,
  TOOLS,
} from '../content';
import type { BlackMarketOfferDef, DamageSourceDef, MachineDef, RiskLevel, TargetDef } from '../content/types';
import { runtimeGameStore } from './runtimeStore';
import { emitGameFx } from './runtimeEvents';

const COMBO_WINDOW_MS = 1800;
const RAGE_COOLDOWN_MS = 4500;
const RAGE_BURST_MS = 1300;
const RISK_ORDER: Record<RiskLevel, number> = { unknown: 0, suspicious: 1, dangerous: 2, critical: 3 };
const SOURCE_MAP = Object.fromEntries([...TOOLS, ...MACHINES].map((source) => [source.id, source]));
const TOOL_IDS = new Set(TOOLS.map((tool) => tool.id));
const MACHINE_IDS = new Set(MACHINES.map((machine) => machine.id));
const STARTER_TOOL_IDS = new Set(['hand', 'hammer', 'crowbar', 'remote-probe']);
const STARTER_MACHINE_IDS = new Set(['hydraulic-hammer', 'scrap-arm']);
const PIPELINE_SOURCE_IDS = new Set(['heavy-crusher', 'crawler-press', 'rail-smash-array']);
const GIANT_SOURCE_IDS = new Set(['mecha-fist', 'mecha-shoulder-ram', 'gundam-pile', 'ultra-beam', 'ultra-stomp', 'ultra-flying-kick']);

// 命中现象：正常表现（按材质）+ 危险征兆（用于"敢不敢继续砸"的决策）
const NORMAL_PHENOMENA: Record<string, string[]> = {
  paper: ['碎屑乱飞', '胶带崩开一道', '纸味窜出来'],
  wood: ['木刺崩开', '咔嚓一声', '木屑四散'],
  metal: ['火花四溅', '铛的一声', '砸凹一块'],
  stone: ['石渣乱蹦', '闷响震手', '裂了道缝'],
  organic: ['黏液溅了一下', '里面缩了缩', '腥味更重了'],
  volatile: ['壳里晃了晃', '飘出一缕焦味', '咕嘟一声'],
  anomaly: ['影子歪了一下', '一阵耳鸣', '空气凉了半度'],
};
const DANGER_PHENOMENA = ['发烫了！', '滴答声变快了', '鼓包了', '里面有东西在动', '冒出一缕青烟', '读数在跳'];
const DROP_LINES = ['叮当', '抠出点东西', '掉了点零碎'];
function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

// 进入目标时自动选一把"砸得动"的工具，避免新手拿徒手砸金属保险柜毫无反馈
function bestOwnedSourceFor(run: RunState, target: TargetDef, partId: string | null): string {
  const partDef = target.parts.find((part) => part.id === partId) ?? target.parts[0];
  const material = partDef ? MATERIAL_MAP[partDef.material] : undefined;
  if (!material) return run.selectedSourceId;
  let best = run.selectedSourceId;
  let bestScore = -1;
  for (const [toolId, toolState] of Object.entries(run.tools)) {
    if (toolState.broken) continue;
    if (GIANT_SOURCE_IDS.has(toolId) && target.scale === 'desktop') continue;
    const source = sourceFor(toolId);
    if (!source) continue;
    const preview = previewDamage(source, material);
    const score = (preview.effective ? 1000 : 0) + preview.amount;
    if (score > bestScore) {
      bestScore = score;
      best = toolId;
    }
  }
  return best;
}

// 自动管线：从拥有的工具 + 机械里挑对该部位最有效的砸击源（忽略作业位限制，保证永远砸得动）
function bestAutoSourceFor(run: RunState, target: TargetDef, partId: string): string {
  const partDef = target.parts.find((part) => part.id === partId);
  const material = partDef ? MATERIAL_MAP[partDef.material] : undefined;
  if (!material) return run.selectedSourceId;
  const candidates = [
    ...Object.entries(run.tools).filter(([, tool]) => !tool.broken).map(([id]) => id),
    ...Object.entries(run.machines).filter(([, machine]) => machine.durability > 0).map(([id]) => id),
  ];
  let best = run.selectedSourceId;
  let bestScore = -1;
  for (const id of candidates) {
    if (GIANT_SOURCE_IDS.has(id) && target.scale === 'desktop') continue;
    const source = sourceFor(id);
    if (!source) continue;
    if (partDef?.requiredTags?.length && !source.tags.some((tag) => partDef.requiredTags?.includes(tag))) continue;
    const preview = previewDamage(source, material);
    const score = (preview.effective ? 1000 : 0) + preview.amount;
    if (score > bestScore) {
      bestScore = score;
      best = id;
    }
  }
  return best;
}

// 自动管线：挑下一个要砸的部位（优先当前视角，挑血量最低的先砸开，再自动流转）
function pickAutoPart(run: RunState, target: TargetDef): { partId: string; viewId: string } | null {
  const ct = run.currentTarget;
  if (!ct) return null;
  const exposed = target.parts.filter((part) => {
    const ps = ct.parts[part.id];
    return ps && ps.exposed && !ps.destroyed;
  });
  if (!exposed.length) return null;
  const inView = exposed.filter((part) => part.viewId === ct.currentViewId);
  const reachable = exposed.filter((part) => ct.unlockedViews.includes(part.viewId));
  const pool = inView.length ? inView : reachable.length ? reachable : exposed;
  pool.sort((a, b) => ct.parts[a.id].hp - ct.parts[b.id].hp);
  return { partId: pool[0].id, viewId: pool[0].viewId };
}

// 机械流转：部位砸开后，找下一个有合适作业位的暴露部位（血量最低优先）
function nextMachinePart(run: RunState, target: TargetDef, machineDef: MachineDef): string | null {
  const ct = run.currentTarget;
  if (!ct) return null;
  const candidates = target.parts.filter((part) => {
    const ps = ct.parts[part.id];
    if (!ps || !ps.exposed || ps.destroyed) return false;
    return part.machineSlots.some((slot) => machineDef.slotTags.some((tag) => slot.accepts.includes(tag)));
  });
  if (!candidates.length) return null;
  candidates.sort((a, b) => ct.parts[a.id].hp - ct.parts[b.id].hp);
  return candidates[0].id;
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function createStarterRun(meta: MetaState, startMoney = 0): RunState {
  const run = createInitialRunState();
  run.money = startMoney;
  run.selectedSourceId = 'hand';
  const unlockedSources = new Set(meta.unlockedSources);
  run.tools = Object.fromEntries(
    TOOLS.filter((tool) => STARTER_TOOL_IDS.has(tool.id) || unlockedSources.has(tool.id)).map((tool) => [
      tool.id,
      {
        toolId: tool.id,
        durability: tool.durability ?? 999,
        maxDurability: tool.durability ?? 999,
        broken: false,
        tags: tool.tags,
      },
    ]),
  );
  run.machines = Object.fromEntries(
    MACHINES.filter((machine) => STARTER_MACHINE_IDS.has(machine.id) || unlockedSources.has(machine.id)).map((machine) => [
      machine.id,
      {
        machineId: machine.id,
        deployedPartId: null,
        durability: machine.durability ?? 100,
        maxDurability: machine.durability ?? 100,
        overheat: 0,
        jammed: false,
        repairing: false,
      },
    ]),
  );
  return run;
}

function sourceFor(sourceId: string): DamageSourceDef | undefined {
  return SOURCE_MAP[sourceId];
}

function isImportantTarget(target: TargetDef): boolean {
  return target.scale !== 'desktop' || target.id === 'parcel-tape-final';
}

function archiveForRisk(riskId: string): string | undefined {
  return ACCIDENT_ARCHIVES.find((archive) => archive.riskId === riskId)?.id;
}

function accidentRumors(riskId: string): string[] {
  if (riskId === 'explosion-missile') return ['rumor-p2-monolith-shadow', 'rumor-black-market-open'];
  if (riskId === 'bio-egg-hatch') return ['rumor-ufo-hull'];
  if (riskId === 'pollution-reactor-leak') return ['rumor-monolith-contract'];
  if (riskId === 'world-structure-collapse') return ['rumor-mecha-frame'];
  if (riskId === 'mutation-giant-overload') return ['rumor-monolith-contract'];
  if (riskId === 'anomaly-monolith-echo') return ['rumor-monolith-contract', 'rumor-ultra-signal'];
  return [];
}

function sourceRuntime(sourceId: string): { kind: 'tool'; runtime: ToolRuntimeState } | { kind: 'machine'; runtime: MachineRuntimeState } | null {
  const tool = TOOL_MAP[sourceId];
  if (tool) {
    return {
      kind: 'tool',
      runtime: {
        toolId: tool.id,
        durability: tool.durability ?? 999,
        maxDurability: tool.durability ?? 999,
        broken: false,
        tags: tool.tags,
      },
    };
  }
  const machine = MACHINE_MAP[sourceId];
  if (machine) {
    return {
      kind: 'machine',
      runtime: {
        machineId: machine.id,
        deployedPartId: null,
        durability: machine.durability ?? 100,
        maxDurability: machine.durability ?? 100,
        overheat: 0,
        jammed: false,
        repairing: false,
      },
    };
  }
  return null;
}

function metaWithUnlockedSources(meta: MetaState, sourceIds: string[]): MetaState {
  const unlockedSources = unique([...meta.unlockedSources, ...sourceIds]);
  const pipelineIds = sourceIds.filter((id) => PIPELINE_SOURCE_IDS.has(id));
  const giantIds = sourceIds.filter((id) => GIANT_SOURCE_IDS.has(id));
  return {
    ...meta,
    unlockedSources,
    factory: {
      ...meta.factory,
      level: pipelineIds.length > 0 ? Math.max(1, meta.factory.level) : meta.factory.level,
      capacity: pipelineIds.length > 0 ? Math.max(3, meta.factory.capacity) : meta.factory.capacity,
      unlockedPipelineIds: unique([...meta.factory.unlockedPipelineIds, ...pipelineIds]),
    },
    giantForms: {
      ...meta.giantForms,
      unlockedSourceIds: unique([...meta.giantForms.unlockedSourceIds, ...giantIds]),
      activeSourceId: meta.giantForms.activeSourceId ?? giantIds[0] ?? null,
    },
  };
}

function runWithUnlockedSources(run: RunState, sourceIds: string[]): RunState {
  let tools = run.tools;
  let machines = run.machines;
  for (const sourceId of sourceIds) {
    const runtime = sourceRuntime(sourceId);
    if (!runtime) continue;
    if (runtime.kind === 'tool') tools = { ...tools, [sourceId]: runtime.runtime };
    if (runtime.kind === 'machine') machines = { ...machines, [sourceId]: runtime.runtime };
  }
  return { ...run, tools, machines };
}

function canPayCost(run: RunState, meta: MetaState, cost?: TargetDef['entryCost']): boolean {
  if (!cost) return true;
  if (cost.money && run.money < cost.money) return false;
  if (cost.reputation && meta.reputation < cost.reputation) return false;
  return true;
}

function spendCost(run: RunState, cost?: TargetDef['entryCost']): RunState {
  if (!cost) return run;
  return { ...run, money: run.money - (cost.money ?? 0) };
}

function targetFactorySlots(target: TargetDef): number {
  if (target.id === 'factory-pipeline-core') return 0;
  if (target.phase === 'p2' && target.scale === 'scene') return 2;
  return 0;
}

function factoryCanHost(meta: MetaState, target: TargetDef): boolean {
  const slots = targetFactorySlots(target);
  if (slots <= 0) return true;
  return meta.factory.capacity - meta.factory.usedSlots >= slots;
}

function canStartEndgame(meta: MetaState, targetId: string): boolean {
  if (targetId !== 'black-monolith') return true;
  return (
    meta.rumors.includes('rumor-monolith-contract') &&
    meta.accidentArchives.includes('archive-monolith-echo') &&
    meta.completedTargets.includes('ufo-hull') &&
    meta.completedTargets.includes('living-mecha-beast') &&
    meta.bossDiscoveries.some((id) => id === 'ufo-hull' || id === 'living-mecha-beast') &&
    meta.unlockedSources.some((id) => id.startsWith('ultra'))
  );
}

function isBossDiscoveryTarget(target: TargetDef): boolean {
  return (
    target.id === 'expedition-gundam-factory' ||
    target.id === 'ufo-hull' ||
    target.id === 'living-mecha-beast' ||
    target.id === 'black-monolith'
  );
}

function hasAll(required: string[] | undefined, owned: string[]): boolean {
  if (!required?.length) return true;
  return required.every((id) => owned.includes(id));
}

function offerUnlocked(offer: BlackMarketOfferDef, meta: MetaState): boolean {
  if (offer.unique && meta.blackMarket.uniqueClaimedTargetIds.includes(offer.targetId)) return false;
  if (!hasAll(offer.lock.rumors, meta.rumors)) return false;
  if (!hasAll(offer.lock.accidentArchives, meta.accidentArchives)) return false;
  if (!hasAll(offer.lock.completedTargets, meta.completedTargets)) return false;
  if ((offer.lock.reputation ?? 0) > meta.reputation) return false;
  if ((offer.lock.runCount ?? 0) > meta.deathRecords.length + 1) return false;
  return true;
}

function nextBlackMarketOfferIds(meta: MetaState): string[] {
  const available = BLACK_MARKET_OFFERS.filter((offer) => offerUnlocked(offer, meta));
  if (available.length === 0) return [];
  const offset = meta.blackMarket.refreshCount % available.length;
  const rotated = [...available.slice(offset), ...available.slice(0, offset)];
  return rotated.slice(0, 3).map((offer) => offer.id);
}

function sellerRumorForOffer(offerId: string): string | null {
  if (offerId === 'offer-alien-egg') return 'rumor-seller-egg';
  if (offerId === 'offer-meteor-core') return 'rumor-meteor-core';
  if (offerId === 'offer-sealed-vault') return 'rumor-black-vault';
  if (offerId === 'offer-ufo-hull') return 'rumor-ufo-hull';
  return null;
}

function resultForAccident(
  run: RunState,
  target: TargetDef,
  riskId: string,
  severity: AccidentSeverity,
  summary: string,
): RunResult {
  const archiveId = archiveForRisk(riskId);
  return {
    reason: severity === 'death' ? 'death' : 'accident',
    targetId: target.id,
    money: run.money,
    scrap: run.scrap,
    reputation: severity === 'minor' ? 0 : 1,
    rumors: accidentRumors(riskId),
    accidentArchives: archiveId ? [archiveId] : [],
    worldChanges: [summary],
  };
}

function settleAccident(target: TargetDef, riskId: string, severity: AccidentSeverity, summary: string) {
  const store = runtimeGameStore.getState();
  const result = resultForAccident(store.run, target, riskId, severity, summary);
  const accident = {
    id: `${riskId}-${Date.now()}`,
    riskId,
    severity,
    targetId: target.id,
    summary,
  };

  store.setRun({
    ...store.run,
    activeHit: null,
    currentTarget: severity === 'minor' ? store.run.currentTarget : null,
    accident,
    runResult: result,
    storyLog: [...store.run.storyLog, `accident:${riskId}:${severity}`],
  });
  store.setMeta({
    ...store.meta,
    reputation: store.meta.reputation + result.reputation,
    accidentArchives: unique([...store.meta.accidentArchives, ...result.accidentArchives]),
    rumors: unique([...store.meta.rumors, ...result.rumors]),
    scars: severity === 'minor' ? store.meta.scars : unique([...store.meta.scars, `${target.name}留下的伤疤`]),
    deathRecords:
      result.reason === 'death' ? unique([...store.meta.deathRecords, `${target.name}:${summary}`]) : store.meta.deathRecords,
    worldChanges: unique([...store.meta.worldChanges, ...result.worldChanges]),
    factory: {
      ...store.meta.factory,
      usedSlots: Math.max(0, store.meta.factory.usedSlots - targetFactorySlots(target)),
      damagedPipelineIds:
        RISK_MAP[riskId]?.category === 'corrosion' || RISK_MAP[riskId]?.category === 'pollution'
          ? unique([...store.meta.factory.damagedPipelineIds, ...store.meta.factory.unlockedPipelineIds.slice(0, 1)])
          : store.meta.factory.damagedPipelineIds,
    },
    expedition: {
      ...store.meta.expedition,
      worldAccidents:
        RISK_MAP[riskId]?.category === 'world' || RISK_MAP[riskId]?.category === 'pollution'
          ? unique([...store.meta.expedition.worldAccidents, `${target.id}:${riskId}`])
          : store.meta.expedition.worldAccidents,
    },
    giantForms: {
      ...store.meta.giantForms,
      mutationLevel:
        RISK_MAP[riskId]?.category === 'mutation'
          ? store.meta.giantForms.mutationLevel + 1
          : store.meta.giantForms.mutationLevel,
    },
  });

  emitGameFx({
    kind: 'accident',
    targetId: target.id,
    intensity: severity === 'minor' ? 0.6 : 1,
    message: summary,
  });
}

function settleCompletedTarget(target: TargetDef, manualFinalBonus: boolean) {
  const store = runtimeGameStore.getState();
  const bonus = manualFinalBonus && isImportantTarget(target) ? Math.ceil((target.rewards.cash ?? 0) * 0.25 + 25) : 0;
  let result: RunResult = {
    reason: 'completed',
    targetId: target.id,
    money: (target.rewards.cash ?? 0) + bonus,
    scrap: target.rewards.scrap ?? 0,
    reputation: target.rewards.reputation ?? (isImportantTarget(target) ? 1 : 0),
    rumors:
      target.id === 'missile-dont-touch'
        ? unique([...target.rewards.rumors, 'rumor-black-market-open'])
        : target.rewards.rumors,
    accidentArchives: target.rewards.accidentArchives,
    worldChanges:
      target.id === 'parcel-tape-final'
        ? ['工作台被砸坏，旧货市场入口打开。']
        : target.id === 'missile-dont-touch'
          ? ['黑衣人的货被拆开，远处出现了一张黑方碑剪影。']
          : target.id === 'black-monolith'
            ? ['黑方碑裂开后没有结束游戏，它只是让下一轮的货更诚实。']
          : [],
  };
  const routeFocus = store.meta.routeFocus;
  if (routeFocus === '赚钱路线') result = { ...result, money: Math.ceil(result.money * 1.18) };
  if (routeFocus === '机械路线') result = { ...result, scrap: Math.ceil(result.scrap * 1.22) };
  if (routeFocus === '事故档案路线') {
    const routeArchive = target.risks.map((risk) => archiveForRisk(risk.riskId)).find(Boolean);
    if (routeArchive) result = { ...result, accidentArchives: unique([...result.accidentArchives, routeArchive]) };
  }
  if (routeFocus === '黑市路线' && target.sellerId) {
    result = { ...result, reputation: result.reputation + 1, worldChanges: unique([...result.worldChanges, '卖家把这轮砸法记进黑市账本。']) };
  }
  if (routeFocus === '变异路线' && target.phase === 'p2') {
    result = { ...result, worldChanges: unique([...result.worldChanges, '老哥身上的异常反应被记录成下一轮变异线索。']) };
  }
  if (routeFocus === 'Boss路线' && target.phase === 'p2') {
    result = { ...result, worldChanges: unique([...result.worldChanges, `${target.name} 的裂缝里出现了黑方碑式回声。`]) };
  }
  const unlockedTargets = target.unlocks?.filter((unlock) => unlock.kind === 'target').map((unlock) => unlock.id) ?? [];
  const unlockedPanels = target.unlocks?.filter((unlock) => unlock.kind === 'panel').map((unlock) => unlock.id) ?? [];
  const unlockedSources = target.unlocks?.filter((unlock) => unlock.kind === 'source').map((unlock) => unlock.id) ?? [];
  const expeditionLocationIds = target.scale === 'site' ? [target.id] : [];
  const runWithSources = runWithUnlockedSources(store.run, unlockedSources);

  store.setRun({
    ...runWithSources,
    money: runWithSources.money + result.money,
    scrap: runWithSources.scrap + result.scrap,
    combo: 0,
    activeHit: null,
    currentTarget: null,
    completedTargets: unique([...runWithSources.completedTargets, target.id]),
    runResult: result,
    storyLog: [...runWithSources.storyLog, `completed:${target.id}`, ...(manualFinalBonus ? ['manual-final-bonus'] : []), ...unlockedSources.map((id) => `unlock-source:${id}`)],
  });
  const sourceMeta = metaWithUnlockedSources(store.meta, unlockedSources);
  store.setMeta({
    ...sourceMeta,
    reputation: store.meta.reputation + result.reputation,
    rumors: unique([...store.meta.rumors, ...result.rumors]),
    collection: unique([...store.meta.collection, ...target.rewards.items]),
    accidentArchives: unique([...store.meta.accidentArchives, ...result.accidentArchives]),
    discoveredTargets: unique([...store.meta.discoveredTargets, ...unlockedTargets]),
    completedTargets: unique([...store.meta.completedTargets, target.id]),
    unlockedPanels: unique([
      ...store.meta.unlockedPanels,
      ...unlockedPanels,
      ...(target.phase === 'p2' ? ['black-market'] : []),
      ...(target.scale === 'site' ? ['expedition'] : []),
    ]),
    worldChanges: unique([...store.meta.worldChanges, ...result.worldChanges]),
    blackMarket: {
      ...sourceMeta.blackMarket,
      sellerTrust:
        routeFocus === '黑市路线' && target.sellerId
          ? sourceMeta.blackMarket.sellerTrust + 1
          : sourceMeta.blackMarket.sellerTrust,
    },
    bossDiscoveries:
      (routeFocus === 'Boss路线' && target.phase === 'p2') || isBossDiscoveryTarget(target)
        ? unique([...sourceMeta.bossDiscoveries, target.id])
        : sourceMeta.bossDiscoveries,
    giantForms: {
      ...sourceMeta.giantForms,
      mutationLevel:
        routeFocus === '变异路线' && target.phase === 'p2'
          ? sourceMeta.giantForms.mutationLevel + 1
          : sourceMeta.giantForms.mutationLevel,
    },
    factory: {
      ...sourceMeta.factory,
      usedSlots: Math.max(0, sourceMeta.factory.usedSlots - targetFactorySlots(target)),
    },
    expedition: {
      ...sourceMeta.expedition,
      unlockedLocationIds: unique([...sourceMeta.expedition.unlockedLocationIds, ...unlockedTargets.filter((id) => TARGET_MAP[id]?.scale === 'site')]),
      completedLocationIds: unique([...sourceMeta.expedition.completedLocationIds, ...expeditionLocationIds]),
    },
  });

  emitGameFx({
    kind: 'reward',
    targetId: target.id,
    intensity: manualFinalBonus ? 1 : 0.75,
    value: result.money,
    message: manualFinalBonus ? `亲手最后一击，额外奖励 +${bonus}` : `砸开了：+${result.money}`,
  });
}

function updateRiskFromHit(
  run: RunState,
  target: TargetDef,
  partId: string,
  source: DamageSourceDef,
  hitMode: HitMode,
  rageBurst: boolean,
): { run: RunState; accident?: { riskId: string; severity: AccidentSeverity; summary: string } } {
  const partDef = target.parts.find((part) => part.id === partId);
  const partState = run.currentTarget?.parts[partId];
  if (!partDef || !partState) return { run };

  let nextRun = run;
  for (const trigger of partDef.riskTriggers) {
    const threshold = trigger.threshold ?? 1;
    const hpRatio = partState.maxHp > 0 ? partState.hp / partState.maxHp : 0;
    if (hpRatio > threshold) continue;
    const risk = RISK_MAP[trigger.riskId];
    if (!risk) continue;

    const current = nextRun.risks[trigger.riskId];
    const previousClueCount = current?.clues.length ?? 0;
    const nextLevel =
      !current || RISK_ORDER[trigger.level] > RISK_ORDER[current.level] ? trigger.level : current.level;
    const nextClues = unique([...(current?.clues ?? []), trigger.hint]);
    nextRun = {
      ...nextRun,
      risks: {
        ...nextRun.risks,
        [trigger.riskId]: {
          riskId: trigger.riskId,
          level: nextLevel,
          clues: nextClues,
          triggered: current?.triggered ?? false,
        },
      },
      storyLog:
        previousClueCount === nextClues.length
          ? nextRun.storyLog
          : [...nextRun.storyLog, `risk-clue:${trigger.riskId}:${trigger.hint}`],
    };

    if (previousClueCount !== nextClues.length) {
      emitGameFx({
        kind: 'danger',
        targetId: target.id,
        partId,
        intensity: RISK_ORDER[nextLevel] / 3,
        riskLevel: nextLevel,
        message: trigger.hint,
      });
    }

    const outcome = calculateRiskOutcome({
      risk,
      clueCount: previousClueCount,
      level: nextLevel,
      mode: hitMode,
      sourceTags: source.tags,
      rageBurst,
      hpRatio,
    });
    const alreadyTriggered = nextRun.risks[trigger.riskId]?.triggered;
    const firstWarningOnly = previousClueCount === 0 && hpRatio > 0.25;
    const remoteStillSafe = outcome.choice === 'remote-probe' && outcome.dangerScore < 0.8;
    if (outcome.shouldTrigger && !alreadyTriggered && !firstWarningOnly && !remoteStillSafe) {
      const severity =
        outcome.severity === 'run-ending' && rageBurst
          ? 'death'
          : (outcome.severity as AccidentSeverity);
      const summary =
        risk.id === 'explosion-missile'
          ? rageBurst
            ? '导弹被暴走砸点着了，本轮在白光里结束。'
            : '导弹外壳突然爆燃，老哥被迫结束本轮。'
          : risk.id === 'explosion-battery'
            ? '旧电池爆了一下，工具和眉毛都少了一截。'
          : risk.id === 'trap-spring'
            ? '高压弹簧抽了出来，把撬棍抽弯了。'
            : risk.id === 'bio-egg-hatch'
              ? '壳里的东西醒太快，咬坏工具后钻进了通风口。'
              : risk.id === 'corrosion-black-vault'
                ? '腐蚀雾喷出来，作业位被迫封锁。'
                : risk.id === 'pollution-reactor-leak'
                  ? '读数突然爆表，本轮带着污染标记结束。'
                  : risk.id === 'world-structure-collapse'
                    ? '现场结构失控，世界变化被写进下一轮。'
                    : risk.id === 'mutation-giant-overload'
                      ? '巨大化过载，老哥的影子比人先退场。'
                      : risk.id === 'anomaly-monolith-echo'
                        ? '黑方碑回声压过锤声，本轮记忆被它收走一块。'
                        : '异常低鸣变成刺耳尖啸，现场被迫清空。';
      nextRun = {
        ...nextRun,
        risks: {
          ...nextRun.risks,
          [trigger.riskId]: { ...nextRun.risks[trigger.riskId], triggered: true },
        },
      };
      return { run: nextRun, accident: { riskId: trigger.riskId, severity, summary } };
    }
  }
  return { run: nextRun };
}

export const actions = {
  ensureP1Run() {
    const store = runtimeGameStore.getState();
    if (Object.keys(store.run.tools).length > 0) return;
    store.setRun(createStarterRun(store.meta, store.meta.reputation * 40 + store.meta.accidentArchives.length * 20));
  },

  startNewRun() {
    const store = runtimeGameStore.getState();
    const startMoney = 40 + store.meta.reputation * 45 + store.meta.accidentArchives.length * 25;
    const nextRun = createStarterRun(store.meta, startMoney);
    store.setRun({
      ...nextRun,
      storyLog: [`new-run:${nextRun.runId}`, `start-money:${startMoney}`],
    });
    store.setMeta({
      ...store.meta,
      worldChanges: unique([
        ...store.meta.worldChanges,
        `第 ${store.meta.deathRecords.length + 2} 轮开始，老哥带着旧账回来。`,
        ...(store.meta.completedTargets.includes('black-monolith') ? ['黑方碑裂纹改变了下一轮黑市目标的变体描述。'] : []),
      ]),
    });
  },

  startTarget(targetId: string, options: { ignoreCost?: boolean } = {}) {
    const target = TARGET_MAP[targetId];
    if (!target) return;
    const store = runtimeGameStore.getState();
    if (!store.meta.discoveredTargets.includes(targetId)) return;
    if (!options.ignoreCost && !canPayCost(store.run, store.meta, target.entryCost)) return;
    if (!factoryCanHost(store.meta, target)) return;
    if (!canStartEndgame(store.meta, targetId)) return;
    const paidRun = options.ignoreCost ? store.run : spendCost(store.run, target.entryCost);
    const factorySlots = targetFactorySlots(target);
    const runtime = createTargetRuntime(target);
    const riskStates = Object.fromEntries(
      target.risks.map((risk) => [
        risk.riskId,
        store.run.risks[risk.riskId] ?? { riskId: risk.riskId, level: 'unknown' as RiskLevel, clues: [], triggered: false },
      ]),
    );
    store.setRun({
      ...paidRun,
      currentTarget: runtime,
      selectedSourceId: bestOwnedSourceFor(paidRun, target, runtime.selectedPartId),
      combo: 0,
      comboExpiresAt: 0,
      activeHit: null,
      accident: null,
      runResult: null,
      risks: { ...paidRun.risks, ...riskStates },
      targetHistory: unique([...paidRun.targetHistory, targetId]),
      storyLog: [...paidRun.storyLog, `start-target:${targetId}`],
    });
    if (factorySlots > 0) {
      store.setMeta({
        ...runtimeGameStore.getState().meta,
        factory: {
          ...runtimeGameStore.getState().meta.factory,
          usedSlots: runtimeGameStore.getState().meta.factory.usedSlots + factorySlots,
        },
      });
    }
    emitGameFx({ kind: 'stage', targetId, intensity: 0.5, message: target.intro });
  },

  startRecommendedTarget() {
    const store = runtimeGameStore.getState();
    const candidates = TARGETS.filter((target) => store.meta.discoveredTargets.includes(target.id) && !store.meta.completedTargets.includes(target.id));
    const routeScore = (target: TargetDef) => {
      if (store.meta.routeFocus === '赚钱路线') return target.rewards.cash ?? 0;
      if (store.meta.routeFocus === '事故档案路线') return target.risks.length * 100;
      if (store.meta.routeFocus === '变异路线') return target.risks.some((risk) => RISK_MAP[risk.riskId]?.category === 'mutation' || RISK_MAP[risk.riskId]?.category === 'anomaly') ? 500 : 0;
      if (store.meta.routeFocus === '黑市路线') return target.sellerId ? 500 : 0;
      if (store.meta.routeFocus === '机械路线') return target.unlocks?.some((unlock) => unlock.kind === 'source') ? 500 : target.scale === 'site' ? 120 : 0;
      if (store.meta.routeFocus === 'Boss路线') return target.id.includes('monolith') || target.id.includes('ufo') || target.id.includes('beast') || target.id.includes('gundam') ? 600 : 0;
      return 0;
    };
    const next = candidates.sort((a, b) => routeScore(b) - routeScore(a))[0];
    if (next) actions.startTarget(next.id);
  },

  selectSource(sourceId: string) {
    const store = runtimeGameStore.getState();
    if (!damageSourceExists(sourceId)) return;
    if (TOOL_IDS.has(sourceId) && !store.run.tools[sourceId]) return;
    store.setRun({
      ...store.run,
      selectedSourceId: sourceId,
      hitMode: sourceFor(sourceId)?.tags.includes('remote') ? 'remote' : store.run.hitMode,
      storyLog: [...store.run.storyLog, `select-source:${sourceId}`],
    });
  },

  setHitMode(mode: HitMode) {
    const store = runtimeGameStore.getState();
    store.setRun({ ...store.run, hitMode: mode, storyLog: [...store.run.storyLog, `hit-mode:${mode}`] });
  },

  startHit(partId: string, sourceId = runtimeGameStore.getState().run.selectedSourceId) {
    const store = runtimeGameStore.getState();
    if (!damageSourceExists(sourceId)) return;
    store.setRun({
      ...store.run,
      activeHit: { partId, sourceId },
      currentTarget: store.run.currentTarget
        ? { ...store.run.currentTarget, selectedPartId: partId }
        : store.run.currentTarget,
      storyLog: [...store.run.storyLog, `start-hit:${sourceId}:${partId}`],
    });
  },

  stopHit() {
    const store = runtimeGameStore.getState();
    store.setRun({ ...store.run, activeHit: null, storyLog: [...store.run.storyLog, 'stop-hit'] });
  },

  hitPart(partId: string, sourceId = runtimeGameStore.getState().run.selectedSourceId) {
    const store = runtimeGameStore.getState();
    const run = store.run;
    if (!run.currentTarget) return;
    const target = TARGET_MAP[run.currentTarget.targetId];
    const partDef = target?.parts.find((part) => part.id === partId);
    const partState = run.currentTarget.parts[partId];
    const source = sourceFor(sourceId);
    if (!target || !partDef || !partState || !source || !partState.exposed || partState.destroyed) {
      emitGameFx({ kind: 'ineffective', partId, sourceId, intensity: 0.25, message: '这里现在砸不到。' });
      return;
    }
    if (GIANT_SOURCE_IDS.has(sourceId) && target.scale === 'desktop') {
      emitGameFx({ kind: 'ineffective', targetId: target.id, partId, sourceId, intensity: 0.35, message: '巨型形态不能拿来刷普通快递。' });
      return;
    }

    const now = Date.now();
    const combo = now > run.comboExpiresAt ? 0 : run.combo;
    const rageBurst = now < run.rageBurstUntil;
    const isMachine = MACHINE_IDS.has(sourceId);
    const hitMode: HitMode = source.tags.includes('remote') ? 'remote' : run.hitMode;
    const finalThreshold = Math.max(2, Math.ceil(partState.maxHp * 0.06));

    // 重要目标：机械削到临界就停手，最后一击留给玩家（偶尔提示一次，不刷屏）
    if (isMachine && isImportantTarget(target) && partState.hp <= finalThreshold && !run.autoPipeline) {
      if (Math.random() < 0.12) {
        emitGameFx({ kind: 'final-ready', targetId: target.id, partId, sourceId, intensity: 0.75, message: '机械削到临界了，最后一击留给老哥。' });
      }
      return;
    }

    const damageMultiplier = (rageBurst ? 2.35 : 1) * (hitMode === 'remote' ? 0.72 : 1);
    const hit = applyPartHit(run.currentTarget, partId, sourceId, combo, damageMultiplier);
    // 机械自动砸不堆玩家连击/怒气（那是玩家亲手砸的奖励）
    const nextCombo = isMachine ? combo : hit.effective ? Math.min(80, combo + 1) : Math.max(0, combo - 2);
    const nextRage = isMachine
      ? run.rage
      : hit.effective
        ? Math.min(100, run.rage + (rageBurst ? 0 : hit.destroyed ? 10 : Math.max(1.5, hit.damage / 18)))
        : run.rage;
    const nextDurability = run.tools[sourceId]
      ? Math.max(0, run.tools[sourceId].durability - (partDef.material === 'metal' ? 1.2 : 0.6))
      : 0;
    const nextTool = run.tools[sourceId]
      ? {
          ...run.tools[sourceId],
          durability: nextDurability,
          broken: nextDurability <= 0,
        }
      : undefined;
    const nextRunBase: RunState = {
      ...run,
      currentTarget: { ...hit.target, selectedPartId: partId },
      combo: nextCombo,
      comboExpiresAt: isMachine ? run.comboExpiresAt : now + COMBO_WINDOW_MS,
      rage: nextRage,
      tools: nextTool ? { ...run.tools, [sourceId]: nextTool } : run.tools,
      hitMode,
      storyLog: [
        ...run.storyLog,
        `hit:${sourceId}:${partId}:${hit.damage}`,
        ...(hit.stageChanged ? [`stage:${partId}`] : []),
        ...(hit.destroyed ? [`destroyed:${partId}`] : []),
        ...(hit.unlockedViews.length ? [`unlock-views:${hit.unlockedViews.join(',')}`] : []),
      ],
    };
    const riskResult = updateRiskFromHit(nextRunBase, target, partId, source, hitMode, rageBurst);
    // 砸击过程中的小掉落 + 砸开一个部位必给奖励
    let dropCash = 0;
    let dropScrap = 0;
    const partRewardItems: string[] = [];
    if (hit.effective && Math.random() < 0.18) dropCash += 1 + Math.floor(Math.random() * 3);
    if (hit.destroyed && !hit.completed) {
      dropCash += Math.ceil((target.rewards.cash ?? 24) / Math.max(1, target.parts.length)) + 5;
      if ((target.rewards.scrap ?? 0) > 0) dropScrap += 1 + Math.floor(Math.random() * 2);
      if (target.rewards.items.length && Math.random() < 0.5) partRewardItems.push(pick(target.rewards.items));
    }
    store.setRun({ ...riskResult.run, money: riskResult.run.money + dropCash, scrap: riskResult.run.scrap + dropScrap });
    if (partRewardItems.length) {
      const latestMeta = runtimeGameStore.getState();
      latestMeta.setMeta({ ...latestMeta.meta, collection: unique([...latestMeta.meta.collection, ...partRewardItems]) });
    }
    if (nextTool?.broken && GIANT_SOURCE_IDS.has(sourceId)) {
      const latest = runtimeGameStore.getState();
      latest.setMeta({
        ...latest.meta,
        giantForms: {
          ...latest.meta.giantForms,
          repairsDue: unique([...latest.meta.giantForms.repairsDue, sourceId]),
        },
      });
    }

    emitGameFx({
      kind: hit.effective ? 'hit' : 'ineffective',
      targetId: target.id,
      partId,
      sourceId,
      intensity: Math.min(1, hit.damage / 80),
      message: hit.effective ? `-${hit.damage}` : '弹开了',
      value: hit.damage,
    });
    // 现象提示：只在命中时弹（稍微高频），正常表现 / 危险征兆两类，辅助"敢不敢继续砸"
    if (hit.effective && !hit.destroyed) {
      const postHp = hit.target.parts[partId]?.hp ?? 0;
      const hpRatio = partState.maxHp > 0 ? postHp / partState.maxHp : 0;
      const risky = partDef.riskTriggers.length > 0;
      const dangerChance = risky ? 0.2 + (1 - hpRatio) * 0.4 : 0;
      if (risky && Math.random() < dangerChance) {
        emitGameFx({ kind: 'danger', targetId: target.id, partId, intensity: 0.5, riskLevel: 'suspicious', message: pick(DANGER_PHENOMENA) });
      } else if (Math.random() < 0.34) {
        emitGameFx({ kind: 'float', targetId: target.id, partId, intensity: 0.3, message: pick(NORMAL_PHENOMENA[partDef.material] ?? NORMAL_PHENOMENA.paper) });
      }
    }
    // 掉落飘字
    if (dropCash > 0 && !hit.completed) {
      emitGameFx({
        kind: 'reward',
        targetId: target.id,
        partId,
        intensity: hit.destroyed ? 0.7 : 0.3,
        value: dropCash,
        message: hit.destroyed ? `部位砸开 +${dropCash}` : `${pick(DROP_LINES)} +${dropCash}`,
      });
    }
    if (hit.stageChanged) {
      const stage = partDef.stages.find((item) => item.id === hit.target.parts[partId].stageId);
      emitGameFx({
        kind: 'crack',
        targetId: target.id,
        partId,
        sourceId,
        intensity: 0.75,
        message: stage?.label ?? '阶段变化',
      });
    }
    if (nextRage >= 100 && run.rage < 100) {
      emitGameFx({ kind: 'rage-ready', targetId: target.id, intensity: 1, message: '怒气满了，暴走砸可用。' });
    }

    if (riskResult.accident) {
      settleAccident(target, riskResult.accident.riskId, riskResult.accident.severity, riskResult.accident.summary);
      return;
    }

    if (hit.completed) {
      emitGameFx({
        kind: 'final-break',
        targetId: target.id,
        partId,
        sourceId,
        intensity: 1,
        message: `${target.name} 被砸开了。`,
      });
      settleCompletedTarget(target, TOOL_IDS.has(sourceId));
    }
  },

  useRageBurst(partId?: string) {
    const store = runtimeGameStore.getState();
    const now = Date.now();
    if (store.run.rage < 100 || now < store.run.rageCooldownUntil) return;
    const selectedPart = partId ?? store.run.currentTarget?.selectedPartId;
    store.setRun({
      ...store.run,
      rage: 0,
      rageBurstUntil: now + RAGE_BURST_MS,
      rageCooldownUntil: now + RAGE_COOLDOWN_MS,
      storyLog: [...store.run.storyLog, 'rage-burst'],
    });
    emitGameFx({
      kind: 'rage-burst',
      targetId: store.run.currentTarget?.targetId,
      partId: selectedPart ?? undefined,
      intensity: 1,
      message: '老哥暴走了，危险部位也会更危险。',
    });
    if (selectedPart) actions.hitPart(selectedPart, store.run.selectedSourceId);
  },

  switchView(viewId: string) {
    const store = runtimeGameStore.getState();
    if (!store.run.currentTarget || !store.run.currentTarget.unlockedViews.includes(viewId)) return;
    const visiblePart = Object.values(store.run.currentTarget.parts).find((part) => {
      const partDef = TARGET_MAP[store.run.currentTarget!.targetId].parts.find((item) => item.id === part.partId);
      return part.exposed && partDef?.viewId === viewId && !part.destroyed;
    });
    store.setRun({
      ...store.run,
      currentTarget: { ...store.run.currentTarget, currentViewId: viewId, selectedPartId: visiblePart?.partId ?? store.run.currentTarget.selectedPartId },
      storyLog: [...store.run.storyLog, `switch-view:${viewId}`],
    });
    emitGameFx({ kind: 'stage', targetId: store.run.currentTarget.targetId, intensity: 0.35, message: `切到${viewId}` });
  },

  inspectPart(partId: string) {
    const store = runtimeGameStore.getState();
    const target = store.run.currentTarget ? TARGET_MAP[store.run.currentTarget.targetId] : undefined;
    const part = target?.parts.find((item) => item.id === partId);
    if (!target || !part) return;
    let nextRun = store.run;
    let clueFound = false;
    for (const trigger of part.riskTriggers) {
      const current = nextRun.risks[trigger.riskId];
      const nextClues = unique([...(current?.clues ?? []), trigger.hint]);
      clueFound = clueFound || nextClues.length !== (current?.clues.length ?? 0);
      nextRun = {
        ...nextRun,
        risks: {
          ...nextRun.risks,
          [trigger.riskId]: {
            riskId: trigger.riskId,
            level:
              !current || RISK_ORDER[trigger.level] > RISK_ORDER[current.level]
                ? trigger.level
                : current.level,
            clues: nextClues,
            triggered: current?.triggered ?? false,
          },
        },
        storyLog: [...nextRun.storyLog, `inspect:${partId}`],
      };
    }
    store.setRun(nextRun);
    emitGameFx({
      kind: 'danger',
      targetId: target.id,
      partId,
      intensity: clueFound ? 0.65 : 0.3,
      message: clueFound ? '检查到风险线索。' : '没发现新线索。',
    });
  },

  deployMachine(machineId: string, partId: string) {
    const store = runtimeGameStore.getState();
    const machine = store.run.machines[machineId];
    const target = store.run.currentTarget ? TARGET_MAP[store.run.currentTarget.targetId] : undefined;
    const part = target?.parts.find((item) => item.id === partId);
    if (!machine || !target || !part || !store.run.currentTarget?.parts[partId]?.exposed) return;
    const machineDef = MACHINES.find((item) => item.id === machineId);
    const canDeploy = part.machineSlots.some((slot) => machineDef?.slotTags.some((tag) => slot.accepts.includes(tag)));
    if (!canDeploy) {
      emitGameFx({ kind: 'ineffective', targetId: target.id, partId, sourceId: machineId, intensity: 0.35, message: '这个部位没有合适作业位。' });
      return;
    }
    store.setRun({
      ...store.run,
      machines: {
        ...store.run.machines,
        [machineId]: { ...machine, deployedPartId: partId, overheat: 0, jammed: false, repairing: false },
      },
      storyLog: [...store.run.storyLog, `deploy:${machineId}:${partId}`],
    });
    emitGameFx({ kind: 'stage', targetId: target.id, partId, sourceId: machineId, intensity: 0.45, message: `${machineDef?.name ?? machineId} 部署完成。` });
  },

  tickRuntime(dtSec: number) {
    const store = runtimeGameStore.getState();
    const now = Date.now();
    let run = store.run;
    const combo = now > run.comboExpiresAt ? 0 : run.combo;
    const rage = run.activeHit || now < run.rageBurstUntil ? run.rage : Math.max(0, run.rage - dtSec * 2.2);
    run = { ...run, combo, rage };
    store.setRun(run);
  },

  tickMachines() {
    const store = runtimeGameStore.getState();
    const run = store.run;
    if (!run.currentTarget) return;
    const target = TARGET_MAP[run.currentTarget.targetId];
    if (!target) return;
    const dt = 0.65;
    let machines = run.machines;
    let changed = false;
    const toHit: Array<[string, string]> = [];
    // 每台机械独立处理（可同时挂在不同部位；一台机械只占一个部位）
    for (const [machineId, machine] of Object.entries(run.machines)) {
      if (!machine.deployedPartId) continue;
      const def = MACHINES.find((item) => item.id === machineId);
      if (!def) continue;
      const partState = run.currentTarget.parts[machine.deployedPartId];
      // 部位砸开 -> 自动流转到下一个可作业部位（修掉"机械砸完一个就停"）
      if (!partState || partState.destroyed) {
        const next = nextMachinePart(run, target, def);
        machines = { ...machines, [machineId]: { ...machine, deployedPartId: next, overheat: 0, jammed: false } };
        changed = true;
        continue;
      }
      if (machine.durability <= 0) continue;
      // 卡死自动冷却，降到阈值以下自动恢复
      if (machine.jammed) {
        const cooled = Math.max(0, machine.overheat - dt * 1.6);
        machines = { ...machines, [machineId]: { ...machine, overheat: cooled, jammed: cooled > def.overheatSeconds * 0.35 } };
        changed = true;
        continue;
      }
      const overheat = machine.overheat + dt;
      const jammed = overheat >= def.overheatSeconds;
      const durability = Math.max(0, machine.durability - dt * 1.0);
      machines = { ...machines, [machineId]: { ...machine, overheat, jammed, durability } };
      changed = true;
      if (jammed) {
        emitGameFx({ kind: 'danger', targetId: run.currentTarget.targetId, partId: machine.deployedPartId, sourceId: machineId, intensity: 0.5, message: `${def.name} 过热，正在冷却。` });
        continue;
      }
      toHit.push([machineId, machine.deployedPartId]);
    }
    if (changed) {
      const latest = runtimeGameStore.getState();
      latest.setRun({ ...latest.run, machines });
    }
    for (const [machineId, partId] of toHit) actions.hitPart(partId, machineId);

    // 全自动管线：开启后自动对准暴露部位连续砸、自动切视角、一路砸穿整个目标
    if (runtimeGameStore.getState().run.autoPipeline) {
      for (let i = 0; i < 4; i++) {
        const live = runtimeGameStore.getState().run;
        if (!live.currentTarget) break;
        const picked = pickAutoPart(live, target);
        if (!picked) break;
        if (picked.viewId !== live.currentTarget.currentViewId && live.currentTarget.unlockedViews.includes(picked.viewId)) {
          actions.switchView(picked.viewId);
        }
        actions.hitPart(picked.partId, bestAutoSourceFor(live, target, picked.partId));
      }
    }
  },

  toggleAutoPipeline() {
    const store = runtimeGameStore.getState();
    const next = !store.run.autoPipeline;
    store.setRun({ ...store.run, autoPipeline: next });
    emitGameFx({ kind: 'stage', targetId: store.run.currentTarget?.targetId, intensity: 0.5, message: next ? '自动管线已开启，老哥先歇着。' : '自动管线已关闭，亲手砸。' });
  },

  repairMachine(machineId: string) {
    const store = runtimeGameStore.getState();
    const machine = store.run.machines[machineId];
    if (!machine) return;
    store.setRun({
      ...store.run,
      machines: {
        ...store.run.machines,
        [machineId]: { ...machine, durability: machine.maxDurability, overheat: 0, jammed: false, repairing: false },
      },
      storyLog: [...store.run.storyLog, `repair:${machineId}`],
    });
  },

  retreatTarget() {
    const store = runtimeGameStore.getState();
    const targetId = store.run.currentTarget?.targetId;
    const result: RunResult = {
      reason: 'retreated',
      targetId,
      money: store.run.money,
      scrap: store.run.scrap,
      reputation: 0,
      rumors: targetId === 'missile-dont-touch' ? ['rumor-p2-monolith-shadow'] : [],
      accidentArchives: [],
      worldChanges: targetId ? [`老哥从 ${TARGET_MAP[targetId]?.name ?? targetId} 前撤退，账本上多了一条“下次再说”。`] : [],
    };
    store.setRun({
      ...store.run,
      activeHit: null,
      currentTarget: null,
      runResult: result,
      storyLog: [...store.run.storyLog, 'retreat'],
    });
    store.setMeta({
      ...store.meta,
      rumors: unique([...store.meta.rumors, ...result.rumors]),
      worldChanges: unique([...store.meta.worldChanges, ...result.worldChanges]),
      factory: targetId
        ? {
            ...store.meta.factory,
            usedSlots: Math.max(0, store.meta.factory.usedSlots - targetFactorySlots(TARGET_MAP[targetId])),
          }
        : store.meta.factory,
    });
  },

  upgradeFactory() {
    const store = runtimeGameStore.getState();
    if (!store.meta.unlockedPanels.includes('factory')) return;
    const nextLevel = store.meta.factory.level + 1;
    const cost = 900 + nextLevel * 650;
    if (store.run.money < cost) return;
    store.setRun({
      ...store.run,
      money: store.run.money - cost,
      storyLog: [...store.run.storyLog, `factory-upgrade:${nextLevel}`],
    });
    store.setMeta({
      ...store.meta,
      factory: {
        ...store.meta.factory,
        level: nextLevel,
        capacity: Math.max(store.meta.factory.capacity + 2, 3 + nextLevel * 2),
      },
      worldChanges: unique([...store.meta.worldChanges, `厂房扩到 Lv.${nextLevel}，更大的货能进来了。`]),
    });
  },

  refreshBlackMarket() {
    const store = runtimeGameStore.getState();
    const canOpen =
      store.meta.unlockedPanels.includes('black-market') ||
      store.meta.rumors.includes('rumor-black-market-missile') ||
      store.meta.rumors.includes('rumor-black-market-open');
    if (!canOpen) return;
    const metaForRefresh: MetaState = {
      ...store.meta,
      blackMarket: {
        ...store.meta.blackMarket,
        refreshCount: store.meta.blackMarket.refreshCount + 1,
        lastRefreshRunId: store.run.runId,
      },
      unlockedPanels: unique([...store.meta.unlockedPanels, 'black-market']),
      rumors: unique([...store.meta.rumors, 'rumor-black-market-open']),
    };
    const offerIds = nextBlackMarketOfferIds(metaForRefresh);
    store.setMeta({
      ...metaForRefresh,
      blackMarket: {
        ...metaForRefresh.blackMarket,
        currentOfferIds: offerIds,
        seenOfferIds: unique([...metaForRefresh.blackMarket.seenOfferIds, ...offerIds]),
      },
    });
    emitGameFx({
      kind: 'stage',
      intensity: 0.45,
      message: offerIds.length > 0 ? '黑市委托刷新了。' : '黑市今天只剩谜语，没有货。',
    });
  },

  acceptBlackMarketOffer(offerId: string) {
    const store = runtimeGameStore.getState();
    const offer = BLACK_MARKET_OFFERS.find((item) => item.id === offerId);
    if (!offer || !offerUnlocked(offer, store.meta)) return;
    if (!canPayCost(store.run, store.meta, offer.cost)) return;
    const target = TARGET_MAP[offer.targetId];
    if (!target) return;
    const paidRun = spendCost(store.run, offer.cost);
    const uniqueClaimedTargetIds = offer.unique
      ? unique([...store.meta.blackMarket.uniqueClaimedTargetIds, offer.targetId])
      : store.meta.blackMarket.uniqueClaimedTargetIds;
    const sellerRumor = sellerRumorForOffer(offer.id);
    store.setRun({
      ...paidRun,
      storyLog: [...paidRun.storyLog, `black-market-accept:${offerId}`],
    });
    store.setMeta({
      ...store.meta,
      discoveredTargets: unique([...store.meta.discoveredTargets, offer.targetId]),
      unlockedPanels: unique([...store.meta.unlockedPanels, 'black-market']),
      rumors: unique([...store.meta.rumors, 'rumor-black-market-open', ...(sellerRumor ? [sellerRumor] : [])]),
      blackMarket: {
        ...store.meta.blackMarket,
        sellerTrust: store.meta.blackMarket.sellerTrust + (offer.rarity === 'unique' ? 3 : 1),
        acceptedOfferIds: unique([...store.meta.blackMarket.acceptedOfferIds, offerId]),
        currentOfferIds: store.meta.blackMarket.currentOfferIds.filter((id) => id !== offerId),
        seenOfferIds: unique([...store.meta.blackMarket.seenOfferIds, offerId]),
        uniqueClaimedTargetIds,
      },
      worldChanges: unique([...store.meta.worldChanges, offer.acceptText]),
    });
    actions.startTarget(offer.targetId, { ignoreCost: true });
  },

  declineBlackMarketOffer(offerId: string) {
    const store = runtimeGameStore.getState();
    const offer = BLACK_MARKET_OFFERS.find((item) => item.id === offerId);
    if (!offer) return;
    store.setMeta({
      ...store.meta,
      blackMarket: {
        ...store.meta.blackMarket,
        sellerTrust: Math.max(-5, store.meta.blackMarket.sellerTrust - (offer.rarity === 'unique' ? 2 : 1)),
        declinedOfferIds: unique([...store.meta.blackMarket.declinedOfferIds, offerId]),
        currentOfferIds: store.meta.blackMarket.currentOfferIds.filter((id) => id !== offerId),
        seenOfferIds: unique([...store.meta.blackMarket.seenOfferIds, offerId]),
      },
      worldChanges: unique([...store.meta.worldChanges, offer.declineText]),
    });
    emitGameFx({ kind: 'danger', intensity: 0.35, message: offer.declineText });
  },

  setRouteFocus(routeFocus: string | null) {
    const store = runtimeGameStore.getState();
    store.setMeta({
      ...store.meta,
      routeFocus,
      worldChanges: routeFocus
        ? unique([...store.meta.worldChanges, `本轮路线改成：${routeFocus}`])
        : store.meta.worldChanges,
    });
  },

  activateGiantForm(sourceId: string) {
    const store = runtimeGameStore.getState();
    if (!store.meta.giantForms.unlockedSourceIds.includes(sourceId)) return;
    if (!store.run.tools[sourceId]) return;
    const now = Date.now();
    store.setRun({
      ...store.run,
      selectedSourceId: sourceId,
      rageBurstUntil: sourceId.startsWith('ultra') ? now + 12000 : store.run.rageBurstUntil,
      storyLog: [...store.run.storyLog, `giant-form:${sourceId}`],
    });
    store.setMeta({
      ...store.meta,
      giantForms: {
        ...store.meta.giantForms,
        activeSourceId: sourceId,
      },
    });
    emitGameFx({
      kind: sourceId.startsWith('ultra') ? 'rage-burst' : 'stage',
      sourceId,
      intensity: 0.85,
      message: sourceId.startsWith('ultra') ? '老哥巨大化倒计时开始。' : '巨型形态接管当前砸击源。',
    });
  },

  repairGiantForm(sourceId: string) {
    const store = runtimeGameStore.getState();
    const tool = store.run.tools[sourceId];
    if (!tool || !GIANT_SOURCE_IDS.has(sourceId)) return;
    const cost = sourceId.startsWith('ultra') ? 1200 : sourceId === 'gundam-pile' ? 1000 : 650;
    if (store.run.money < cost) return;
    store.setRun({
      ...store.run,
      money: store.run.money - cost,
      tools: {
        ...store.run.tools,
        [sourceId]: { ...tool, durability: tool.maxDurability, broken: false },
      },
      storyLog: [...store.run.storyLog, `giant-repair:${sourceId}`],
    });
    store.setMeta({
      ...store.meta,
      giantForms: {
        ...store.meta.giantForms,
        repairsDue: store.meta.giantForms.repairsDue.filter((id) => id !== sourceId),
      },
    });
  },

  dismissResult() {
    const store = runtimeGameStore.getState();
    store.setRun({ ...store.run, runResult: null, accident: null });
  },
};

// 开发期调试钩子（生产构建中 import.meta.env.DEV 为 false，整段被裁剪）
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __smash?: unknown }).__smash = { actions, store: runtimeGameStore };
}
