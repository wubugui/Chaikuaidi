import { AUTO_SELL_COST } from '../data/upgrades';
import { ITEM_MAP } from '../data/items';
import { ORDNANCE } from '../data/ordnance';
import { RARITIES, RARITY_ORDER } from '../data/rarity';
import { neededParts } from '../data/blueprints';
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

  const need = neededParts(s);

  const allIds = Object.keys(inventory).filter((id) => inventory[id] > 0);
  const byRarity = (a: string, b: string) =>
    RARITY_ORDER.indexOf(ITEM_MAP[b].rarity) - RARITY_ORDER.indexOf(ITEM_MAP[a].rarity);
  const partIds = allIds.filter((id) => ITEM_MAP[id].kind === 'part').sort(byRarity);
  const elemIds = allIds.filter((id) => ITEM_MAP[id].kind === 'element').sort(byRarity);
  const ids = allIds
    .filter((id) => ITEM_MAP[id].kind !== 'part' && ITEM_MAP[id].kind !== 'element')
    .sort(byRarity);
  const ordnance = s.ordnance ?? {};
  const ordIds = ORDNANCE.filter((o) => (ordnance[o.id] ?? 0) > 0);
  const totalValue = ids.reduce(
    (sum, id) => sum + sellValue(ITEM_MAP[id], ITEM_MAP[id].rarity, sellBonus(s)) * inventory[id],
    0,
  );

  const renderItem = (id: string) => {
    const it = ITEM_MAP[id];
    const r = RARITIES[it.rarity];
    const val = sellValue(it, it.rarity, sellBonus(s));
    const wanted = need.has(id);
    return (
      <button
        key={id}
        className={'invItem' + (wanted ? ' partNeeded' : '')}
        style={{ borderColor: r.color }}
        title={`${it.name}（${r.name}）卖 ¥${fmt(val)}${wanted ? ' · 目标图纸所需' : ''}`}
        onClick={() => sellItem(id)}
      >
        {wanted && <span className="partNeedBadge">✨</span>}
        <span className="invEmoji">{it.emoji}</span>
        <span className="invCount">×{fmt(inventory[id])}</span>
        <span className="invVal" style={{ color: r.color }}>
          ¥{fmt(val)}
        </span>
      </button>
    );
  };

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

      {ordIds.length > 0 && (
        <div className="invPartSec">
          <div className="invGroupTitle">💥 军火 <span className="invGroupHint">用来「轰开」离谱货（去厂房）</span></div>
          <div className="invGrid">
            {ordIds.map((o) => (
              <div key={o.id} className="invItem ordInvItem" title={`${o.name} · ${o.desc}`}>
                <span className="invEmoji">{o.emoji}</span>
                <span className="invCount">×{fmt(ordnance[o.id])}</span>
                <span className="invVal ordInvName">{o.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {elemIds.length > 0 && (
        <div className="invPartSec">
          <div className="invGroupTitle">🧪 元素 <span className="invGroupHint">提炼产物，造军火用，尽量别卖</span></div>
          <div className="invGrid">{elemIds.map(renderItem)}</div>
        </div>
      )}

      {partIds.length > 0 && (
        <div className="invPartSec">
          <div className="invGroupTitle">🔩 零件 <span className="invGroupHint">合成设备/工具用，尽量别卖</span></div>
          <div className="invGrid">{partIds.map(renderItem)}</div>
        </div>
      )}

      <div className="invGrid">
        {ids.length === 0 && partIds.length === 0 && elemIds.length === 0 && <div className="invEmpty">还没拆出可卖的东西～</div>}
        {ids.map(renderItem)}
      </div>
    </div>
  );
}
