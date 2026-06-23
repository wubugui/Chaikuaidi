import { QUOTES } from '../data/quotes';
import { RARITIES } from '../data/rarity';
import { quoteSlots } from '../game/compute';
import { useGame } from '../game/store';

export function Quotes() {
  const owned = useGame((s) => s.quotes);
  const equipped = useGame((s) => s.equippedQuotes);
  const s = useGame();
  const equipQuote = useGame((s) => s.equipQuote);
  const unequipQuote = useGame((s) => s.unequipQuote);

  const ownedSet = new Set(owned);
  const equippedSet = new Set(equipped);
  const slots = quoteSlots(s);

  return (
    <div className="quotes">
      <p className="quotesHint">
        🗯️ 暴躁老哥语录 · 收集 {owned.length}/{QUOTES.length} · 装备槽 {equipped.length}/{slots}
      </p>
      <p className="quotesSub">骂得越凶，拆得越猛。装备语录吃加成（槽位靠转生「嘴遁扩容」扩展）。</p>
      <div className="quoteList">
        {QUOTES.map((q) => {
          const has = ownedSet.has(q.id);
          const isEq = equippedSet.has(q.id);
          const r = RARITIES[q.rarity];
          return (
            <div
              className={'quoteCard' + (has ? '' : ' locked') + (isEq ? ' equipped' : '')}
              key={q.id}
              style={has ? { borderColor: r.color } : undefined}
            >
              <div className="quoteTop">
                <span className="quoteRarity" style={{ color: r.color }}>{r.badge} {r.name}</span>
                {has && q.quote && <span className="quoteBonus">{q.quote.label}</span>}
              </div>
              <div className="quoteText">{has ? `「${q.quote?.text}」` : '「 ??? 还没拆到 ??? 」'}</div>
              {has && (
                isEq ? (
                  <button className="btn small" onClick={() => unequipQuote(q.id)}>卸下</button>
                ) : (
                  <button
                    className="btn small primary"
                    disabled={equipped.length >= slots}
                    onClick={() => equipQuote(q.id)}
                  >
                    装备
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
