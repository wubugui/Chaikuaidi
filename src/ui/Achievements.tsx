import { ACHIEVEMENTS } from '../data/achievements';
import { useGame } from '../game/store';
import { money } from '../lib/format';
import { GameIcon } from './GameIcon';

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
              {has ? (
                <GameIcon className="achEmoji" kind="achievement" id={a.id} name={a.name} emoji={a.emoji} />
              ) : (
                <GameIcon className="achEmoji" kind="ui" id="lock" />
              )}
              <div className="achText">
                <div className="achName">{a.name}</div>
                <div className="achDesc">{a.desc}</div>
              </div>
              <div className="achReward">{has ? <GameIcon kind="ui" id="check" className="tinyIcon" /> : '+' + money(a.reward)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
