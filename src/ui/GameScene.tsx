import { useEffect, useRef, useState } from 'react';
import { barkFor, BARKS_LUCKY } from '../data/barks';
import { ITEM_MAP } from '../data/items';
import { PARCEL_MAP } from '../data/parcels';
import { TOOL_MAP } from '../data/tools';
import { autoPower, benchCapacity, clickCooldown, clickPowerBase, comboMult, sellBonus } from '../game/compute';
import { on } from '../game/events';
import { useGame } from '../game/store';
import { sellValue } from '../game/systems/loot';
import { sfxRip } from '../lib/audio';
import { fmt, money } from '../lib/format';

interface Particle { id: number; x: number; y: number; dx: number; dy: number; char: string; }
interface Dmg { id: number; x: number; y: number; text: string; big: boolean; }

let pid = 1;
const SCRAPS = ['✦', '✧', '🟫', '⬜', '📄', '💢'];

function rageFace(combo: number): string {
  if (combo >= 50) return '😈';
  if (combo >= 20) return '🤬';
  if (combo >= 8) return '😤';
  if (combo >= 1) return '😠';
  return '😐';
}

export function GameScene() {
  const workbench = useGame((s) => s.workbench);
  const queueLen = useGame((s) => s.queue.length);
  const combo = useGame((s) => s.combo);
  const currentTool = useGame((s) => s.currentTool);
  const inventory = useGame((s) => s.inventory);
  const click = useGame((s) => s.click);
  const sellAllItems = useGame((s) => s.sellAllItems);

  const s = useGame();
  const cPower = clickPowerBase(s);
  const aPower = autoPower(s);
  const cap = benchCapacity(s);
  const cMult = comboMult(s);

  const [particles, setParticles] = useState<Particle[]>([]);
  const [dmgs, setDmgs] = useState<Dmg[]>([]);
  const [bark, setBark] = useState<{ id: number; text: string } | null>(null);
  const [swing, setSwing] = useState(0);
  const holdRef = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const lastBarkRef = useRef(0);
  const pausedRef = useRef(false); // 开箱特写时暂停砸击
  const downRef = useRef(false); // 是否仍按住
  const ptrRef = useRef({ x: 0, y: 0 });

  // 背包总价值
  const invIds = Object.keys(inventory).filter((id) => inventory[id] > 0);
  const bagValue = invIds.reduce(
    (sum, id) => sum + sellValue(ITEM_MAP[id], ITEM_MAP[id].rarity, sellBonus(s)) * inventory[id],
    0,
  );

  // 拆出稀有时老哥惊呼
  useEffect(() => {
    return on('reveal', (r) => {
      if (r.topRarity === 'legendary' || r.topRarity === 'absurd') {
        setBark({ id: pid++, text: BARKS_LUCKY[Math.floor(Math.random() * BARKS_LUCKY.length)] });
      }
    });
  }, []);

  // 开箱特写时暂停砸击；特写结束若还按着则继续
  useEffect(() => {
    const offStart = on('revealStart', () => {
      pausedRef.current = true;
      if (holdRef.current) {
        clearTimeout(holdRef.current);
        holdRef.current = null;
      }
    });
    const offEnd = on('revealEnd', () => {
      pausedRef.current = false;
      if (downRef.current && holdRef.current === null) {
        runHold();
      }
    });
    return () => {
      offStart();
      offEnd();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!bark) return;
    const t = setTimeout(() => setBark((b) => (b?.id === bark.id ? null : b)), 1300);
    return () => clearTimeout(t);
  }, [bark]);

  const maybeBark = () => {
    const now = performance.now();
    if (now - lastBarkRef.current < 360) return;
    if (Math.random() > 0.55) return;
    lastBarkRef.current = now;
    const pool = barkFor(useGame.getState().combo);
    setBark({ id: pid++, text: pool[Math.floor(Math.random() * pool.length)] });
  };

  const spawnFx = (clientX: number, clientY: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    const x = rect ? clientX - rect.left : 120;
    const y = rect ? clientY - rect.top : 120;
    const st = useGame.getState();
    const dmg = clickPowerBase(st) * comboMult(st);
    const did = pid++;
    setDmgs((d) => [...d.slice(-10), { id: did, x, y, text: '-' + fmt(dmg), big: st.combo >= 15 }]);
    setTimeout(() => setDmgs((d) => d.filter((p) => p.id !== did)), 650);

    const n = 4 + Math.floor(Math.random() * 3);
    const next: Particle[] = [];
    for (let i = 0; i < n; i++) {
      next.push({
        id: pid++,
        x,
        y,
        dx: (Math.random() - 0.5) * 160,
        dy: -40 - Math.random() * 120,
        char: SCRAPS[Math.floor(Math.random() * SCRAPS.length)],
      });
    }
    setParticles((p) => [...p.slice(-40), ...next]);
    setTimeout(() => {
      const ids = new Set(next.map((p) => p.id));
      setParticles((p) => p.filter((x) => !ids.has(x.id)));
    }, 650);
  };

  const doOne = () => {
    if (pausedRef.current) return;
    click();
    setSwing((v) => v + 1);
    spawnFx(ptrRef.current.x, ptrRef.current.y);
    sfxRip();
    maybeBark();
  };

  const runHold = () => {
    if (pausedRef.current) return;
    doOne();
    holdRef.current = window.setTimeout(runHold, clickCooldown(useGame.getState()));
  };

  const startHold = (e: React.PointerEvent) => {
    e.preventDefault();
    downRef.current = true;
    ptrRef.current = { x: e.clientX, y: e.clientY };
    if (holdRef.current === null && !pausedRef.current) runHold();
  };
  const moveHold = (e: React.PointerEvent) => {
    if (downRef.current) ptrRef.current = { x: e.clientX, y: e.clientY };
  };
  const endHold = () => {
    downRef.current = false;
    if (holdRef.current) {
      clearTimeout(holdRef.current);
      holdRef.current = null;
    }
  };
  useEffect(() => () => endHold(), []);

  // 全局监听抬手：特写覆盖层在上面时也能正确停下连砸
  useEffect(() => {
    const up = () => {
      downRef.current = false;
      if (holdRef.current) {
        clearTimeout(holdRef.current);
        holdRef.current = null;
      }
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, []);

  const tool = TOOL_MAP[currentTool];
  const heat = combo >= 50 ? 'rage' : combo >= 20 ? 'hot' : combo >= 8 ? 'warm' : '';
  const n = workbench.length;
  const boxSize = n <= 1 ? 150 : n <= 2 ? 116 : n <= 4 ? 92 : n <= 6 ? 72 : 56;

  return (
    <div className={'scene ' + heat}>
      {/* 背景：仓库 + 箱山 */}
      <div className="sceneBg">
        <div className="hangLight" />
        <div className="boxMountain">{'📦'.repeat(14)}</div>
        <div className="floor" />
      </div>

      {/* 小标牌 */}
      <div className="sceneMeta">
        <span title="单次拆解（不含连击）">💪{fmt(cPower)}</span>
        {aPower > 0 && <span title="每秒自动拆解">🤖{fmt(aPower)}/s</span>}
        <span title="同时处理">📦{workbench.length}/{cap}</span>
        <span title="待拆队列">📥{queueLen}</span>
      </div>

      {/* 连击大表 */}
      {combo > 1 && (
        <div className={'comboBig ' + heat}>
          <div className="comboBigNum">{combo}</div>
          <div className="comboBigX">连击 ×{cMult.toFixed(2)}</div>
        </div>
      )}

      {/* 可点击的舞台 */}
      <div
        className="stage"
        ref={stageRef}
        onPointerDown={startHold}
        onPointerMove={moveHold}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        onPointerCancel={endHold}
      >
        {/* 快递（主角，放大居中） */}
        <div className="boxes">
          {workbench.length === 0 ? (
            <div className="boxesEmpty">📭 没货了……砸两下，新货马上到！</div>
          ) : (
            workbench.map((p) => {
              const pct = Math.max(0, (p.sealHP / p.sealMax) * 100);
              const dmgStage = pct < 34 ? ' d2' : pct < 67 ? ' d1' : '';
              return (
                <div className={'bigBox' + (pct < 100 ? ' hurt' : '') + dmgStage} key={p.id} style={{ width: boxSize * 1.15 }}>
                  <div className="bigBoxWrap">
                    <div className="bigBoxEmoji" key={swing} style={{ fontSize: boxSize }}>{p.emoji}</div>
                    {pct < 67 && <span className="crack c1">💢</span>}
                    {pct < 34 && <span className="crack c2">💥</span>}
                  </div>
                  <div className="bigBoxName">{PARCEL_MAP[p.size].name}</div>
                  <div className="bigHp"><div className="bigHpFill" style={{ width: pct + '%' }} /></div>
                </div>
              );
            })
          )}
        </div>

        {/* 暴躁老哥（站旁边念叨） */}
        <div className="dude side">
          {bark && <div className="bark" key={bark.id}>{bark.text}</div>}
          <div className={'dudeFace' + (combo >= 20 ? ' mad' : '')}>{rageFace(combo)}</div>
          <div className="dudeHand" key={swing % 1000}>{tool.emoji}</div>
          <div className="dudeName">{tool.name}</div>
        </div>

        {/* 粒子 */}
        {particles.map((p) => (
          <span
            className="scrap"
            key={p.id}
            style={{ left: p.x, top: p.y, ['--dx' as any]: p.dx + 'px', ['--dy' as any]: p.dy + 'px' }}
          >
            {p.char}
          </span>
        ))}
        {/* 伤害数字 */}
        {dmgs.map((d) => (
          <span className={'dmg' + (d.big ? ' big' : '')} key={d.id} style={{ left: d.x, top: d.y }}>
            {d.text}
          </span>
        ))}

        <div className="tapHint">👆 按住猛砸</div>
      </div>

      {/* 卖货条 */}
      <div className="sellBar">
        <div className="bagInfo">🎒 背包 <b>{money(bagValue)}</b></div>
        <button className="sellBtn" disabled={bagValue <= 0} onClick={() => sellAllItems(null)}>
          💰 全卖 {bagValue > 0 ? '+' + money(bagValue) : ''}
        </button>
      </div>
    </div>
  );
}
