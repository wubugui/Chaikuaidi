import { ACHIEVEMENTS } from '../data/achievements';
import { useGame } from '../game/store';
import { money } from '../lib/format';

export function Achievements() {
  const achievements = useGame((s) => s.achievements);
  const got = new Set(achievements);

  return (
    <div className="achievements">
      <p className="achHint">
        成就 · {got.size}/{ACHIEVEMENTS.length}
      </p>
      <div className="achList">
        {ACHIEVEMENTS.map((a) => {
          const has = got.has(a.id);
          return (
            <div className={'achRow' + (has ? ' done' : '')} key={a.id}>
              <span className="achEmoji">{has ? a.emoji : '🔒'}</span>
              <div className="achText">
                <div className="achName">{a.name}</div>
                <div className="achDesc">{a.desc}</div>
              </div>
              <div className="achReward">{has ? '✅' : '+' + money(a.reward)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
