import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ACHIEVEMENTS } from '../data/achievements';
import { FIRST_VISIT_DELAY } from '../data/merchant';
import { BATCHES, CONTAINERS, LUGGAGE, type ContainerDef, type LuggageDef } from '../data/shop';
import { COLLECTION_TOTAL } from '../data/items';
import { PRESTIGE_MAP, prestigeNodeCost, reputationFor } from '../data/prestige';
import { rarityRank } from '../data/rarity';
import { PARCEL_MAP } from '../data/parcels';
import { TOOL_MAP, TOOLS, toolUpgradeCost } from '../data/tools';
import { AUTO_SELL_COST, UPGRADE_MAP, upgradeBulkCost } from '../data/upgrades';
import { BLUEPRINT_MAP } from '../data/blueprints';
import {
  GIANT_MAP, PIPELINE_SPACE, FACTORY_BASE_SPACE, FACTORY_EXPAND_STEP,
  factoryExpandCost, type GiantDef,
} from '../data/giants';
import { ABSURD_MAP, MONOLITH_REPUTATION, type AbsurdDef } from '../data/absurd';
import { MISSION_MAP } from '../data/missions';
import { REFINERY_DEVICE, REFINERY_SPACE } from '../data/refine';
import type { Rarity, ToolId } from '../data/types';
import { emit, seedId } from './events';
import { syncRuntimeFromLegacy } from './legacyBridge';
import {
  doClick,
  doTick,
  forceOpenWithOrdnance,
  makeParcel,
  manualRefine,
  newOut,
  refillBench,
  sellAll as engineSellAll,
  sellOne as engineSellOne,
  type EngineOut,
} from './engine';
import { benchCapacity, quoteSlots } from './compute';
import { settleOffline, type OfflineResult } from './systems/offline';
import { backlogGroupKey, factoryFree, initialState, type GameState, type Parcel } from './state';

const liveRand = () => Math.random();

/** 造一个巨型货快递（占厂房、需拆卸管线，仅 P4a） */
function makeGiantParcel(g: GiantDef): Parcel {
  return makeParcel('container', liveRand, {
    material: g.material, emoji: g.emoji, label: g.name, sealMax: g.sealMax,
    lootMin: g.lootMin, lootMax: g.lootMax, luckBonus: g.luckBonus, pool: g.pool,
    requirePipeline: g.requirePipeline, partBonus: g.partBonus, space: g.space,
  });
}

/** 造一个离谱货快递（占厂房、只能用军火轰开，仅黑市） */
function makeAbsurdParcel(a: AbsurdDef): Parcel {
  return makeParcel('container', liveRand, {
    material: a.material, emoji: a.emoji, label: a.name, sealMax: a.sealMax,
    lootMin: a.lootMin, lootMax: a.lootMax, luckBonus: a.luckBonus, pool: a.pool,
    requireOrdnance: a.requireOrdnance, partBonus: a.partBonus, space: a.space,
  });
}

/** 造一个行李快递（买入/黑市共用） */
function makeLuggageParcel(lug: LuggageDef): Parcel {
  return makeParcel(lug.baseSize, liveRand, {
    emoji: lug.emoji, label: lug.name, sealMax: lug.sealMax,
    lootMin: lug.lootMin, lootMax: lug.lootMax, luckBonus: lug.luckBonus, pool: lug.pool,
  });
}

/** 造一个货柜快递（买入/黑市共用） */
function makeContainerParcel(c: ContainerDef): Parcel {
  return makeParcel('crate', liveRand, {
    material: c.material, emoji: c.emoji, label: c.name, sealMax: c.sealMax,
    lootMin: c.lootMin, lootMax: c.lootMax, luckBonus: c.luckBonus, pool: c.pool,
    hollowChance: c.hollowChance, danger: c.danger, requireMutation: c.requireMutation,
  });
}

/** localStorage 不可用时（SSR / 测试）退回内存存储 */
function safeStorage() {
  if (typeof localStorage !== 'undefined') return localStorage;
  const mem = new Map<string, string>();
  return {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  } as unknown as Storage;
}

interface Actions {
  click: () => void;
  tick: (dtSec: number) => void;
  buyUpgrade: (id: string, n?: number) => void;
  buyTool: (id: ToolId) => void;
  selectTool: (id: ToolId) => void;
  upgradeTool: (id: ToolId) => void;
  buyAutoSell: () => void;
  setAutoSell: (enabled: boolean, keepAbove: Rarity | null) => void;
  sellItem: (id: string) => void;
  sellAllItems: (keepAbove?: Rarity | null) => void;
  buyBatch: (batchId: string) => void;
  buyLuggage: (id: string) => void;
  buyContainer: (id: string) => void;
  buyGiant: (id: string) => void;
  expandFactory: () => void;
  buyFromMerchant: (offerId: string) => void;
  dispatchMission: (id: string) => void;
  loadFromBacklog: (parcelId: number) => void;
  dumpGroupToBelt: (key: string) => void;
  shelveToBacklog: (parcelId: number) => void;
  buyPrestige: (id: string) => void;
  prestige: () => void;
  buyBlueprint: (id: string) => void;
  setTargetBlueprint: (id: string | null) => void;
  craftBlueprint: (id: string) => void;
  toggleDevice: (id: string) => void;
  setUiBusy: (b: boolean) => void;
  refine: (recipeId: string) => void;
  useOrdnance: (parcelId: number) => void;
  equipQuote: (id: string) => void;
  unequipQuote: (id: string) => void;
  markIntroSeen: () => void;
  toggleAudio: () => void;
  hardReset: () => void;
  dismissOffline: () => void;
}

type Store = GameState & Actions & { offline: OfflineResult | null };
const SAVE_VERSION = 2;

/** 生成一个可变草稿（顶层与会变动的集合都用新引用） */
function draft(s: GameState): GameState {
  return {
    ...s,
    workbench: s.workbench.map((p) => ({ ...p })),
    queue: s.queue.slice(),
    backlog: s.backlog.map((p) => ({ ...p })),
    inventory: { ...s.inventory },
    collection: s.collection.slice(),
    quotes: s.quotes.slice(),
    equippedQuotes: s.equippedQuotes.slice(),
    achievements: s.achievements.slice(),
    upgrades: { ...s.upgrades },
    prestigeTree: { ...s.prestigeTree },
    ownedTools: s.ownedTools.slice(),
    toolLevels: { ...s.toolLevels },
    mutations: s.mutations.slice(),
    blueprints: s.blueprints.slice(),
    devices: { ...s.devices },
    deviceEnabled: { ...(s.deviceEnabled ?? {}) },
    deviceAccum: { ...s.deviceAccum },
    ordnance: { ...s.ordnance },
    missions: (s.missions ?? []).slice(),
    doneMissions: (s.doneMissions ?? []).slice(),
    boughtUniques: (s.boughtUniques ?? []).slice(),
    recentLoot: (s.recentLoot ?? []).map((e) => ({ ...e })),
  };
}

/** 弹出一个荒诞卖家对白（买入/派出特殊货时） */
function emitSeller(seller: { name: string; emoji: string; lines: string[] } | undefined, itemName: string) {
  if (!seller || seller.lines.length === 0) return;
  emit('seller', { name: seller.name, emoji: seller.emoji, lines: seller.lines, item: itemName });
}

/** 检查并发放成就奖励 */
function checkAchievements(d: GameState, out: EngineOut) {
  const ctx = {
    totalUnpacked: d.totalUnpacked,
    totalEarned: d.lifetimeEarned,
    maxCombo: d.maxCombo,
    collectionCount: d.collection.length,
    collectionTotal: COLLECTION_TOTAL,
    legendaryFound: d.legendaryFound,
    absurdFound: d.absurdFound,
    batchSize: d.maxBatch,
    quoteCount: d.quotes.length,
  };
  for (const a of ACHIEVEMENTS) {
    if (!d.achievements.includes(a.id) && a.check(ctx)) {
      d.achievements.push(a.id);
      d.money += a.reward;
      d.lifetimeEarned += a.reward;
      out.cash += a.reward;
    }
  }
}

/** 手动拆：砸击音效 + 震屏 + 开箱特写（不放飞小图标，特写代替） */
function emitManual(out: EngineOut) {
  if (out.opened > 0) emit('open');
  emit('feedback', out.feedback);
  for (const r of out.reveals) {
    r.manual = true;
    emit('reveal', r);
  }
}

/** 自动拆：战利品流（飞图标 + 音效），只有稀有以上才弹特写 */
function emitAuto(out: EngineOut) {
  for (const b of out.bursts) emit('loot', b);
  // 自动只在开箱/破裂里程碑时给一点震动，平常的 hit/ineffective 不打扰
  if (out.feedback === 'open' || out.feedback === 'crack') emit('feedback', out.feedback);
  for (const r of out.reveals) {
    if (rarityRank(r.topRarity) >= rarityRank('epic')) emit('reveal', r);
  }
}

export const useGame = create<Store>()(
  persist(
    (set, get) => ({
      ...initialState(),
      offline: null,

      click: () => {
        const out = newOut();
        const d = draft(get());
        doClick(d, Date.now(), liveRand, out);
        checkAchievements(d, out);
        set(d);
        emitManual(out);
      },

      tick: (dtSec) => {
        const out = newOut();
        const d = draft(get());
        d.lastSeen = Date.now();
        doTick(d, dtSec, liveRand, out);
        if (out.bursts.length || out.cash) checkAchievements(d, out);
        set(d);
        emitAuto(out);
      },

      buyUpgrade: (id, n = 1) => {
        const s = get();
        const def = UPGRADE_MAP[id];
        if (!def) return;
        const lvl = s.upgrades[id] ?? 0;
        const cap = def.maxLevel > 0 ? def.maxLevel - lvl : Infinity;
        const buy = Math.min(n, cap);
        if (buy <= 0) return;
        const cost = upgradeBulkCost(def, lvl, buy);
        if (s.money < cost) return;
        const d = draft(s);
        d.money -= cost;
        d.upgrades[id] = lvl + buy;
        refillBench(d);
        set(d);
      },

      buyTool: (id) => {
        const s = get();
        const tool = TOOL_MAP[id];
        if (!tool || s.ownedTools.includes(id)) return;
        if (s.stage < tool.unlockStage || s.money < tool.cost) return;
        const d = draft(s);
        d.money -= tool.cost;
        d.ownedTools.push(id);
        set(d);
      },

      selectTool: (id) => {
        const s = get();
        if (!s.ownedTools.includes(id)) return;
        const d = draft(s);
        d.currentTool = id;
        set(d);
      },

      upgradeTool: (id) => {
        const s = get();
        const tool = TOOL_MAP[id];
        if (!tool || !s.ownedTools.includes(id)) return;
        const level = s.toolLevels[id] ?? 0;
        const cost = toolUpgradeCost(tool, level);
        if (s.money < cost.money) return;
        if (tool.upgradeMat && (s.inventory[tool.upgradeMat] ?? 0) < cost.mat) return;
        const d = draft(s);
        d.money -= cost.money;
        if (tool.upgradeMat) {
          d.inventory[tool.upgradeMat] = (d.inventory[tool.upgradeMat] ?? 0) - cost.mat;
          if (d.inventory[tool.upgradeMat] <= 0) delete d.inventory[tool.upgradeMat];
        }
        d.toolLevels[id] = level + 1;
        set(d);
      },

      buyAutoSell: () => {
        const s = get();
        if (s.autoSellUnlocked || s.money < AUTO_SELL_COST) return;
        const d = draft(s);
        d.money -= AUTO_SELL_COST;
        d.autoSellUnlocked = true;
        d.autoSellEnabled = true;
        set(d);
      },

      setAutoSell: (enabled, keepAbove) => {
        const d = draft(get());
        d.autoSellEnabled = enabled;
        d.autoSellKeepAbove = keepAbove;
        set(d);
      },

      sellItem: (id) => {
        const d = draft(get());
        const v = engineSellOne(d, id);
        set(d);
        if (v > 0) emit('float', { id: Date.now(), text: '+¥' + v, color: '#34d399', kind: 'cash' });
      },

      sellAllItems: (keepAbove = null) => {
        const out = newOut();
        const d = draft(get());
        const v = engineSellAll(d, keepAbove);
        checkAchievements(d, out);
        set(d);
        if (v > 0) emit('float', { id: Date.now(), text: '+¥' + Math.floor(v), color: '#34d399', kind: 'cash' });
      },

      // 进货：买来的货进「积压区」，不自动上台（自然到货才走传送带→工作台）
      buyBatch: (batchId) => {
        const s = get();
        const b = BATCHES.find((x) => x.id === batchId);
        if (!b || s.money < b.price) return;
        const d = draft(s);
        d.money -= b.price;
        for (let i = 0; i < b.count; i++) {
          const size = b.sizes[Math.floor(liveRand() * b.sizes.length)];
          d.backlog.push(makeParcel(size, liveRand));
        }
        set(d);
      },

      buyLuggage: (id) => {
        const s = get();
        const lug = LUGGAGE.find((x) => x.id === id);
        if (!lug || s.money < lug.price) return;
        const d = draft(s);
        d.money -= lug.price;
        d.backlog.push(makeLuggageParcel(lug));
        set(d);
        emitSeller(lug.seller, lug.name);
      },

      buyContainer: (id) => {
        const s = get();
        const c = CONTAINERS.find((x) => x.id === id);
        if (!c || c.merchantOnly || s.stage < c.unlockStage || s.money < c.price) return;
        const d = draft(s);
        d.money -= c.price;
        d.backlog.push(makeContainerParcel(c));
        set(d);
        emitSeller(c.seller, c.name);
      },

      // 巨型货：阶段 + 钱 + 厂房空间三重门，买入推入积压区（占厂房，仅拆卸管线能开）
      buyGiant: (id) => {
        const s = get();
        const g = GIANT_MAP[id];
        if (!g || g.merchantOnly) return;
        if (s.stage < g.unlockStage || s.money < g.price) return;
        if (factoryFree(s) < g.space) return; // 厂房放不下
        const d = draft(s);
        d.money -= g.price;
        d.backlog.push(makeGiantParcel(g));
        set(d);
        emitSeller(g.seller, g.name);
      },

      // 扩建厂房：钱门，+2 空间，成本随已扩建次数指数增长
      expandFactory: () => {
        const s = get();
        const cost = factoryExpandCost(s.factorySpace ?? FACTORY_BASE_SPACE);
        if (s.money < cost) return;
        const d = draft(s);
        d.money -= cost;
        d.factorySpace = (s.factorySpace ?? FACTORY_BASE_SPACE) + FACTORY_EXPAND_STEP;
        set(d);
      },

      buyFromMerchant: (offerId) => {
        const s = get();
        if (!s.merchant) return;
        const offer = s.merchant.offers.find((o) => o.id === offerId);
        if (!offer || offer.stock <= 0 || s.money < offer.price) return;
        const giant = offer.kind === 'giant' ? GIANT_MAP[offer.id] : undefined;
        const absurd = offer.kind === 'absurd' ? ABSURD_MAP[offer.id] : undefined;
        // 巨型货 / 离谱货：还需通过厂房空间门
        if (giant && factoryFree(s) < giant.space) return;
        if (absurd && factoryFree(s) < absurd.space) return;
        const good =
          offer.kind === 'container'
            ? CONTAINERS.find((c) => c.id === offer.id)
            : offer.kind === 'giant'
              ? giant
              : offer.kind === 'absurd'
                ? absurd
                : LUGGAGE.find((l) => l.id === offer.id);
        if (!good) return;
        const d = draft(s);
        d.money -= offer.price;
        // 减库存（merchant 在 draft 里是浅拷贝，需新建 offers 引用）
        d.merchant = {
          until: s.merchant.until,
          offers: s.merchant.offers.map((o) =>
            o.id === offerId ? { ...o, stock: o.stock - 1 } : o,
          ),
        };
        d.backlog.push(
          offer.kind === 'container'
            ? makeContainerParcel(good as ContainerDef)
            : offer.kind === 'giant'
              ? makeGiantParcel(good as GiantDef)
              : offer.kind === 'absurd'
                ? makeAbsurdParcel(good as AbsurdDef)
                : makeLuggageParcel(good as LuggageDef),
        );
        // 独一无二：买过的离谱货登记，后续黑市不再出
        if (offer.kind === 'absurd' && (absurd as AbsurdDef).unique) {
          if (!d.boughtUniques.includes(offer.id)) d.boughtUniques.push(offer.id);
        }
        set(d);
        // 荒诞卖家对白（货柜/行李/巨型货/离谱货都可能带 seller）
        emitSeller((good as { seller?: { name: string; emoji: string; lines: string[] } }).seller, good.name);
      },

      // 离场远征：阶段 + 钱 + requires + 未在进行/未完成 五重门，扣出勤费，
      // 把远征「现场结构」当作一件可手动拆的快递装上工作台（亲自去拆），弹卖家对白
      dispatchMission: (id) => {
        const s = get();
        const def = MISSION_MAP[id];
        if (!def) return;
        if (s.stage < def.unlockStage) return;
        if (s.money < def.cost) return;
        if ((s.missions ?? []).includes(id)) return; // 已在路上
        if ((s.doneMissions ?? []).includes(id)) return; // 已完成（一次性）
        // 轻量前置
        const req = def.requires;
        if (req) {
          if (req.mission && !(s.doneMissions ?? []).includes(req.mission)) return;
          if (req.ordnance && (s.ordnance[req.ordnance] ?? 0) < 1) return;
          if (req.mutation && !(s.mutations ?? []).includes(req.mutation as any)) return;
        }
        const d = draft(s);
        d.money -= def.cost;
        // 现场结构：大封口血（按出勤费缩放，80k–600k 递增），金属材质，徒手可拆（工具/亲和度生效）
        const sealMax = Math.round(Math.min(600_000, Math.max(80_000, def.cost / 25)));
        const onsite = makeParcel('container', liveRand, {
          material: 'metal',
          emoji: def.emoji,
          label: '📍 远征现场 · ' + def.name,
          sealMax,
          lootMin: 1,
          lootMax: 1, // 真正的奖励由 missionId 路径发放，掉落数无关紧要
        });
        onsite.missionId = id;
        // 优先上工作台；满了就进积压区（玩家可手动上台）
        if (d.workbench.length < benchCapacity(d)) {
          d.workbench.push(onsite);
          if (d.workbench.length > d.maxBatch) d.maxBatch = d.workbench.length;
        } else {
          d.backlog.push(onsite);
        }
        d.missions.push(id);
        set(d);
        emitSeller(def.seller, def.name);
      },

      loadFromBacklog: (parcelId) => {
        const s = get();
        if (s.workbench.length >= benchCapacity(s)) return;
        const idx = s.backlog.findIndex((p) => p.id === parcelId);
        if (idx < 0) return;
        // 巨型货是管线专属、离谱货是军火专属：不允许手动上台（亲和度恒为 0，上台只会卡死工作台）
        if (s.backlog[idx].requirePipeline || s.backlog[idx].requireOrdnance) return;
        const d = draft(s);
        const [p] = d.backlog.splice(idx, 1);
        d.workbench.push(p);
        if (d.workbench.length > d.maxBatch) d.maxBatch = d.workbench.length;
        set(d);
      },

      dumpGroupToBelt: (key) => {
        const s = get();
        const d = draft(s);
        const kept: Parcel[] = [];
        for (const p of d.backlog) {
          if (backlogGroupKey(p, PARCEL_MAP[p.size].name) === key) d.queue.push(p);
          else kept.push(p);
        }
        if (kept.length === d.backlog.length) return; // 无匹配，no-op
        d.backlog = kept;
        refillBench(d);
        set(d);
      },

      shelveToBacklog: (parcelId) => {
        const s = get();
        const idx = s.workbench.findIndex((p) => p.id === parcelId);
        if (idx < 0) return;
        const d = draft(s);
        const [p] = d.workbench.splice(idx, 1);
        d.backlog.push(p);
        refillBench(d); // 拉上下一个自然快递
        set(d);
      },

      buyPrestige: (id) => {
        const s = get();
        const def = PRESTIGE_MAP[id];
        if (!def) return;
        const lvl = s.prestigeTree[id] ?? 0;
        if (def.maxLevel > 0 && lvl >= def.maxLevel) return;
        const cost = prestigeNodeCost(def, lvl);
        if (s.reputation < cost) return;
        const d = draft(s);
        d.reputation -= cost;
        d.prestigeTree[id] = lvl + 1;
        set(d);
      },

      prestige: () => {
        const s = get();
        const gain = reputationFor(s.runEarned);
        if (gain <= 0) return;
        const d = draft(s);
        // 保留：信誉、转生树、收藏、成就、历史统计
        const keep = {
          reputation: d.reputation + gain,
          prestigeTree: d.prestigeTree,
          collection: d.collection,
          quotes: d.quotes,
          equippedQuotes: d.equippedQuotes,
          achievements: d.achievements,
          lifetimeEarned: d.lifetimeEarned,
          totalUnpacked: d.totalUnpacked,
          maxCombo: d.maxCombo,
          maxBatch: d.maxBatch,
          legendaryFound: d.legendaryFound,
          absurdFound: d.absurdFound,
          audioEnabled: d.audioEnabled,
          introSeen: d.introSeen,
          mutations: d.mutations, // 变异是永久肉身改造，跨转生保留
          blueprints: d.blueprints, // 图纸是永久知识，跨转生保留
          targetBlueprint: d.targetBlueprint,
          doneMissions: d.doneMissions, // 远征是一次性的，跨转生永久记账
          boughtUniques: d.boughtUniques, // 独一无二的离谱货也永久记账
          // 设备（devices/deviceAccum）随本轮重置——重开后重新建造
          // 进行中的 missions 随本轮重置（出勤队伍跟着跑路了）
        };
        const fresh = initialState();
        const next: GameState = { ...fresh, ...keep, lastSeen: Date.now() };
        // 启动资金
        const startLvl = next.prestigeTree.startCash ?? 0;
        if (startLvl > 0) {
          let cash = 0;
          for (let i = 0; i < startLvl; i++) cash += PRESTIGE_MAP.startCash.effect * Math.pow(2, i);
          next.money = cash;
        }
        // 给点起始快递
        for (let i = 0; i < 3; i++) next.queue.push(makeParcel('small', liveRand));
        refillBench(next);
        set({ ...next });
      },

      // ---- 图纸 / 合成 / 设备 ----
      buyBlueprint: (id) => {
        const s = get();
        const bp = BLUEPRINT_MAP[id];
        if (!bp || s.blueprints.includes(id)) return;
        if (s.stage < bp.unlockStage || s.money < bp.buyCost) return;
        const d = draft(s);
        d.money -= bp.buyCost;
        d.blueprints.push(id);
        set(d);
      },

      setTargetBlueprint: (id) => {
        const s = get();
        if (id !== null && !s.blueprints.includes(id)) return;
        const d = draft(s);
        d.targetBlueprint = id;
        set(d);
      },

      craftBlueprint: (id) => {
        const s = get();
        const bp = BLUEPRINT_MAP[id];
        if (!bp || !s.blueprints.includes(id)) return;
        // 检查零件与钱
        for (const inp of bp.inputs) {
          if ((s.inventory[inp.item] ?? 0) < inp.qty) return;
        }
        if (s.money < bp.moneyCost) return;
        // 占厂房空间的设备（拆卸管线 / 提炼炉）：放不下则拒绝
        if (bp.result.type === 'device') {
          const need = bp.result.id === REFINERY_DEVICE ? REFINERY_SPACE : PIPELINE_SPACE[bp.result.id];
          if (need && factoryFree(s) < need) return;
        }
        const d = draft(s);
        for (const inp of bp.inputs) {
          d.inventory[inp.item] = (d.inventory[inp.item] ?? 0) - inp.qty;
          if (d.inventory[inp.item] <= 0) delete d.inventory[inp.item];
        }
        d.money -= bp.moneyCost;
        if (bp.result.type === 'device') {
          const did = bp.result.id;
          if (bp.repeatable || (d.devices[did] ?? 0) === 0) {
            d.devices[did] = (d.devices[did] ?? 0) + 1;
          }
          // 新造的设备默认「停工」——玩家需在工坊/厂房手动开启（不写 deviceEnabled）
        } else if (bp.result.type === 'tool') {
          const tid = bp.result.id as ToolId;
          if (!d.ownedTools.includes(tid)) d.ownedTools.push(tid);
        } else if (bp.result.type === 'ordnance') {
          const oid = bp.result.id;
          d.ordnance[oid] = (d.ordnance[oid] ?? 0) + 1;
        }
        set(d);
        emit('craft', id);
      },

      // 设备开关：▶️ 运行中 / ⏸️ 已停。默认关停，玩家手动切换
      toggleDevice: (id) => {
        const s = get();
        if ((s.devices[id] ?? 0) <= 0) return; // 没造的设备不可切换
        const d = draft(s);
        d.deviceEnabled[id] = !d.deviceEnabled[id];
        set(d);
      },

      // 运行时 UI 标记（不持久化）：抽屉打开时挂起全屏揭晓
      setUiBusy: (b) => {
        if (get().uiBusy === b) return;
        set({ uiBusy: b });
      },

      // 手动提炼：玩家强制跑一条配方（tier2 需提炼炉），输入足才生效
      refine: (recipeId) => {
        const s = get();
        const d = draft(s);
        if (manualRefine(d, recipeId)) set(d);
      },

      // 军火轰开离谱货（闭环高潮）：消一发对应军火 → force-open 离谱货 → 大爆闪 → 高概率变异
      useOrdnance: (parcelId) => {
        const s = get();
        const idx = s.backlog.findIndex((p) => p.id === parcelId);
        if (idx < 0) return;
        const p = s.backlog[idx];
        const need = p.requireOrdnance;
        if (!need) return; // 不是离谱货
        if ((s.ordnance[need] ?? 0) < 1) return; // 没有对应军火
        const out = newOut();
        const d = draft(s);
        // 消一发军火
        d.ordnance[need] = (d.ordnance[need] ?? 0) - 1;
        if (d.ordnance[need] <= 0) delete d.ordnance[need];
        // 离谱货离开积压区（腾出厂房空间）
        const [parcel] = d.backlog.splice(idx, 1);
        forceOpenWithOrdnance(d, parcel, liveRand, out);
        // 黑方碑：额外大额信誉奖励
        const absurd = ABSURD_MAP[Object.keys(ABSURD_MAP).find((k) => ABSURD_MAP[k].name === parcel.label) ?? ''];
        if (absurd?.id === 'a_monolith') d.reputation += MONOLITH_REPUTATION;
        checkAchievements(d, out);
        set(d);
        emitManual(out);
      },

      equipQuote: (id) => {
        const s = get();
        if (!s.quotes.includes(id) || s.equippedQuotes.includes(id)) return;
        if (s.equippedQuotes.length >= quoteSlots(s)) return;
        const d = draft(s);
        d.equippedQuotes.push(id);
        set(d);
      },

      unequipQuote: (id) => {
        const d = draft(get());
        d.equippedQuotes = d.equippedQuotes.filter((q) => q !== id);
        set(d);
      },

      markIntroSeen: () => set({ introSeen: true }),

      toggleAudio: () => {
        const s = get();
        set({ audioEnabled: !s.audioEnabled });
      },

      hardReset: () => {
        const fresh = initialState();
        for (let i = 0; i < 3; i++) fresh.queue.push(makeParcel(i === 0 ? 'envelope' : 'small', liveRand));
        refillBench(fresh);
        syncRuntimeFromLegacy(fresh);
        set({ ...fresh, offline: null });
      },

      dismissOffline: () => set({ offline: null }),
    }),
    {
      name: 'chaikuaidi-save',
      version: SAVE_VERSION,
      storage: createJSONStorage(safeStorage),
      migrate: (persistedState) => {
        return { ...initialState(), ...(persistedState as Partial<Store>) } as Store;
      },
      partialize: (s) => {
        const {
          offline, click, tick, buyUpgrade, buyTool, selectTool, upgradeTool, buyAutoSell, setAutoSell, sellItem,
          sellAllItems, buyBatch, buyLuggage, buyContainer, buyGiant, expandFactory, buyFromMerchant, dispatchMission, loadFromBacklog, dumpGroupToBelt,
          shelveToBacklog, buyPrestige, prestige, buyBlueprint, setTargetBlueprint, craftBlueprint,
          toggleDevice, setUiBusy, uiBusy,
          refine, useOrdnance,
          equipQuote, unequipQuote, markIntroSeen,
          toggleAudio, hardReset, dismissOffline, ...rest
        } = s as Store;
        void offline; void click; void tick; void buyUpgrade; void buyTool; void selectTool; void upgradeTool;
        void buyAutoSell;
        void setAutoSell; void sellItem; void sellAllItems; void buyBatch; void buyLuggage; void buyContainer; void buyPrestige;
        void buyGiant; void expandFactory;
        void buyFromMerchant; void dispatchMission; void loadFromBacklog; void dumpGroupToBelt; void shelveToBacklog;
        void prestige; void buyBlueprint; void setTargetBlueprint; void craftBlueprint;
        void toggleDevice; void setUiBusy; void uiBusy; // uiBusy 是运行时 UI 状态，不持久化
        void refine; void useOrdnance;
        void equipQuote; void unequipQuote; void markIntroSeen;
        void toggleAudio; void hardReset; void dismissOffline;
        return rest;
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // 旧存档兼容：新增字段默认值（在用到这些字段前先补齐）
        if (state.backlog === undefined) state.backlog = [];
        if (state.rage === undefined) state.rage = 0;
        if (state.revengeLeft === undefined) state.revengeLeft = 0;
        if (state.dazedUntil === undefined) state.dazedUntil = 0;
        if (state.mutations === undefined) state.mutations = [];
        if (state.dangerStreak === undefined) state.dangerStreak = 0;
        if (state.merchant === undefined) state.merchant = null;
        if (state.merchantNextAt === undefined) state.merchantNextAt = Date.now() + FIRST_VISIT_DELAY;
        if (state.blueprints === undefined) state.blueprints = [];
        if (state.targetBlueprint === undefined) state.targetBlueprint = null;
        if (state.devices === undefined) state.devices = {};
        if (state.deviceEnabled === undefined || typeof state.deviceEnabled !== 'object') state.deviceEnabled = {};
        if (state.deviceAccum === undefined) state.deviceAccum = {};
        if (state.ordnance === undefined) state.ordnance = {};
        if (state.factorySpace === undefined) state.factorySpace = FACTORY_BASE_SPACE;
        // 远征格式迁移：旧存档的 missions 是 {id,endsAt}[]（定时器制）；新制是现场拆解的 id[]。
        // 旧的进行中远征没有对应现场快递 → 直接清空（出勤队伍跟着旧机制跑路了）。
        if (!Array.isArray(state.missions)) state.missions = [];
        else if (state.missions.some((m: any) => m && typeof m === 'object')) {
          state.missions = (state.missions as any[]).filter((m) => typeof m === 'string');
        }
        if (state.doneMissions === undefined) state.doneMissions = [];
        if (state.boughtUniques === undefined) state.boughtUniques = [];
        if (!Array.isArray(state.recentLoot)) state.recentLoot = [];

        // id 计数器抬升，避免 key 冲突
        let maxId = 0;
        for (const p of [...state.workbench, ...state.queue, ...state.backlog]) maxId = Math.max(maxId, p.id);
        seedId(maxId);

        // 工具箱迁移：把任何旧的/非法的 currentTool 规范化，并保证 ownedTools 自洽。
        // 注意：不能用 `ownedTools === undefined` 做判据——zustand 会把存档浅合并到
        // 初始状态（ownedTools 已是 ['hand']），导致旧存档的迁移被跳过 → currentTool
        // 仍是 'electric' 等旧 id → TOOL_MAP[currentTool] 为 undefined → 白屏。
        {
          const TOOL_MIGRATE: Record<string, ToolId> = {
            nail: 'hand', hand: 'hand', key: 'cutter', cutter: 'cutter',
            scissors: 'crowbar', opener: 'chisel', electric: 'grinder',
            laser: 'laserrig', blackhole: 'blackhole',
          };
          const order = TOOLS.map((t) => t.id);
          // 1) currentTool 非法 → 映射到新体系
          if (!TOOL_MAP[state.currentTool as ToolId]) {
            state.currentTool = TOOL_MIGRATE[(state as any).currentTool] ?? 'hand';
          }
          // 2) ownedTools 缺失/为空/被浅合并成只剩 ['hand'] 但 currentTool 更高 → 重建
          const owned = Array.isArray(state.ownedTools) ? state.ownedTools : [];
          const upTo = order.indexOf(state.currentTool);
          const needRebuild = owned.length === 0 || order.indexOf(state.currentTool) > 0 && owned.length <= 1;
          let next = needRebuild ? order.slice(0, upTo + 1) : owned.slice();
          // 3) 过滤非法 id，保证含徒手与当前工具
          next = next.filter((t: any) => !!TOOL_MAP[t as ToolId]);
          if (!next.includes('hand')) next.unshift('hand');
          if (!next.includes(state.currentTool)) next.push(state.currentTool);
          state.ownedTools = next;
          if (!state.toolLevels || typeof state.toolLevels !== 'object') {
            state.toolLevels = {} as Record<ToolId, number>;
          }
        }

        // 旧存档的快递缺 material 字段则按尺寸回填
        for (const p of [...state.workbench, ...state.queue, ...state.backlog]) {
          if (p.material === undefined) p.material = PARCEL_MAP[p.size].material;
        }

        // 离线结算
        const now = Date.now();
        const elapsed = (now - (state.lastSeen ?? now)) / 1000;
        const d = draft(state);
        const res = settleOffline(d, elapsed, liveRand);
        d.lastSeen = now;
        // 若是全新存档（无任何快递）则补给起始快递
        if (d.workbench.length === 0 && d.queue.length === 0) {
          d.queue.push(makeParcel('envelope', liveRand));
          for (let i = 0; i < 2; i++) d.queue.push(makeParcel('small', liveRand));
          refillBench(d);
        }
        syncRuntimeFromLegacy(d);
        useGame.setState({ ...d, offline: res.opened > 0 || res.cash > 0 ? res : null });
      },
    },
  ),
);

/** 首次启动（无存档）补充起始快递 */
export function ensureStarter() {
  const s = useGame.getState();
  if (s.workbench.length === 0 && s.queue.length === 0) {
    const d = draft(s);
    d.queue.push(makeParcel('envelope', liveRand));
    for (let i = 0; i < 2; i++) d.queue.push(makeParcel('small', liveRand));
    refillBench(d);
    syncRuntimeFromLegacy(d);
    useGame.setState(d);
  }
}
