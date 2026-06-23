import { ITEM_MAP } from '../data/items';
import type { MaterialId } from '../data/materials';
import {
  MERCHANT_DISCOUNT,
  MERCHANT_DURATION,
  MERCHANT_INTERVAL,
  MERCHANT_OFFER_COUNT,
  MERCHANT_POOL,
  type MerchantOffer,
} from '../data/merchant';
import { MUTATIONS, type MutationId } from '../data/mutations';
import { PARCEL_MAP, deliverableSizes } from '../data/parcels';
import { RARITIES, RARITY_ORDER, rarityRank } from '../data/rarity';
import { stageForEarned } from '../data/stages';
import { TOOL_MAP } from '../data/tools';
import type { ParcelSizeId, Rarity } from '../data/types';
import { randInt, weightedPick } from '../lib/rng';
import {
  autoPower,
  benchCapacity,
  bodyAffinity,
  toolBaseDamage,
  comboMult,
  deliverInterval,
  luck,
  sellBonus,
} from './compute';
import type { LootBurst, RevealData, RevealItem } from './events';
import { emit, nextId } from './events';
import { rollItem, rollPart, sellValue } from './systems/loot';
import { BLUEPRINT_MAP, sorterBonus } from '../data/blueprints';
import { PIPELINE_INTERVAL, PIPELINE_SPACE } from '../data/giants';
import { REFINES, REFINE_INTERVAL, REFINE_MAP, REFINERY_DEVICE, type RefineRecipe } from '../data/refine';
import { MISSION_MAP } from '../data/missions';
import { PARTS, ELEMENTS } from '../data/items';
import { AUTO_LINE_INTERVAL, COMBO_WINDOW_MS, type GameState, type Parcel } from './state';

/** 反馈/震动分级（none<ineffective<hit<crack<open<danger） */
export type FeedbackLevel = 'none' | 'ineffective' | 'hit' | 'crack' | 'open' | 'danger';
const FEEDBACK_RANK: Record<FeedbackLevel, number> = {
  none: 0, ineffective: 1, hit: 2, crack: 3, open: 4, danger: 5,
};

/** 引擎输出收集器（供 UI 在 set 之后播放音效/特效） */
export interface EngineOut {
  bursts: LootBurst[];
  reveals: RevealData[];
  opened: number;
  feedback: FeedbackLevel;
  cash: number;
}

export function newOut(): EngineOut {
  return { bursts: [], reveals: [], opened: 0, feedback: 'none', cash: 0 };
}

/** 把反馈抬升到见过的最高级别 */
function raiseFeedback(out: EngineOut, lvl: FeedbackLevel) {
  if (FEEDBACK_RANK[lvl] > FEEDBACK_RANK[out.feedback]) out.feedback = lvl;
}

/** 当前工具处理危险品是否安全（拆弹钳安全；液压机/黑洞也按安全处理） */
function toolIsSafe(toolId: string): boolean {
  const t = TOOL_MAP[toolId as keyof typeof TOOL_MAP];
  return !!(t?.volatileSafe) || toolId === 'press' || toolId === 'blackhole';
}

/** 危险品被炸懵的惩罚时长(ms) */
const DAZED_MS = 2500;
/** 爆炸对台上其他快递造成的连带伤害比例 */
const BOOM_COLLATERAL = 0.3;

export interface ParcelOpts {
  luckBonus?: number;
  pool?: string[];
  label?: string;
  emoji?: string;
  sealMax?: number;
  lootMin?: number;
  lootMax?: number;
  material?: MaterialId;
  hollowChance?: number;
  danger?: boolean;
  requireMutation?: MutationId;
  requirePipeline?: string;
  requireOrdnance?: string;
  partBonus?: number;
  space?: number;
}

export function makeParcel(size: ParcelSizeId, rand: () => number, opts?: ParcelOpts): Parcel {
  const def = PARCEL_MAP[size];
  const sealMax = opts?.sealMax ?? def.sealMax;
  const lootMin = opts?.lootMin ?? def.lootMin;
  const lootMax = opts?.lootMax ?? def.lootMax;
  return {
    id: nextId(),
    size,
    emoji: opts?.emoji ?? def.emoji,
    material: opts?.material ?? def.material,
    sealMax,
    sealHP: sealMax,
    lootCount: randInt(lootMin, lootMax, rand),
    luckBonus: opts?.luckBonus,
    pool: opts?.pool,
    label: opts?.label,
    hollowChance: opts?.hollowChance,
    danger: opts?.danger,
    requireMutation: opts?.requireMutation,
    requirePipeline: opts?.requirePipeline,
    requireOrdnance: opts?.requireOrdnance,
    partBonus: opts?.partBonus,
    space: opts?.space,
  };
}

/** 免费到货：按阶段挑规格，越大越稀 */
export function pickDeliverSize(stage: number, rand: () => number): ParcelSizeId {
  const sizes = deliverableSizes(stage);
  const weights = sizes.map((s) => 1 / Math.sqrt(s.sealMax));
  return sizes[weightedPick(weights, rand)].id;
}

function gainMoney(d: GameState, amt: number, out: EngineOut) {
  d.money += amt;
  d.runEarned += amt;
  d.lifetimeEarned += amt;
  out.cash += amt;
}

/** 把工作台从队列补满 */
export function refillBench(d: GameState) {
  const cap = benchCapacity(d);
  while (d.workbench.length < cap && d.queue.length > 0) {
    d.workbench.push(d.queue.shift()!);
  }
  if (d.workbench.length > d.maxBatch) d.maxBatch = d.workbench.length;
}

function applyLoot(d: GameState, rarity: Rarity, itemId: string, out: EngineOut): RevealItem {
  const item = ITEM_MAP[itemId];
  if (rarity === 'legendary') d.legendaryFound = true;
  if (rarity === 'absurd') d.absurdFound = true;

  let isNew = false;
  let value = 0;
  if (item.kind === 'collectible') {
    if (!d.collection.includes(itemId)) {
      d.collection.push(itemId);
      isNew = true;
    } else {
      value = RARITIES[rarity].sellMult * 10;
      gainMoney(d, value, out); // 重复收藏品折算现金
    }
  } else if (item.kind === 'quote') {
    if (!d.quotes.includes(itemId)) {
      d.quotes.push(itemId);
      isNew = true;
    } else {
      value = RARITIES[rarity].sellMult * 10;
      gainMoney(d, value, out);
    }
  } else {
    // 可卖/材料：按自动卖货规则处理
    value = sellValue(item, rarity, sellBonus(d));
    const keepRank = d.autoSellKeepAbove ? rarityRank(d.autoSellKeepAbove) : Infinity;
    if (d.autoSellUnlocked && d.autoSellEnabled && rarityRank(rarity) < keepRank) {
      gainMoney(d, value, out);
    } else {
      d.inventory[itemId] = (d.inventory[itemId] ?? 0) + 1;
    }
  }
  out.bursts.push({
    id: nextId(),
    emoji: item.emoji,
    rarity,
    isNewCollectible: isNew,
    newKind: isNew ? (item.kind === 'quote' ? 'quote' : 'collectible') : undefined,
    quoteText: isNew && item.kind === 'quote' ? item.quote?.text : undefined,
  });
  return {
    emoji: item.emoji,
    name: item.name,
    rarity,
    kind: item.kind,
    value,
    isNew,
    quoteText: item.kind === 'quote' ? item.quote?.text : undefined,
  };
}

/**
 * 危险品意外爆炸时，小概率（垫刀递增）让老哥变异而非纯损失。
 * 返回触发的变异 id（若有），否则 null。掉落已经在意外中没了——变异是唯一的安慰。
 */
function rollMutation(d: GameState, rand: () => number, chanceOverride?: number): MutationId | null {
  // 还没拥有的变异
  const avail = MUTATIONS.filter((m) => !d.mutations.includes(m.id));
  if (avail.length === 0) return null; // 已集齐
  const chance = chanceOverride ?? Math.min(0.75, 0.12 + 0.06 * d.dangerStreak); // 垫刀：越炸越容易变
  if (rand() >= chance) return null;
  const pick = avail[weightedPick(avail.map((m) => m.weight), rand)];
  return pick.id;
}

/**
 * 高概率变异授予（军火轰开离谱货的闭环高潮）：按固定高概率掷一次变异，
 * 命中则永久叠加、重置垫刀、发 mutate 事件。返回是否变异。
 */
export function grantMutation(d: GameState, rand: () => number, chance = 0.6): boolean {
  const mutId = rollMutation(d, rand, chance);
  if (mutId) {
    d.mutations.push(mutId);
    d.dangerStreak = 0;
    emit('mutate', mutId);
    return true;
  }
  return false;
}

/**
 * 危险品被错误工具打开 -> 爆炸：无掉落、无现金，连带损伤台上其他快递，老哥被炸懵。
 * MUTATION HOOK: 损失结算后，按垫刀递增的概率改为触发变异（永久叠加的肉身工具）。
 */
function explode(d: GameState, p: Parcel, rand: () => number, out: EngineOut) {
  // 连带：敲掉台上其他快递 30% 封口血
  for (const other of d.workbench) {
    if (other.id === p.id) continue;
    other.sealHP = Math.max(1, other.sealHP - other.sealMax * BOOM_COLLATERAL);
  }
  d.dazedUntil = Date.now() + DAZED_MS;
  raiseFeedback(out, 'danger');
  out.reveals.push({
    id: nextId(),
    parcelEmoji: '💥',
    parcelName: (p.label ?? PARCEL_MAP[p.size].name) + '（炸了）',
    items: [],
    topRarity: 'common',
    manual: false,
  });
  emit('boom');

  // MUTATION HOOK
  const mutId = rollMutation(d, rand);
  if (mutId) {
    d.mutations.push(mutId);
    d.dangerStreak = 0;
    raiseFeedback(out, 'danger');
    emit('mutate', mutId);
  } else {
    d.dangerStreak += 1;
  }
}

function openParcel(d: GameState, p: Parcel, rand: () => number, out: EngineOut, forceDestroyOne = false, forceUnsafe = false) {
  d.totalUnpacked += 1;
  out.opened += 1;
  const tool = TOOL_MAP[d.currentTool];

  // 危险品 + 用错工具 -> 爆炸（在任何掉落前结算）。
  // 自动拆转区是「不安全」开箱者（forceUnsafe）：永远无法拆弹 → 危险货照炸。
  if (p.danger && (forceUnsafe || !toolIsSafe(d.currentTool))) {
    explode(d, p, rand, out);
    return;
  }

  // 扑空（原石）：开箱瞬间小概率啥也没有，只给一个 💨 letdown
  if (p.hollowChance && rand() < p.hollowChance) {
    const item = applyLoot(d, 'common', 'hollow', out);
    out.reveals.push({
      id: nextId(),
      parcelEmoji: p.emoji,
      parcelName: p.label ?? PARCEL_MAP[p.size].name,
      items: [item],
      topRarity: 'common',
      manual: false,
    });
    return;
  }
  const lp = { luck: luck(d) + (p.luckBonus ?? 0) };
  const items: RevealItem[] = [];
  let damagedCount = 0;
  for (let i = 0; i < p.lootCount; i++) {
    const rolled = rollItem(lp, rand, p.pool);
    const item = applyLoot(d, rolled.rarity, rolled.item.id, out);
    items.push(item);
  }
  // 零件副产物：独立于主掉落池的稀缺掉落（金属/危险货更易出；分拣机加成）。
  // 巨型货（partBonus）一次拆解会喷出成堆零件：多掷几次 + 大幅提高掉率。
  const partRolls = p.partBonus ? 6 : 1;
  const partBonusTotal = sorterBonus(d) + (p.partBonus ?? 0);
  for (let r = 0; r < partRolls; r++) {
    const partItem = rollPart(p.material, rand, partBonusTotal);
    if (!partItem) continue;
    d.inventory[partItem.id] = (d.inventory[partItem.id] ?? 0) + 1;
    out.bursts.push({ id: nextId(), emoji: partItem.emoji, rarity: partItem.rarity, isNewCollectible: false });
    items.push({
      emoji: partItem.emoji,
      name: partItem.name,
      rarity: partItem.rarity,
      kind: 'part',
      value: 0,
      isNew: false,
      itemId: partItem.id,
    });
  }
  // 踢坏物品：rage > 60 时 20% 概率损坏，或暴怒失控强制摧毁一件
  let forcedDestroyIdx = -1;
  if (forceDestroyOne && items.length > 0) {
    forcedDestroyIdx = Math.floor(rand() * items.length);
  }
  // 黑洞装置：开箱随机吞掉一件
  let eatIdx = -1;
  if (tool.eatsLoot && items.length > 0) {
    eatIdx = Math.floor(rand() * items.length);
  }
  // 锯子腿：可控的踢——暴怒踢坏概率降低、强制踩坏只有一半几率真损坏
  const sawKick = d.mutations.includes('sawlegs');
  const rageDestroyProb = sawKick ? 0.08 : 0.2;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    // 液压机：史诗以上的可卖/材料件 50% 损坏
    const fragileHit =
      tool.fragileDestroy &&
      (item.kind === 'sellable' || item.kind === 'material') &&
      rarityRank(item.rarity) >= rarityRank('epic') &&
      rand() < 0.5;
    const forcedHit = i === forcedDestroyIdx && (!sawKick || rand() < 0.5);
    const shouldDestroy =
      forcedHit || i === eatIdx || fragileHit || (d.rage > 60 && rand() < rageDestroyProb);
    if (shouldDestroy && !item.isDestroyed) {
      item.isDestroyed = true;
      // 已产生的价值减半（退回差额）
      const refund = Math.floor(item.value / 2);
      if (item.value > 0) {
        d.money -= refund;
        d.runEarned -= refund;
        d.lifetimeEarned -= refund;
        out.cash -= refund;
      }
      item.value = item.value - refund;
      damagedCount++;
    }
  }
  // 报复心理：有物品被踢坏则给 5 次 ×2 伤害
  if (damagedCount > 0) {
    d.revengeLeft = 5;
  }
  let topRarity = items[0]?.rarity ?? 'common';
  for (const it of items) if (rarityRank(it.rarity) > rarityRank(topRarity)) topRarity = it.rarity;
  // 暴怒值调整
  if (topRarity === 'common') {
    d.rage = Math.min(100, d.rage + 15);
  } else if (topRarity === 'rare') {
    d.rage = Math.max(0, d.rage - 10);
  } else if (topRarity === 'epic') {
    d.rage = Math.max(0, d.rage - 20);
  } else if (topRarity === 'legendary' || topRarity === 'absurd') {
    d.rage = Math.max(0, d.rage - 35);
  }
  out.reveals.push({
    id: nextId(),
    parcelEmoji: p.emoji,
    parcelName: p.label ?? PARCEL_MAP[p.size].name,
    items,
    topRarity,
    manual: false,
  });
}

/** 一次点击：群体作用于工作台所有快递 */
export function doClick(d: GameState, now: number, rand: () => number, out: EngineOut) {
  // 被炸懵：在 dazedUntil 之前点击无效（老哥被炸懵了）
  if (Date.now() < d.dazedUntil) return;
  // 连击
  if (now - d.lastClickAt <= COMBO_WINDOW_MS) d.combo += 1;
  else d.combo = 1;
  d.lastClickAt = now;
  if (d.combo > d.maxCombo) d.maxCombo = d.combo;

  if (d.workbench.length === 0) {
    refillBench(d);
    if (d.workbench.length === 0) return;
  }

  // 报复心理：revengeLeft > 0 时伤害 ×2
  let dmg = toolBaseDamage(d);
  if (d.revengeLeft > 0) {
    dmg *= 2;
    d.revengeLeft -= 1;
  }

  damageBench(d, dmg, rand, out);

  // 暴怒失控：rage 达到 100 时，强制打开工作台第一个快递，随机摧毁一件掉落，rage 重置到 30
  if (d.rage >= 100 && d.workbench.length > 0) {
    const target = d.workbench.splice(0, 1)[0];
    openParcel(d, target, rand, out, true /* forceDestroyOne */);
    // 覆盖 openParcel 内的 rage 调整，强制回 30
    d.rage = 30;
    raiseFeedback(out, 'danger');
    emit('rageBurst');
    refillBench(d);
  }

  refillStageAndUnpack(d);
}

/**
 * 当前工具对某快递的有效亲和度。
 * 危险品特例：用「不安全」的工具时，给一个固定的小亲和度 0.5——
 * 这样你照样能把它砸开，然后它在你脸上炸开（用错方法 = 它会回敬你）；
 * 用「安全」工具（拆弹钳）则用真实亲和度（disarm volatile:3），安全拆解。
 * 变异门 requireMutation：
 *   - 没有该变异（hasRequiredMutation=false）：任何工具都撬不动（返回 0）。
 *   - 有该变异：肉身直接撬开，至少给 2 的有效亲和度。
 * bodyAff：肉身自带材质效率（变异），与工具取 max。
 *   但危险品 + 不安全工具时仍固定 0.5——肉身不能拆弹，照样会被炸（保留连锁触发）。
 * 兼容旧签名：UI 可只传 (toolId, p)；引擎传入 bodyAff / hasRequiredMutation。
 */
/** 普通材质：任何工具都能慢慢啃，给一个软地板（用对工具才快） */
const NORMAL_MATERIALS: ReadonlySet<MaterialId> = new Set<MaterialId>([
  'paper', 'wood', 'metal', 'stone', 'organic', 'anomaly',
]);
/** 软梯度地板：普通材质用错工具也能慢慢撬（小伤害，靠换工具看伤害数字去发现最优解） */
const SOFT_FLOOR = 0.15;

export function effectiveAffinity(
  toolId: string,
  p: Parcel,
  bodyAff = 0,
  hasRequiredMutation = true,
): number {
  // 巨型货门（最高优先级硬门）：必须靠拆卸管线开 → 任何手动工具/肉身/软地板亲和度都为 0
  if (p.requirePipeline) return 0;
  // 离谱货门（同为最高优先级硬门）：只能用对应军火「轰开」→ 任何工具/管线亲和度都为 0
  if (p.requireOrdnance) return 0;
  // 变异门：缺少指定变异时硬锁（唯一保留的硬门槛 → 返回 0）
  if (p.requireMutation && !hasRequiredMutation) return 0;
  const real = TOOL_MAP[toolId as keyof typeof TOOL_MAP]?.affinity[p.material] ?? 0;
  // 危险品 + 不安全工具：固定 0.5，肉身也不能拆弹（仍会触发爆炸）；不套软地板
  if (p.danger && !toolIsSafe(toolId)) return Math.max(real, 0.5);
  const eff = Math.max(real, bodyAff);
  // 满足变异门时，肉身保证能撬开
  if (p.requireMutation && hasRequiredMutation) return Math.max(eff, 2);
  // 普通材质：软梯度地板——任何工具都能慢慢啃，用对工具才快
  if (NORMAL_MATERIALS.has(p.material)) return Math.max(eff, SOFT_FLOOR);
  return eff;
}

/** 引擎内部：把当前玩家状态（肉身/变异门）代入 effectiveAffinity */
export function effAffFor(d: GameState, p: Parcel): number {
  const bodyAff = bodyAffinity(d, p.material);
  const hasReq = !p.requireMutation || d.mutations.includes(p.requireMutation);
  return effectiveAffinity(d.currentTool, p, bodyAff, hasReq);
}

/** 群体伤害：每个快递按「当前工具对其材质的亲和度」缩放，亲和度<=0 则撬不动 */
function damageBench(d: GameState, dmg: number, rand: () => number, out: EngineOut) {
  const remaining: Parcel[] = [];
  for (const p of d.workbench) {
    const eff = effAffFor(d, p);
    if (eff <= 0) {
      // 硬门槛（仅变异门缺变异时）：撬不动，零伤害 + 闷响不震屏
      raiseFeedback(out, 'ineffective');
      remaining.push(p);
      continue;
    }
    const beforeFrac = p.sealHP / p.sealMax;
    p.sealHP -= dmg * eff;
    if (p.sealHP <= 0) {
      raiseFeedback(out, 'open');
      openParcel(d, p, rand, out);
    } else {
      raiseFeedback(out, 'hit');
      const afterFrac = p.sealHP / p.sealMax;
      // 跨过 0.67 / 0.34 破裂里程碑则升级到 crack
      if ((beforeFrac >= 0.67 && afterFrac < 0.67) || (beforeFrac >= 0.34 && afterFrac < 0.34)) {
        raiseFeedback(out, 'crack');
      }
      remaining.push(p);
    }
  }
  d.workbench = remaining;
  refillBench(d);
}

function refillStageAndUnpack(d: GameState) {
  d.stage = stageForEarned(d.runEarned);
}

/** 黑市商人到访/离场（用注入的 rand，保证可复现；每 tick 至多一次状态切换） */
export function tickMerchant(d: GameState, rand: () => number) {
  const now = Date.now();
  if (d.merchant === null) {
    if (now >= d.merchantNextAt) {
      // 备货：从池子里按权重不重复抽 N 件
      // 独一无二：已买过的离谱货从备货池剔除（每件这辈子只卖一次）
      const bought = new Set(d.boughtUniques ?? []);
      const pool = MERCHANT_POOL.filter((e) => !(e.kind === 'absurd' && bought.has(e.id)));
      const offers: MerchantOffer[] = [];
      for (let i = 0; i < MERCHANT_OFFER_COUNT && pool.length > 0; i++) {
        const idx = weightedPick(pool.map((p) => p.weight), rand);
        const e = pool.splice(idx, 1)[0];
        offers.push({
          id: e.id,
          kind: e.kind,
          price: Math.round(e.basePrice * MERCHANT_DISCOUNT),
          stock: e.kind === 'giant' || e.kind === 'absurd' ? 1 : randInt(1, 3, rand), // 巨型货/离谱货限量 1
        });
      }
      d.merchant = { until: now + MERCHANT_DURATION, offers };
      emit('merchant', true);
    }
  } else if (now > d.merchant.until) {
    d.merchant = null;
    d.merchantNextAt = now + MERCHANT_INTERVAL;
    emit('merchant', false);
  }
}

/**
 * 自动拆转区步进：每台 autoline_<mat> 设备按计时从积压区拉取对应材质的快递自动开箱。
 * - 多台同材质 = 处理更快（计时按台数加速）。
 * - 危险品：自动线是「不安全」开箱者 → 照炸（forceUnsafe）。
 * - 变异门未拥有：留在积压区不动。
 * - 不碰手动工作台，只消化 backlog。
 */
function tickAutoLines(d: GameState, dtSec: number, rand: () => number, out: EngineOut) {
  if (!d.devices) return;
  for (const devId of Object.keys(d.devices)) {
    const count = d.devices[devId] ?? 0;
    if (count <= 0) continue;
    const bp = BLUEPRINT_MAP[Object.keys(BLUEPRINT_MAP).find((k) => BLUEPRINT_MAP[k].result.id === devId) ?? ''];
    const mat = bp?.autolineMaterial;
    if (!mat) continue; // 非自动线设备（分拣机等）无 tick 行为
    d.deviceAccum[devId] = (d.deviceAccum[devId] ?? 0) + dtSec * count;
    let safety = 50;
    while (d.deviceAccum[devId] >= AUTO_LINE_INTERVAL && safety-- > 0) {
      // 找一个匹配材质、且（无变异门 或 已拥有变异）的积压快递
      const idx = d.backlog.findIndex(
        (p) => p.material === mat && (!p.requireMutation || d.mutations.includes(p.requireMutation)),
      );
      if (idx < 0) break; // 没有可处理的货，停在原地等
      d.deviceAccum[devId] -= AUTO_LINE_INTERVAL;
      const [parcel] = d.backlog.splice(idx, 1);
      openParcel(d, parcel, rand, out, false, true /* forceUnsafe：自动线不能拆弹 */);
    }
    // 没货时不让计时无限堆积（判定与上面「可开」一致：含变异门，避免空转累积后一次性爆拆）
    if (
      d.backlog.findIndex(
        (p) => p.material === mat && (!p.requireMutation || d.mutations.includes(p.requireMutation)),
      ) < 0
    ) {
      d.deviceAccum[devId] = Math.min(d.deviceAccum[devId], AUTO_LINE_INTERVAL);
    }
  }
}

/** 库存里是否够这条配方的全部输入 */
export function canRefine(d: GameState, recipe: RefineRecipe): boolean {
  for (const inp of recipe.inputs) {
    if ((d.inventory[inp.item] ?? 0) < inp.qty) return false;
  }
  return true;
}

/** 执行一条配方：扣输入，加产物（纯库存操作，调用前请先 canRefine） */
export function runRefine(d: GameState, recipe: RefineRecipe) {
  for (const inp of recipe.inputs) {
    d.inventory[inp.item] = (d.inventory[inp.item] ?? 0) - inp.qty;
    if (d.inventory[inp.item] <= 0) delete d.inventory[inp.item];
  }
  d.inventory[recipe.output.item] = (d.inventory[recipe.output.item] ?? 0) + recipe.output.qty;
}

/** 是否建有提炼炉（tier2 配方/自动提炼需要它） */
export function hasRefinery(d: GameState): boolean {
  return (d.devices?.[REFINERY_DEVICE] ?? 0) > 0;
}

/**
 * 手动提炼一条配方（玩家强制指定）。
 * - 输入不足 → no-op。
 * - tier2（稀土/浓缩铀）需建有提炼炉，否则拒绝。
 * 返回是否成功。
 */
export function manualRefine(d: GameState, recipeId: string): boolean {
  const recipe = REFINE_MAP[recipeId];
  if (!recipe) return false;
  if (recipe.tier === 2 && !hasRefinery(d)) return false;
  if (!canRefine(d, recipe)) return false;
  runRefine(d, recipe);
  return true;
}

/** 自动提炼可跑的配方（提炼炉用）：优先 tier1，再 tier2，库存满足即跑 */
function pickAutoRefine(d: GameState): RefineRecipe | null {
  for (const tier of [1, 2] as const) {
    for (const r of REFINES) {
      if (r.tier === tier && canRefine(d, r)) return r;
    }
  }
  return null;
}

/**
 * 提炼炉步进：每座提炼炉按计时自动跑一条当前库存满足的配方（优先 tier1 再 tier2）。
 * - 多座 = 更快。
 * - 没有可提炼的配方时计时封顶，不堆积。
 */
function tickRefinery(d: GameState, dtSec: number) {
  const count = d.devices?.[REFINERY_DEVICE] ?? 0;
  if (count <= 0) return;
  d.deviceAccum[REFINERY_DEVICE] = (d.deviceAccum[REFINERY_DEVICE] ?? 0) + dtSec * count;
  let safety = 50;
  while (d.deviceAccum[REFINERY_DEVICE] >= REFINE_INTERVAL && safety-- > 0) {
    const recipe = pickAutoRefine(d);
    if (!recipe) break; // 没有可提炼的，停在原地等
    d.deviceAccum[REFINERY_DEVICE] -= REFINE_INTERVAL;
    runRefine(d, recipe);
  }
  // 没有可提炼配方时计时封顶
  if (!pickAutoRefine(d)) {
    d.deviceAccum[REFINERY_DEVICE] = Math.min(d.deviceAccum[REFINERY_DEVICE], REFINE_INTERVAL);
  }
}

/**
 * 拆卸管线步进：每条拆卸管线按计时从积压区拉取「requirePipeline === 该管线 id」的巨型货自动开箱。
 * - 这是巨型货被打开的唯一途径（手动工具亲和度恒为 0）。
 * - 巨型货开箱后离开 backlog → 自动腾出厂房空间。
 * - 没有匹配的巨型货时管线空转，计时封顶不堆积。
 * - 多条同管线 = 更快。
 */
function tickPipelines(d: GameState, dtSec: number, rand: () => number, out: EngineOut) {
  if (!d.devices) return;
  for (const pipelineId of Object.keys(PIPELINE_SPACE)) {
    const count = d.devices[pipelineId] ?? 0;
    if (count <= 0) continue;
    d.deviceAccum[pipelineId] = (d.deviceAccum[pipelineId] ?? 0) + dtSec * count;
    let safety = 50;
    while (d.deviceAccum[pipelineId] >= PIPELINE_INTERVAL && safety-- > 0) {
      const idx = d.backlog.findIndex((p) => p.requirePipeline === pipelineId);
      if (idx < 0) break; // 没有匹配的巨型货，空转
      d.deviceAccum[pipelineId] -= PIPELINE_INTERVAL;
      const [giant] = d.backlog.splice(idx, 1);
      // 管线开巨型货时清掉硬门，否则 effAffFor 仍为 0 并不影响（直接 openParcel）。
      openParcel(d, giant, rand, out, false, true /* 管线视为不安全开箱者 */);
    }
    // 空转时计时封顶
    if (d.backlog.findIndex((p) => p.requirePipeline === pipelineId) < 0) {
      d.deviceAccum[pipelineId] = Math.min(d.deviceAccum[pipelineId], PIPELINE_INTERVAL);
    }
  }
}

/**
 * 离场远征步进：到期的远征返还奖励。
 * - 现金走 gainMoney 路径；唯一收藏品入 collection；零件/元素随机塞库存。
 * - pool 抽样若干进库存，并产一条 epic+ 的开箱特写（reveal），让返还有仪式感。
 * - 加信誉，id 移入 doneMissions，从 active 移除，发 missionDone 事件。
 */
function tickMissions(d: GameState, rand: () => number, out: EngineOut) {
  if (!d.missions || d.missions.length === 0) return;
  const now = Date.now();
  const still: { id: string; endsAt: number }[] = [];
  for (const m of d.missions) {
    if (now < m.endsAt) {
      still.push(m);
      continue;
    }
    const def = MISSION_MAP[m.id];
    if (!def) continue; // 未知远征：直接丢弃
    const rew = def.rewards;
    // 现金
    if (rew.cash) gainMoney(d, rew.cash, out);
    // 信誉
    if (rew.reputation) d.reputation += rew.reputation;
    // 独一无二的收藏品
    const uniqueIsNew = !d.collection.includes(rew.unique);
    if (uniqueIsNew) d.collection.push(rew.unique);
    // 零件
    for (let i = 0; i < (rew.parts ?? 0); i++) {
      const p = PARTS[Math.floor(rand() * PARTS.length)];
      if (p) d.inventory[p.id] = (d.inventory[p.id] ?? 0) + 1;
    }
    // 元素
    for (let i = 0; i < (rew.elements ?? 0); i++) {
      const e = ELEMENTS[Math.floor(rand() * ELEMENTS.length)];
      if (e) d.inventory[e.id] = (d.inventory[e.id] ?? 0) + 1;
    }
    // pool 抽样进库存 + 攒一条开箱特写
    const items: RevealItem[] = [];
    const uniqueItem = ITEM_MAP[rew.unique];
    if (uniqueItem) {
      items.push({
        emoji: uniqueItem.emoji,
        name: uniqueItem.name,
        rarity: uniqueItem.rarity,
        kind: uniqueItem.kind,
        value: 0,
        isNew: uniqueIsNew,
        itemId: rew.unique,
      });
    }
    const sampleN = Math.min(5, rew.pool.length);
    let topRarity: Rarity = uniqueItem?.rarity ?? 'common';
    for (let i = 0; i < sampleN; i++) {
      const id = rew.pool[Math.floor(rand() * rew.pool.length)];
      const it = ITEM_MAP[id];
      if (!it) continue;
      d.inventory[id] = (d.inventory[id] ?? 0) + 1;
      if (rarityRank(it.rarity) > rarityRank(topRarity)) topRarity = it.rarity;
      items.push({
        emoji: it.emoji, name: it.name, rarity: it.rarity, kind: it.kind,
        value: 0, isNew: false, itemId: id,
      });
    }
    if (rarityRank('epic') > rarityRank(topRarity)) topRarity = 'epic'; // 远征返还至少给 epic 仪式感
    out.reveals.push({
      id: nextId(),
      parcelEmoji: def.emoji,
      parcelName: def.name + '（已拆除）',
      items,
      topRarity,
      manual: false,
    });
    if (!d.doneMissions.includes(m.id)) d.doneMissions.push(m.id);
    emit('missionDone', m.id);
  }
  d.missions = still;
}

/** 游戏循环步进 */
export function doTick(d: GameState, dtSec: number, rand: () => number, out: EngineOut) {
  tickMerchant(d, rand);
  tickMissions(d, rand, out);

  // 连击衰减
  if (d.combo > 0 && Date.now() - d.lastClickAt > COMBO_WINDOW_MS) d.combo = 0;

  // 免费到货
  d.deliverAccum += dtSec;
  const interval = deliverInterval(d);
  let safety = 100;
  while (d.deliverAccum >= interval && safety-- > 0) {
    d.deliverAccum -= interval;
    d.queue.push(makeParcel(pickDeliverSize(d.stage, rand), rand));
  }
  if (d.queue.length > 500) d.queue.length = 500; // 防爆队列

  refillBench(d);

  // 自动拆
  const auto = autoPower(d);
  if (auto > 0 && d.workbench.length > 0) {
    damageBench(d, auto * dtSec, rand, out);
  }

  // 自动拆转区：消化积压区
  tickAutoLines(d, dtSec, rand, out);

  // 拆卸管线：消化厂房里的巨型货
  tickPipelines(d, dtSec, rand, out);

  // 提炼炉：把原料/零件精炼成元素
  tickRefinery(d, dtSec);

  refillStageAndUnpack(d);
}

/**
 * 军火轰开离谱货（闭环高潮）：force-open 指定快递（绕过 requireOrdnance 硬门），
 * 产出大额掉落 → 大爆闪 → 高概率变异。调用方负责消军火、判定门槛、腾厂房空间。
 * @returns 是否触发了变异
 */
export function forceOpenWithOrdnance(d: GameState, p: Parcel, rand: () => number, out: EngineOut): boolean {
  // 直接开箱（openParcel 不检查 requireOrdnance，硬门只在 effectiveAffinity/damageBench 里）
  openParcel(d, p, rand, out);
  raiseFeedback(out, 'danger');
  emit('boom'); // 复用大爆闪
  // 高概率变异：用核弹真的会把你自己也炸变异——这是离谱的预期收益
  return grantMutation(d, rand, 0.6);
}

/** 手动卖一件 */
export function sellOne(d: GameState, itemId: string): number {
  const n = d.inventory[itemId] ?? 0;
  if (n <= 0) return 0;
  const item = ITEM_MAP[itemId];
  const val = sellValue(item, item.rarity, sellBonus(d));
  d.inventory[itemId] = n - 1;
  if (d.inventory[itemId] <= 0) delete d.inventory[itemId];
  d.money += val;
  d.runEarned += val;
  d.lifetimeEarned += val;
  return val;
}

/** 卖全部（可选保留某稀有度以上） */
export function sellAll(d: GameState, keepAbove: Rarity | null): number {
  let total = 0;
  const keepRank = keepAbove ? rarityRank(keepAbove) : Infinity;
  for (const id of Object.keys(d.inventory)) {
    const item = ITEM_MAP[id];
    // 「全卖」永远保留零件/元素——它们是合成军火/设备的稀缺原料，
    // 不该被一键清空而打断拆→零件→元素→军火的闭环（仍可在背包里单件卖）。
    if (item.kind === 'part' || item.kind === 'element') continue;
    if (rarityRank(item.rarity) >= keepRank) continue;
    const n = d.inventory[id];
    total += sellValue(item, item.rarity, sellBonus(d)) * n;
    delete d.inventory[id];
  }
  d.money += total;
  d.runEarned += total;
  d.lifetimeEarned += total;
  return total;
}

/** 综合连击倍率（导出给 UI） */
export { comboMult };

/** 排序后的稀有度用于 UI 阈值选择 */
export const RARITY_LIST = RARITY_ORDER;
