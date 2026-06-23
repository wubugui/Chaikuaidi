import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ACHIEVEMENTS } from '../data/achievements';
import { BATCHES, CONTAINERS, LUGGAGE } from '../data/shop';
import { COLLECTION_TOTAL } from '../data/items';
import { PRESTIGE_MAP, prestigeNodeCost, reputationFor } from '../data/prestige';
import { rarityRank } from '../data/rarity';
import { PARCEL_MAP } from '../data/parcels';
import { TOOL_MAP, TOOLS, toolUpgradeCost } from '../data/tools';
import { AUTO_SELL_COST, UPGRADE_MAP, upgradeBulkCost } from '../data/upgrades';
import type { Rarity, ToolId } from '../data/types';
import { emit, seedId } from './events';
import {
  doClick,
  doTick,
  makeParcel,
  newOut,
  refillBench,
  sellAll as engineSellAll,
  sellOne as engineSellOne,
  type EngineOut,
} from './engine';
import { quoteSlots } from './compute';
import { settleOffline, type OfflineResult } from './systems/offline';
import { initialState, type GameState } from './state';

const liveRand = () => Math.random();

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
  buyPrestige: (id: string) => void;
  prestige: () => void;
  equipQuote: (id: string) => void;
  unequipQuote: (id: string) => void;
  markIntroSeen: () => void;
  toggleAudio: () => void;
  hardReset: () => void;
  dismissOffline: () => void;
}

type Store = GameState & Actions & { offline: OfflineResult | null };

/** 生成一个可变草稿（顶层与会变动的集合都用新引用） */
function draft(s: GameState): GameState {
  return {
    ...s,
    workbench: s.workbench.map((p) => ({ ...p })),
    queue: s.queue.slice(),
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
  };
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

      buyBatch: (batchId) => {
        const s = get();
        const b = BATCHES.find((x) => x.id === batchId);
        if (!b || s.money < b.price) return;
        const d = draft(s);
        d.money -= b.price;
        for (let i = 0; i < b.count; i++) {
          const size = b.sizes[Math.floor(liveRand() * b.sizes.length)];
          d.queue.push(makeParcel(size, liveRand));
        }
        refillBench(d);
        set(d);
      },

      buyLuggage: (id) => {
        const s = get();
        const lug = LUGGAGE.find((x) => x.id === id);
        if (!lug || s.money < lug.price) return;
        const d = draft(s);
        d.money -= lug.price;
        d.queue.push(
          makeParcel(lug.baseSize, liveRand, {
            emoji: lug.emoji, label: lug.name, sealMax: lug.sealMax,
            lootMin: lug.lootMin, lootMax: lug.lootMax, luckBonus: lug.luckBonus, pool: lug.pool,
          }),
        );
        refillBench(d);
        set(d);
      },

      buyContainer: (id) => {
        const s = get();
        const c = CONTAINERS.find((x) => x.id === id);
        if (!c || s.stage < c.unlockStage || s.money < c.price) return;
        const d = draft(s);
        d.money -= c.price;
        d.queue.push(
          makeParcel('crate', liveRand, {
            material: c.material, emoji: c.emoji, label: c.name, sealMax: c.sealMax,
            lootMin: c.lootMin, lootMax: c.lootMax, luckBonus: c.luckBonus, pool: c.pool,
            hollowChance: c.hollowChance, danger: c.danger, requireMutation: c.requireMutation,
          }),
        );
        refillBench(d);
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
        set({ ...fresh, offline: null });
      },

      dismissOffline: () => set({ offline: null }),
    }),
    {
      name: 'chaikuaidi-save',
      version: 1,
      storage: createJSONStorage(safeStorage),
      partialize: (s) => {
        const {
          offline, click, tick, buyUpgrade, buyTool, selectTool, upgradeTool, buyAutoSell, setAutoSell, sellItem,
          sellAllItems, buyBatch, buyLuggage, buyContainer, buyPrestige, prestige, equipQuote, unequipQuote, markIntroSeen,
          toggleAudio, hardReset, dismissOffline, ...rest
        } = s as Store;
        void offline; void click; void tick; void buyUpgrade; void buyTool; void selectTool; void upgradeTool;
        void buyAutoSell;
        void setAutoSell; void sellItem; void sellAllItems; void buyBatch; void buyLuggage; void buyContainer; void buyPrestige;
        void prestige; void equipQuote; void unequipQuote; void markIntroSeen;
        void toggleAudio; void hardReset; void dismissOffline;
        return rest;
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // id 计数器抬升，避免 key 冲突
        let maxId = 0;
        for (const p of [...state.workbench, ...state.queue]) maxId = Math.max(maxId, p.id);
        seedId(maxId);

        // 旧存档兼容：新增字段默认值
        if (state.rage === undefined) state.rage = 0;
        if (state.revengeLeft === undefined) state.revengeLeft = 0;
        if (state.dazedUntil === undefined) state.dazedUntil = 0;
        if (state.mutations === undefined) state.mutations = [];
        if (state.dangerStreak === undefined) state.dangerStreak = 0;

        // 工具箱迁移：旧存档为单线性工具，映射到新工具体系
        if (state.ownedTools === undefined) {
          const TOOL_MIGRATE: Record<string, ToolId> = {
            nail: 'hand', hand: 'hand', key: 'cutter', cutter: 'cutter',
            scissors: 'crowbar', opener: 'chisel', electric: 'grinder',
            laser: 'laserrig', blackhole: 'blackhole',
          };
          const mapped: ToolId = TOOL_MIGRATE[(state as any).currentTool] ?? 'hand';
          const order = TOOLS.map((t) => t.id);
          const upTo = order.indexOf(mapped);
          state.currentTool = mapped;
          state.toolLevels = {} as Record<ToolId, number>;
          state.ownedTools = order.slice(0, upTo + 1);
        }
        if (state.toolLevels === undefined) state.toolLevels = {} as Record<ToolId, number>;

        // 旧存档的快递缺 material 字段则按尺寸回填
        for (const p of [...state.workbench, ...state.queue]) {
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
    useGame.setState(d);
  }
}
