import { AUTO_SELL_COST } from '../data/upgrades';
import { ITEM_MAP } from '../data/items';
import { RARITIES, RARITY_ORDER } from '../data/rarity';
import { sellBonus } from '../game/compute';
import { useGame } from '../game/store';
import { sellValue } from '../game/systems/loot';
import type { Rarity } from '../data/types';
import { fmt, money } from '../lib/format';

export function Inventory() {
  const inventory = useGame((s) => s.inventory);
  const stage = useGame((s) => s.stage);
  const m = useGame((s) => s.money);
  const autoUnlocked = useGame((s) => s.autoSellUnlocked);
  const autoEnabled = useGame((s) => s.autoSellEnabled);
  const keepAbove = useGame((s) => s.autoSellKeepAbove);
  const s = useGame();
  const sellItem = useGame((s) => s.sellItem);
  const sellAllItems = useGame((s) => s.sellAllItems);
  const buyAutoSell = useGame((s) => s.buyAutoSell);
  const setAutoSell = useGame((s) => s.setAutoSell);

  const ids = Object.keys(inventory).filter((id) => inventory[id] > 0);
  ids.sort((a, b) => {
    const ra = RARITY_ORDER.indexOf(ITEM_MAP[a].rarity);
    const rb = RARITY_ORDER.indexOf(ITEM_MAP[b].rarity);
    return rb - ra;
  });
  const totalValue = ids.reduce((sum, id) => sum + sellValue(ITEM_MAP[id], ITEM_MAP[id].rarity, sellBonus(s)) * inventory[id], 0);

  return (
    <div className="inventory">
      <div className="invHead">
        <span className="invTitle">🎒 背包</span>
        <span className="invTotal">合计 {money(totalValue)}</span>
        <button className="btn small primary" disabled={ids.length === 0} onClick={() => sellAllItems(null)}>
          一键全卖
        </button>
      </div>

      {stage >= 3 && (
        <div className="autoSell">
          {autoUnlocked ? (
            <>
              <label className="switch">
                <input type="checkbox" checked={autoEnabled} onChange={(e) => setAutoSell(e.target.checked, keepAbove)} />
                自动卖货
              </label>
              <span className="keepLabel">保留高于</span>
              <select
                value={keepAbove ?? ''}
                onChange={(e) => setAutoSell(autoEnabled, (e.target.value || null) as Rarity | null)}
              >
                <option value="">不保留</option>
                {RARITY_ORDER.slice(0, -1).map((r) => (
                  <option key={r} value={r}>
                    {RARITIES[r].name}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <button className="btn small" disabled={m < AUTO_SELL_COST} onClick={buyAutoSell}>
              解锁自动卖货 ({money(AUTO_SELL_COST)})
            </button>
          )}
        </div>
      )}

      <div className="invGrid">
        {ids.length === 0 && <div className="invEmpty">还没拆出可卖的东西～</div>}
        {ids.map((id) => {
          const it = ITEM_MAP[id];
          const r = RARITIES[it.rarity];
          const val = sellValue(it, it.rarity, sellBonus(s));
          return (
            <button
              key={id}
              className="invItem"
              style={{ borderColor: r.color }}
              title={`${it.name}（${r.name}）卖 ¥${fmt(val)}`}
              onClick={() => sellItem(id)}
            >
              <span className="invEmoji">{it.emoji}</span>
              <span className="invCount">×{fmt(inventory[id])}</span>
              <span className="invVal" style={{ color: r.color }}>
                ¥{fmt(val)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
