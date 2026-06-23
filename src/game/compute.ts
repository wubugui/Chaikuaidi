import { ITEM_MAP } from '../data/items';
import { PRESTIGE_MAP } from '../data/prestige';
import { QUOTE_MAP } from '../data/quotes';
import { TOOL_MAP } from '../data/tools';
import { UPGRADE_MAP } from '../data/upgrades';
import { MUTATION_MAP } from '../data/mutations';
import type { MaterialId } from '../data/materials';
import type { PassiveType } from '../data/types';
import { BASE_DELIVER_INTERVAL, BASE_QUOTE_SLOTS, type GameState } from './state';

function up(s: GameState, id: string): number {
  return s.upgrades[id] ?? 0;
}
function pres(s: GameState, id: string): number {
  return s.prestigeTree[id] ?? 0;
}

/** 收藏品被动加成合计 */
export function passiveBonus(s: GameState, type: PassiveType): number {
  let sum = 0;
  for (const id of s.collection) {
    const it = ITEM_MAP[id];
    if (it?.passive?.type === type) sum += it.passive.amount;
  }
  return sum;
}

/** 已装备语录的加成合计 */
export function quoteBonus(s: GameState, type: PassiveType): number {
  let sum = 0;
  for (const id of s.equippedQuotes) {
    const q = QUOTE_MAP[id];
    if (q?.quote?.type === type) sum += q.quote.amount;
  }
  return sum;
}

/** 变异被动加成合计（如三头六臂连击上限、磁力手售价） */
export function mutationBonus(s: GameState, type: PassiveType): number {
  let sum = 0;
  for (const id of s.mutations) {
    const m = MUTATION_MAP[id];
    if (m?.passive?.type === type) sum += m.passive.amount;
  }
  return sum;
}

/** 肉身自带材质效率（多个变异取 max；无则 0） */
export function bodyAffinity(s: GameState, material: MaterialId): number {
  let best = 0;
  for (const id of s.mutations) {
    const v = MUTATION_MAP[id]?.bodyAffinity?.[material] ?? 0;
    if (v > best) best = v;
  }
  return best;
}

/** 某类型的总加成（收藏被动 + 语录 + 变异） */
function bonus(s: GameState, type: PassiveType): number {
  return passiveBonus(s, type) + quoteBonus(s, type) + mutationBonus(s, type);
}

/** 语录装备槽位数 */
export function quoteSlots(s: GameState): number {
  return BASE_QUOTE_SLOTS + pres(s, 'quoteSlot') * PRESTIGE_MAP.quoteSlot.effect;
}

/** 连击倍率 */
export function comboMult(s: GameState): number {
  const cap = 2 + up(s, 'comboCap') * UPGRADE_MAP.comboCap.effect + bonus(s, 'comboCap');
  return 1 + Math.min(s.combo * 0.05, cap);
}

/** 全局拆解倍率（转生） */
function globalClickMult(s: GameState): number {
  return 1 + pres(s, 'globalClick') * PRESTIGE_MAP.globalClick.effect;
}

/** 当前工具的实际威力（含每把工具的升级等级 +20%/级） */
function toolPower(s: GameState): number {
  // 兜底：旧存档/未迁移完成时 currentTool 可能是非法 id
  const def = TOOL_MAP[s.currentTool] ?? TOOL_MAP.hand;
  const lvl = s.toolLevels?.[s.currentTool] ?? 0;
  return def.power * (1 + lvl * 0.2);
}

/** 单次点击的基础拆解值（含连击；材质亲和度在 damageBench 中再乘） */
export function toolBaseDamage(s: GameState): number {
  const upg = 1 + up(s, 'clickPower') * UPGRADE_MAP.clickPower.effect;
  return toolPower(s) * upg * comboMult(s) * globalClickMult(s) * (1 + bonus(s, 'clickPower'));
}

/** clickPower 别名，保持旧引用可用 */
export const clickPower = toolBaseDamage;

/** 不含连击的点击基础值（UI 展示用） */
export function clickPowerBase(s: GameState): number {
  const upg = 1 + up(s, 'clickPower') * UPGRADE_MAP.clickPower.effect;
  return toolPower(s) * upg * globalClickMult(s) * (1 + bonus(s, 'clickPower'));
}

/** 当前装备工具对某材质的亲和度（<=0 表示撬不动） */
export function affinityOf(s: GameState, material: MaterialId): number {
  const def = TOOL_MAP[s.currentTool] ?? TOOL_MAP.hand;
  return def.affinity[material] ?? 0;
}

/** 自动产线提速倍率（收藏/语录的「自动拆解 +%」被动现在加速自动拆转区/管线/提炼炉） */
export function autoLineSpeed(s: GameState): number {
  return 1 + bonus(s, 'autoPower');
}

/** 幸运值合计 */
export function luck(s: GameState): number {
  return (
    up(s, 'luck') * UPGRADE_MAP.luck.effect +
    pres(s, 'globalLuck') * PRESTIGE_MAP.globalLuck.effect +
    bonus(s, 'luck')
  );
}

/** 售价加成合计 */
export function sellBonus(s: GameState): number {
  return (
    up(s, 'sellPrice') * UPGRADE_MAP.sellPrice.effect +
    pres(s, 'globalSell') * PRESTIGE_MAP.globalSell.effect +
    bonus(s, 'sellPrice')
  );
}

/** 工作台容量 */
export function benchCapacity(s: GameState): number {
  let mut = 0;
  for (const id of s.mutations) mut += MUTATION_MAP[id]?.benchBonus ?? 0;
  return 1 + up(s, 'workbench') * UPGRADE_MAP.workbench.effect + mut;
}

/** 点击冷却(ms) */
export function clickCooldown(s: GameState): number {
  const reduce = Math.min(up(s, 'clickSpeed') * UPGRADE_MAP.clickSpeed.effect, 0.8);
  return 170 * (1 - reduce);
}

/** 到货间隔(秒) */
export function deliverInterval(s: GameState): number {
  const reduce = Math.min(up(s, 'deliverRate') * UPGRADE_MAP.deliverRate.effect, 0.9);
  const speed = 1 + passiveBonus(s, 'autoSpeed');
  return (BASE_DELIVER_INTERVAL * (1 - reduce)) / speed;
}

/** 离线效率 */
export function offlineEfficiency(s: GameState): number {
  return 0.5 + pres(s, 'offline') * PRESTIGE_MAP.offline.effect;
}
