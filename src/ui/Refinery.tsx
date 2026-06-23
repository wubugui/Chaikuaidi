import { ITEM_MAP, ELEMENTS } from '../data/items';
import { REFINES, REFINE_INTERVAL, REFINERY_DEVICE } from '../data/refine';
import { useGame } from '../game/store';
import { fmt } from '../lib/format';

export function Refinery() {
  const inventory = useGame((st) => st.inventory);
  const devices = useGame((st) => st.devices);
  const refine = useGame((st) => st.refine);

  const refineryCount = devices[REFINERY_DEVICE] ?? 0;
  const hasRefinery = refineryCount > 0;
  const per = refineryCount > 0 ? (REFINE_INTERVAL / refineryCount).toFixed(1) : null;

  const canRun = (inputs: { item: string; qty: number }[]) =>
    inputs.every((inp) => (inventory[inp.item] ?? 0) >= inp.qty);

  return (
    <div className="refineryPanel">
      <p className="shopHint">
        把巨型货拆出来的原料/零件精炼成 🧪 元素——元素再去 🔧 工坊造核弹/EMP/轨道炮。建一座 🧪 提炼炉（在工坊合成）就能自动刷元素，高级元素（稀土/浓缩铀）也得靠它。
      </p>

      {/* 提炼炉状态 */}
      <div className="refineryStatus">
        {hasRefinery ? (
          <span>🧪 提炼炉 ×{refineryCount} 运转中：每 ~{per}s 自动精炼一炉（优先初级，再高级）</span>
        ) : (
          <span className="giantNeedPipe">还没建提炼炉——去 🔧 工坊合成「提炼炉」可自动刷元素 + 解锁高级配方</span>
        )}
      </div>

      {/* 元素库存 */}
      <h3 className="shopSecTitle">🧪 元素库存</h3>
      <div className="elemInvGrid">
        {ELEMENTS.map((e) => (
          <div className="elemChip" key={e.id} title={e.name}>
            <span className="elemEmoji">{e.emoji}</span>
            <span className="elemName">{e.name}</span>
            <span className="elemCount">×{fmt(inventory[e.id] ?? 0)}</span>
          </div>
        ))}
      </div>

      {/* 提炼配方 */}
      <h3 className="shopSecTitle">⚗️ 提炼配方</h3>
      <div className="refineList">
        {REFINES.map((rc) => {
          const out = ITEM_MAP[rc.output.item];
          const tier2Locked = rc.tier === 2 && !hasRefinery;
          const enough = canRun(rc.inputs);
          const disabled = tier2Locked || !enough;
          return (
            <div className={'refineRow' + (rc.tier === 2 ? ' tier2' : '')} key={rc.id}>
              <div className="refineInfo">
                <div className="refineName">
                  {rc.name}
                  {rc.tier === 2 && <span className="tier2Tag">高级</span>}
                </div>
                <div className="refineFlow">
                  {rc.inputs.map((inp) => {
                    const it = ITEM_MAP[inp.item];
                    const have = inventory[inp.item] ?? 0;
                    const met = have >= inp.qty;
                    return (
                      <span key={inp.item} className={'refineReq' + (met ? ' met' : ' unmet')} title={it?.name}>
                        {it?.emoji ?? '❓'} {have}/{inp.qty}
                      </span>
                    );
                  })}
                  <span className="refineArrow">→</span>
                  <span className="refineOut">{out?.emoji} {out?.name} ×{rc.output.qty}</span>
                </div>
              </div>
              <div className="refineActions">
                <button className="btn small primary" disabled={disabled} onClick={() => refine(rc.id)}>
                  提炼
                </button>
                {tier2Locked && <span className="benchFullHint">需要提炼炉</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
