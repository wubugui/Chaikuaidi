import { COLLECTIBLES } from '../data/items';
import { RARITIES } from '../data/rarity';
import { useGame } from '../game/store';

export function Collection() {
  const collection = useGame((s) => s.collection);
  const owned = new Set(collection);

  return (
    <div className="collection">
      <p className="collHint">
        收藏品图鉴 · {owned.size}/{COLLECTIBLES.length}
        {owned.size === COLLECTIBLES.length && COLLECTIBLES.length > 0 && ' 🎉 已集齐！'}
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
              <div className="collEmoji">{has ? c.emoji : '❔'}</div>
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
