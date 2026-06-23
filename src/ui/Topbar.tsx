import { useState } from 'react';
import { STAGES } from '../data/stages';
import { useGame } from '../game/store';
import { fmt, money } from '../lib/format';

export function Topbar() {
  const m = useGame((s) => s.money);
  const rep = useGame((s) => s.reputation);
  const stage = useGame((s) => s.stage);
  const audio = useGame((s) => s.audioEnabled);
  const toggleAudio = useGame((s) => s.toggleAudio);
  const hardReset = useGame((s) => s.hardReset);
  const [confirm, setConfirm] = useState(false);

  const stageDef = STAGES[stage - 1];
  const next = STAGES[stage];

  return (
    <header className="topbar">
      <div className="brand">📦 拆快递</div>
      <div className="stats">
        <div className="stat money">
          <span className="statLabel">现金</span>
          <span className="statVal">{money(m)}</span>
        </div>
        {rep > 0 && (
          <div className="stat rep">
            <span className="statLabel">信誉</span>
            <span className="statVal">⭐{fmt(rep)}</span>
          </div>
        )}
        <div className="stat stage" title={stageDef.unlocks}>
          <span className="statLabel">阶段</span>
          <span className="statVal">
            {stageDef.emoji} {stageDef.name}
            {next ? <span className="next">→ ¥{fmt(next.threshold)}</span> : ''}
          </span>
        </div>
      </div>
      <div className="topActions">
        <button className="iconBtn" onClick={toggleAudio} title="音效">
          {audio ? '🔊' : '🔇'}
        </button>
        {confirm ? (
          <span className="resetConfirm">
            确定?
            <button className="iconBtn danger" onClick={() => { hardReset(); setConfirm(false); }}>是</button>
            <button className="iconBtn" onClick={() => setConfirm(false)}>否</button>
          </span>
        ) : (
          <button className="iconBtn" onClick={() => setConfirm(true)} title="重开存档">🗑️</button>
        )}
      </div>
    </header>
  );
}
