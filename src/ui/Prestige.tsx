import { useState } from 'react';
import { PRESTIGE_NODES, prestigeNodeCost, reputationFor } from '../data/prestige';
import { useGame } from '../game/store';
import { fmt, money } from '../lib/format';
import { GameIcon } from './GameIcon';

export function Prestige() {
  const rep = useGame((s) => s.reputation);
  const runEarned = useGame((s) => s.runEarned);
  const tree = useGame((s) => s.prestigeTree);
  const doPrestige = useGame((s) => s.prestige);
  const buyPrestige = useGame((s) => s.buyPrestige);
  const [confirm, setConfirm] = useState(false);

  const gain = reputationFor(runEarned);

  return (
    <div className="prestige">
      <div className="prestHeader">
        <p>
          跑路重开：清空本轮进度（保留图鉴/成就/转生加成），按本轮收入换取 <b>信誉</b>，
          用于永久加成，让下一轮开局就更爽。
        </p>
        <div className="prestGain">
          本轮可得：<b><GameIcon kind="ui" id="reputation" className="tinyIcon" /> {fmt(gain)}</b>
          <span className="prestEarned">（本轮收入 {money(runEarned)}）</span>
        </div>
        {confirm ? (
          <div className="prestConfirm">
            确定跑路重开？
            <button className="btn small danger" onClick={() => { doPrestige(); setConfirm(false); }} disabled={gain <= 0}>
              确定
            </button>
            <button className="btn small" onClick={() => setConfirm(false)}>取消</button>
          </div>
        ) : (
          <button className="btn primary prestBtn" disabled={gain <= 0} onClick={() => setConfirm(true)}>
            <GameIcon kind="ui" id="prestige" className="tinyIcon" />跑路重开（+{fmt(gain)}）
          </button>
        )}
      </div>

      <div className="prestRep">当前信誉：<GameIcon kind="ui" id="reputation" className="tinyIcon" /> {fmt(rep)}</div>

      <div className="prestTree">
        {PRESTIGE_NODES.map((n) => {
          const lvl = tree[n.id] ?? 0;
          const maxed = n.maxLevel > 0 && lvl >= n.maxLevel;
          const cost = prestigeNodeCost(n, lvl);
          return (
            <div className="prestNode" key={n.id}>
              <div className="prestMain">
                <GameIcon className="prestEmoji" kind="prestige" id={n.id} name={n.name} emoji={n.emoji} />
                <div className="prestInfo">
                  <div className="prestName">
                    {n.name} <span className="prestLvl">Lv.{lvl}{n.maxLevel > 0 ? `/${n.maxLevel}` : ''}</span>
                  </div>
                  <div className="prestDesc">{n.desc}</div>
                </div>
              </div>
              {maxed ? (
                <div className="upMax">MAX</div>
              ) : (
                <button className="btn buy" disabled={rep < cost} onClick={() => buyPrestige(n.id)}>
                  <span className="cost"><GameIcon kind="ui" id="reputation" className="tinyIcon" />{fmt(cost)}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
