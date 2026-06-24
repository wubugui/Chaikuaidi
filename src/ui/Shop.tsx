import { BATCHES, CONTAINERS, LUGGAGE } from '../data/shop';
import { MATERIALS } from '../data/materials';
import { MUTATION_MAP } from '../data/mutations';
import { PARCEL_MAP } from '../data/parcels';
import { useGame } from '../game/store';
import { money } from '../lib/format';
import { GameIcon } from './GameIcon';

export function Shop() {
  const m = useGame((s) => s.money);
  const stage = useGame((s) => s.stage);
  const buyBatch = useGame((s) => s.buyBatch);
  const buyLuggage = useGame((s) => s.buyLuggage);
  const buyContainer = useGame((s) => s.buyContainer);

  return (
    <div className="shop">
      <p className="shopHint">花钱进货，不同批次稀有度倾向不同——开箱赌一把好运气。</p>
      {BATCHES.map((b) => {
        const locked = stage < b.unlockStage;
        return (
          <div className={'batch' + (locked ? ' locked' : '')} key={b.id}>
            <GameIcon className="batchEmoji" kind="shop" id={b.id} name={b.name} emoji={b.emoji} />
            <div className="batchInfo">
              <div className="batchName">{b.name}</div>
              <div className="batchDesc">
                {b.desc} · {b.count} 件 · {b.sizes.map((s) => PARCEL_MAP[s].name).join('/')}
              </div>
            </div>
            {locked ? (
              <div className="batchLock"><GameIcon kind="ui" id="lock" className="tinyIcon" />阶段{b.unlockStage}</div>
            ) : (
              <button className="btn buy" disabled={m < b.price} onClick={() => buyBatch(b.id)}>
                进货<span className="cost">{money(b.price)}</span>
              </button>
            )}
          </div>
        );
      })}

      <div className="luggageSec">
        <h3 className="shopSecTitle"><GameIcon kind="shop" id="lug_woman" className="inlineIcon" />神秘行李</h3>
        <p className="shopHint">来路不明的行李，每件都有自己的故事——和一池子专属掉落。</p>
        {LUGGAGE.map((l) => {
          const locked = stage < l.unlockStage;
          return (
            <div className={'luggage' + (locked ? ' locked' : '')} key={l.id}>
              <GameIcon className="batchEmoji" kind="shop" id={l.id} name={l.name} emoji={l.emoji} />
              <div className="batchInfo">
                <div className="batchName">{l.name}</div>
                <div className="luggageFlavor">{l.flavor}</div>
              </div>
              {locked ? (
                <div className="batchLock"><GameIcon kind="ui" id="lock" className="tinyIcon" />阶段{l.unlockStage}</div>
              ) : (
                <button className="btn buy" disabled={m < l.price} onClick={() => buyLuggage(l.id)}>
                  撬开<span className="cost">{money(l.price)}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="containerSec">
        <h3 className="shopSecTitle"><GameIcon kind="ui" id="logo" className="inlineIcon" />特殊货柜</h3>
        <p className="shopHint">需要对的材质工具才撬得动，危险品用错家伙会炸。最稀缺的几样只在黑市商人到访时才有货。</p>
        {CONTAINERS.filter((c) => !c.merchantOnly).map((c) => {
          const locked = stage < c.unlockStage;
          const mat = MATERIALS[c.material];
          const mut = c.requireMutation ? MUTATION_MAP[c.requireMutation] : null;
          return (
            <div className={'containerCard' + (locked ? ' locked' : '')} key={c.id}>
              <GameIcon className="batchEmoji" kind="shop" id={c.id} name={c.name} emoji={c.emoji} />
              <div className="batchInfo">
                <div className="batchName">
                  {c.name}
                  {c.danger && <span className="dangerTag"><GameIcon kind="ui" id="danger" className="tinyIcon" />危险品</span>}
                  {mut && (
                    <span className="mutTag">
                      <GameIcon kind="ui" id="mutation" className="tinyIcon" />
                      需要变异：<GameIcon kind="mutation" id={mut.id} name={mut.name} emoji={mut.emoji} className="tinyIcon" />{mut.name}
                    </span>
                  )}
                </div>
                <div className="luggageFlavor">{c.flavor}</div>
                <span className="matBadge" style={{ background: mat.color + '33', borderColor: mat.color }}>
                  <GameIcon kind="material" id={mat.id} name={mat.name} emoji={mat.emoji} />
                  {mat.name}
                </span>
              </div>
              {locked ? (
                <div className="batchLock"><GameIcon kind="ui" id="lock" className="tinyIcon" />阶段{c.unlockStage}</div>
              ) : (
                <button className="btn buy" disabled={m < c.price} onClick={() => buyContainer(c.id)}>
                  撬开<span className="cost">{money(c.price)}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
