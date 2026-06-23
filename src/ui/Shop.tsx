import { BATCHES } from '../data/shop';
import { PARCEL_MAP } from '../data/parcels';
import { useGame } from '../game/store';
import { money } from '../lib/format';

export function Shop() {
  const m = useGame((s) => s.money);
  const stage = useGame((s) => s.stage);
  const buyBatch = useGame((s) => s.buyBatch);

  return (
    <div className="shop">
      <p className="shopHint">花钱进货，不同批次稀有度倾向不同——开箱赌一把好运气。</p>
      {BATCHES.map((b) => {
        const locked = stage < b.unlockStage;
        return (
          <div className={'batch' + (locked ? ' locked' : '')} key={b.id}>
            <div className="batchEmoji">{b.emoji}</div>
            <div className="batchInfo">
              <div className="batchName">{b.name}</div>
              <div className="batchDesc">
                {b.desc} · {b.count} 件 · {b.sizes.map((s) => PARCEL_MAP[s].name).join('/')}
              </div>
            </div>
            {locked ? (
              <div className="batchLock">🔒 阶段{b.unlockStage}</div>
            ) : (
              <button className="btn buy" disabled={m < b.price} onClick={() => buyBatch(b.id)}>
                进货<span className="cost">{money(b.price)}</span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
