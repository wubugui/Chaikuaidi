import { ITEM_MAP } from '../data/items';
import type { MaterialId } from '../data/materials';
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
import { rollItem, sellValue } from './systems/loot';
import { COMBO_WINDOW_MS, type GameState, type Parcel } from './state';

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
function rollMutation(d: GameState, rand: () => number): MutationId | null {
  // 还没拥有的变异
  const avail = MUTATIONS.filter((m) => !d.mutations.includes(m.id));
  if (avail.length === 0) return null; // 已集齐
  const chance = Math.min(0.75, 0.12 + 0.06 * d.dangerStreak); // 垫刀：越炸越容易变
  if (rand() >= chance) return null;
  const pick = avail[weightedPick(avail.map((m) => m.weight), rand)];
  return pick.id;
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

function openParcel(d: GameState, p: Parcel, rand: () => number, out: EngineOut, forceDestroyOne = false) {
  d.totalUnpacked += 1;
  out.opened += 1;
  const tool = TOOL_MAP[d.currentTool];

  // 危险品 + 用错工具 -> 爆炸（在任何掉落前结算）
  if (p.danger && !toolIsSafe(d.currentTool)) {
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

/** 游戏循环步进 */
export function doTick(d: GameState, dtSec: number, rand: () => number, out: EngineOut) {
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
  refillStageAndUnpack(d);
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
