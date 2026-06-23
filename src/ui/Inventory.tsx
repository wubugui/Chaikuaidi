import { useState } from 'react';
import { AUTO_SELL_COST } from '../data/upgrades';
import { ITEM_MAP } from '../data/items';
import { ORDNANCE } from '../data/ordnance';
import { RARITIES, RARITY_ORDER } from '../data/rarity';
import { neededParts } from '../data/blueprints';
import { sellBonus } from '../game/compute';
import { useGame } from '../game/store';
import { sellValue } from '../game/systems/loot';
import type { ItemKind, Rarity } from '../data/types';
import { fmt, money } from '../lib/format';

const KIND_LABEL: Record<ItemKind, string> = {
  sellable: '可卖',
  material: '材料',
  collectible: '收藏品',
  quote: '语录',
  part: '零件',
  element: '元素',
};

/** 物品介绍弹窗：大 emoji + 名称 + 稀有度 + 类别 + 库存 + 售价/留货提示 + 效果行 + 卖出/关闭 */
function ItemDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const s = useGame();
  const sellItem = useGame((s) => s.sellItem);
  const it = ITEM_MAP[id];
  if (!it) return null;
  const r = RARITIES[it.rarity];
  const count = s.inventory[id] ?? 0;
  const unitVal = sellValue(it, it.rarity, sellBonus(s));
  const sellable = it.kind === 'sellable' || it.kind === 'material';
  const keepHint = it.kind === 'part' || it.kind === 'element';

  return (
    <div className="itemDetailBg" onClick={onClose}>
      <div className="itemDetail" style={{ borderColor: r.color }} onClick={(e) => e.stopPropagation()}>
        <button className="itemDetailClose" onClick={onClose}>✕</button>
        <div className="itemDetailEmoji" style={{ filter: `drop-shadow(0 0 14px ${r.color})` }}>{it.emoji}</div>
        <div className="itemDetailName">{it.name}</div>
        <div className="itemDetailBadges">
          <span className="itemRarityBadge" style={{ color: r.color, borderColor: r.color }}>
            {r.badge} {r.name}
          </span>
          <span className="itemKindBadge">{KIND_LABEL[it.kind]}</span>
        </div>

        <div className="itemDetailRows">
          <div className="itemDetailRow">
            <span>背包数量</span>
            <span className="idVal">×{fmt(count)}</span>
          </div>
          {it.kind === 'collectible' || it.kind === 'quote' ? (
            <div className="itemDetailRow">
              <span>回收价值</span>
              <span className="idVal idNote">图鉴/语录，不可直接卖</span>
            </div>
          ) : keepHint ? (
            <div className="itemDetailRow">
              <span>单件回收</span>
              <span className="idVal">¥{fmt(unitVal)} <span className="idNote">合成材料，建议保留</span></span>
            </div>
          ) : (
            <div className="itemDetailRow">
              <span>单件售价</span>
              <span className="idVal" style={{ color: r.color }}>¥{fmt(unitVal)}</span>
            </div>
          )}
          {it.kind === 'collectible' && it.passive && (
            <div className="itemDetailRow">
              <span>收藏效果</span>
              <span className="idVal idEffect">{it.passive.label}</span>
            </div>
          )}
          {it.kind === 'quote' && it.quote && (
            <div className="itemDetailRow itemDetailQuote">
              <span>语录</span>
              <span className="idVal">
                <span className="idEffect">{it.quote.label}</span>
                <span className="idQuoteText">「{it.quote.text}」</span>
              </span>
            </div>
          )}
        </div>

        <div className="itemDetailBtns">
          {sellable && (
            <button
              className="btn small primary"
              disabled={count <= 0}
              onClick={() => {
                sellItem(id);
                if ((useGame.getState().inventory[id] ?? 0) <= 0) onClose();
              }}
            >
              卖出一个（¥{fmt(unitVal)}）
            </button>
          )}
          <button className="btn small" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
}

export function Inventory() {
  const inventory = useGame((s) => s.inventory);
  const stage = useGame((s) => s.stage);
  const m = useGame((s) => s.money);
  const autoUnlocked = useGame((s) => s.autoSellUnlocked);
  const autoEnabled = useGame((s) => s.autoSellEnabled);
  const keepAbove = useGame((s) => s.autoSellKeepAbove);
  const recentLoot = useGame((s) => s.recentLoot) ?? [];
  const s = useGame();
  const sellItem = useGame((s) => s.sellItem);
  const sellAllItems = useGame((s) => s.sellAllItems);
  const buyAutoSell = useGame((s) => s.buyAutoSell);
  const setAutoSell = useGame((s) => s.setAutoSell);

  const [sellMode, setSellMode] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

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

  // 网格物品点击：卖出模式=卖一个；否则=看介绍
  const onGridClick = (id: string) => {
    if (sellMode) sellItem(id);
    else setDetailId(id);
  };

  const renderItem = (id: string) => {
    const it = ITEM_MAP[id];
    const r = RARITIES[it.rarity];
    const val = sellValue(it, it.rarity, sellBonus(s));
    const wanted = need.has(id);
    return (
      <button
        key={id}
        className={'invItem' + (wanted ? ' partNeeded' : '') + (sellMode ? ' sellModeItem' : '')}
        style={{ borderColor: r.color }}
        title={sellMode ? `点击卖出一个 ${it.name}（¥${fmt(val)}）` : `${it.name}（${r.name}）· 点击看介绍`}
        onClick={() => onGridClick(id)}
      >
        {wanted && <span className="partNeedBadge">✨</span>}
        {sellMode && <span className="sellHint">💰</span>}
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
      <div className={'invHead' + (sellMode ? ' invHeadSell' : '')}>
        <span className="invTitle">🎒 背包</span>
        <span className="invTotal">合计 {money(totalValue)}</span>
        <label className={'switch sellModeSwitch' + (sellMode ? ' on' : '')}>
          <input type="checkbox" checked={sellMode} onChange={(e) => setSellMode(e.target.checked)} />
          卖出模式
        </label>
        <button className="btn small primary" disabled={ids.length === 0} onClick={() => sellAllItems(null)}>
          一键全卖
        </button>
      </div>

      {sellMode && <div className="sellModeNote">💰 卖出模式：点击物品即卖出一个。点掉「卖出模式」可恢复看介绍。</div>}

      {recentLoot.length > 0 && (
        <div className="recentLoot">
          <div className="recentLootTitle">✨ 最近获得 <span className="invGroupHint">稀有+ 战利品集中区（点击看介绍）</span></div>
          <div className="recentLootRow">
            {recentLoot.map((e, i) => {
              const it = ITEM_MAP[e.itemId];
              if (!it) return null;
              const r = RARITIES[e.rarity];
              return (
                <button
                  key={i}
                  className="recentChip"
                  style={{ borderColor: r.color }}
                  title={`${it.name}（${r.name}）· 点击看介绍`}
                  onClick={() => setDetailId(e.itemId)}
                >
                  <span className="recentChipEmoji">{it.emoji}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

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

      {detailId && <ItemDetail id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}
