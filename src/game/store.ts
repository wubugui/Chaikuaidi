import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ACHIEVEMENTS } from '../data/achievements';
import { BATCHES, LUGGAGE } from '../data/shop';
import { COLLECTION_TOTAL } from '../data/items';
import { PRESTIGE_MAP, prestigeNodeCost, reputationFor } from '../data/prestige';
import { rarityRank } from '../data/rarity';
import { nextTool } from '../data/tools';
import { AUTO_SELL_COST, UPGRADE_MAP, upgradeBulkCost } from '../data/upgrades';
import type { Rarity } from '../data/types';
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
  buyTool: () => void;
  buyAutoSell: () => void;
  setAutoSell: (enabled: boolean, keepAbove: Rarity | null) => void;
  sellItem: (id: string) => void;
  sellAllItems: (keepAbove?: Rarity | null) => void;
  buyBatch: (batchId: string) => void;
  buyLuggage: (id: string) => void;
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
  if (out.shake) emit('shake');
  for (const r of out.reveals) {
    r.manual = true;
    emit('reveal', r);
  }
}

/** 自动拆：战利品流（飞图标 + 音效），只有稀有以上才弹特写 */
function emitAuto(out: EngineOut) {
  for (const b of out.bursts) emit('loot', b);
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

      buyTool: () => {
        const s = get();
        const nt = nextTool(s.currentTool);
        if (!nt || s.money < nt.cost) return;
        const d = draft(s);
        d.money -= nt.cost;
        d.currentTool = nt.id;
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
          offline, click, tick, buyUpgrade, buyTool, buyAutoSell, setAutoSell, sellItem,
          sellAllItems, buyBatch, buyLuggage, buyPrestige, prestige, equipQuote, unequipQuote, markIntroSeen,
          toggleAudio, hardReset, dismissOffline, ...rest
        } = s as Store;
        void offline; void click; void tick; void buyUpgrade; void buyTool; void buyAutoSell;
        void setAutoSell; void sellItem; void sellAllItems; void buyBatch; void buyLuggage; void buyPrestige;
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
