import { COLLECTIBLES } from '../data/items';
import { RARITIES } from '../data/rarity';
import { useGame } from '../game/store';
import { GameIcon } from './GameIcon';

export function Collection() {
  const collection = useGame((s) => s.collection);
  const owned = new Set(collection);

  return (
    <div className="collection">
      <p className="collHint">
        收藏品图鉴 · {owned.size}/{COLLECTIBLES.length}
        {owned.size === COLLECTIBLES.length && COLLECTIBLES.length > 0 && (
          <> <GameIcon kind="ui" id="achievement" className="tinyIcon" />已集齐！</>
        )}
      </p>
      <div className="collGrid">
        {COLLECTIBLES.map((c) => {
          const has = owned.has(c.id);
          const r = RARITIES[c.rarity];
          return (
            <div
              className={'collItem' + (has ? '' : ' locked')}
              key={c.id}
              style={has ? { borderColor: r.color, boxShadow: `0 0 12px ${r.color}66` } : undefined}
            >
              <div>
                {has ? (
                  <GameIcon className="collEmoji" kind="item" id={c.id} name={c.name} emoji={c.emoji} />
                ) : (
                  <GameIcon className="collEmoji" kind="ui" id="unknown" />
                )}
              </div>
              <div className="collName">{has ? c.name : '???'}</div>
              {has && (
                <>
                  <div className="collRarity" style={{ color: r.color }}>
                    {r.badge} {r.name}
                  </div>
                  {c.passive && <div className="collPassive">{c.passive.label}</div>}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
