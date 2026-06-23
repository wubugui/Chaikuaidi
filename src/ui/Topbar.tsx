import { useState } from 'react';
import { STAGES } from '../data/stages';
import { useGame } from '../game/store';
import { fmt, money } from '../lib/format';

export function Topbar() {
  const m = useGame((s) => s.money);
  const rep = useGame((s) => s.reputation);
  const stage = useGame((s) => s.stage);
  const runEarned = useGame((s) => s.runEarned);
  const audio = useGame((s) => s.audioEnabled);
  const toggleAudio = useGame((s) => s.toggleAudio);
  const hardReset = useGame((s) => s.hardReset);
  const [confirm, setConfirm] = useState(false);

  const stageDef = STAGES[stage - 1];
  const next = STAGES[stage];
  const from = stageDef.threshold;
  const to = next ? next.threshold : from;
  const pct = next ? Math.min(100, Math.max(0, ((runEarned - from) / (to - from)) * 100)) : 100;

  return (
    <header className="hud">
      <div className="hudTop">
        <div className="logo">📦 拆快递</div>
        <div className="coins">
          <span className="coinIcon">🪙</span>
          <span className="coinVal">{money(m)}</span>
        </div>
        {rep > 0 && <div className="repChip">⭐{fmt(rep)}</div>}
        <div className="hudIcons">
          <button className="hudIcon" onClick={toggleAudio} title="音效">{audio ? '🔊' : '🔇'}</button>
          {confirm ? (
            <span className="resetConfirm">
              重开?
              <button className="hudIcon danger" onClick={() => { hardReset(); setConfirm(false); }}>✓</button>
              <button className="hudIcon" onClick={() => setConfirm(false)}>✕</button>
            </span>
          ) : (
            <button className="hudIcon" onClick={() => setConfirm(true)} title="重开存档">🗑️</button>
          )}
        </div>
      </div>
      <div className="stageBar" title={stageDef.unlocks}>
        <div className="stageFill" style={{ width: pct + '%' }} />
        <div className="stageText">
          <span>{stageDef.emoji} {stageDef.name}</span>
          {next ? <span className="stageNext">距「{next.name}」 {money(Math.max(0, to - runEarned))}</span> : <span className="stageNext">已封顶 👑</span>}
        </div>
      </div>
    </header>
  );
}
