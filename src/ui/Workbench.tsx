import { useEffect, useRef, useState } from 'react';
import { barkFor, BARKS_LUCKY } from '../data/barks';
import { PARCEL_MAP } from '../data/parcels';
import { TOOL_MAP } from '../data/tools';
import { autoPower, benchCapacity, clickCooldown, clickPowerBase, comboMult } from '../game/compute';
import { on } from '../game/events';
import { useGame } from '../game/store';
import { fmt } from '../lib/format';

interface Float {
  id: number;
  x: number;
  y: number;
  text: string;
}

let fid = 1;

function rageFace(combo: number): string {
  if (combo >= 50) return '😈';
  if (combo >= 20) return '🤬';
  if (combo >= 8) return '😤';
  if (combo >= 1) return '😠';
  return '😐';
}

export function Workbench() {
  const workbench = useGame((s) => s.workbench);
  const queueLen = useGame((s) => s.queue.length);
  const combo = useGame((s) => s.combo);
  const currentTool = useGame((s) => s.currentTool);
  const click = useGame((s) => s.click);

  const s = useGame();
  const cPower = clickPowerBase(s);
  const aPower = autoPower(s);
  const cap = benchCapacity(s);
  const cMult = comboMult(s);

  const [floats, setFloats] = useState<Float[]>([]);
  const [bark, setBark] = useState<{ id: number; text: string } | null>(null);
  const [swing, setSwing] = useState(0);
  const holdRef = useRef<number | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const lastBarkRef = useRef(0);

  // 拆出稀有物时，老哥惊呼
  useEffect(() => {
    return on('loot', (b) => {
      if (b.rarity === 'legendary' || b.rarity === 'absurd') {
        const text = BARKS_LUCKY[Math.floor(Math.random() * BARKS_LUCKY.length)];
        setBark({ id: fid++, text });
      }
    });
  }, []);

  const maybeBark = () => {
    const now = performance.now();
    if (now - lastBarkRef.current < 380) return;
    if (Math.random() > 0.5) return;
    lastBarkRef.current = now;
    const pool = barkFor(useGame.getState().combo);
    setBark({ id: fid++, text: pool[Math.floor(Math.random() * pool.length)] });
  };

  const spawnFloat = (clientX: number, clientY: number) => {
    const rect = areaRef.current?.getBoundingClientRect();
    const x = rect ? clientX - rect.left : 50;
    const y = rect ? clientY - rect.top : 50;
    const id = fid++;
    const st = useGame.getState();
    const dmg = clickPowerBase(st) * comboMult(st);
    setFloats((f) => [...f.slice(-12), { id, x, y, text: '-' + fmt(dmg) }]);
    setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 700);
  };

  const doOne = (clientX: number, clientY: number) => {
    click();
    setSwing((v) => v + 1);
    spawnFloat(clientX, clientY);
    maybeBark();
  };

  const startHold = (e: React.PointerEvent) => {
    e.preventDefault();
    doOne(e.clientX, e.clientY);
    const loop = () => {
      doOne(e.clientX, e.clientY);
      holdRef.current = window.setTimeout(loop, clickCooldown(useGame.getState()));
    };
    holdRef.current = window.setTimeout(loop, clickCooldown(useGame.getState()));
  };
  const endHold = () => {
    if (holdRef.current) {
      clearTimeout(holdRef.current);
      holdRef.current = null;
    }
  };
  useEffect(() => () => endHold(), []);

  // 气泡自动消失
  useEffect(() => {
    if (!bark) return;
    const t = setTimeout(() => setBark((b) => (b?.id === bark.id ? null : b)), 1300);
    return () => clearTimeout(t);
  }, [bark]);

  const tool = TOOL_MAP[currentTool];

  return (
    <div className="workbench">
      <div className="benchHead">
        <div className="benchTitle">🏚️ 废弃快递收容站</div>
        <div className="benchMeta">
          <span title="单次点击拆解值（不含连击）">💪 {fmt(cPower)}</span>
          {aPower > 0 && <span title="每秒自动拆解">🤖 {fmt(aPower)}/s</span>}
          <span title="同时处理上限">📦 {workbench.length}/{cap}</span>
          <span title="到货队列">📥 {queueLen}</span>
        </div>
      </div>

      <div
        className={'benchArea' + (combo >= 20 ? ' rage' : combo >= 8 ? ' hot' : '')}
        ref={areaRef}
        onPointerDown={startHold}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        onPointerCancel={endHold}
      >
        {/* 暴躁老哥 */}
        <div className="dude">
          {bark && (
            <div className="barkBubble" key={bark.id}>
              {bark.text}
            </div>
          )}
          <div className={'dudeFace' + (combo >= 20 ? ' shaking' : '')} key={swing % 2}>
            {rageFace(combo)}
          </div>
          <div className="dudeTool" title={tool.name}>
            {tool.emoji} {tool.name}
          </div>
        </div>

        {/* 快递们 */}
        {workbench.length === 0 ? (
          <div className="benchEmpty">📭 暂时没货……<br />（按住这里继续拆，新快递马上到）</div>
        ) : (
          <div className="parcels">
            {workbench.map((p) => {
              const pct = Math.max(0, (p.sealHP / p.sealMax) * 100);
              return (
                <div className="parcel" key={p.id}>
                  <div className="parcelEmoji">{p.emoji}</div>
                  <div className="parcelName">{PARCEL_MAP[p.size].name}</div>
                  <div className="hpBar">
                    <div className="hpFill" style={{ width: pct + '%' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {combo > 1 && (
          <div className={'combo' + (combo >= 50 ? ' c3' : combo >= 20 ? ' c2' : combo >= 8 ? ' c1' : '')}>
            <span className="comboNum">{combo}</span>
            <span className="comboX">连击 ×{cMult.toFixed(2)}</span>
          </div>
        )}

        {floats.map((f) => (
          <span className="dmgFloat" key={f.id} style={{ left: f.x, top: f.y }}>
            {f.text}
          </span>
        ))}

        <div className="benchHint">👆 按住疯狂拆 · 拆得越快越爽</div>
      </div>
    </div>
  );
}
