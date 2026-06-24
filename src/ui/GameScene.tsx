import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { barkFor, BARKS_LUCKY } from '../data/barks';
import { ITEM_MAP } from '../data/items';
import { MATERIALS } from '../data/materials';
import { PARCEL_MAP } from '../data/parcels';
import { MUTATION_MAP, type MutationId } from '../data/mutations';
import { TOOL_MAP } from '../data/tools';
import { sceneBackground, workerPortraitId, WORKER_PORTRAITS } from '../assets/sceneArt';
import { benchCapacity, bodyAffinity, clickCooldown, clickPowerBase, comboMult, sellBonus } from '../game/compute';
import { effectiveAffinity, type FeedbackLevel } from '../game/engine';
import { on } from '../game/events';
import { useGame } from '../game/store';
import type { GameState, Parcel } from '../game/state';
import { sellValue } from '../game/systems/loot';
import { sfxBonk, sfxCrack, sfxRip } from '../lib/audio';
import { fmt, money } from '../lib/format';
import { GameIcon } from './GameIcon';

const BONK_BARKS = ['这玩意儿手抠不动啊！', '换个家伙！', '撬不动……得用对工具！'];

interface Particle { id: number; x: number; y: number; dx: number; dy: number; artId: string; }
interface Dmg { id: number; x: number; y: number; text: string; big: boolean; }

let pid = 1;
const SCRAPS = ['paper-a', 'paper-b', 'tape', 'spark-a', 'spark-b', 'crack'];

/** 把当前玩家状态（肉身/变异门）代入有效亲和度（UI 用） */
function effAff(s: GameState, p: Parcel): number {
  const hasReq = !p.requireMutation || s.mutations.includes(p.requireMutation);
  return effectiveAffinity(s.currentTool, p, bodyAffinity(s, p.material), hasReq);
}

/** 变异触发时的吼叫 */
const MUTATE_BARKS: Record<MutationId, string> = {
  mecharm: '我的手……长出第三条胳膊了？！',
  sixarms: '六条胳膊？！正好多拆几个！',
  brasshead: '我的脑袋……硬得像块铁！',
  sawlegs: '我的腿……长出锯子了？！',
  lasereye: '我的眼睛……能射激光了？！',
  magnethand: '东西自己飞过来了？！手有磁性了！',
};

export function GameScene() {
  const workbench = useGame((s) => s.workbench);
  const queueLen = useGame((s) => s.queue.length);
  const combo = useGame((s) => s.combo);
  const currentTool = useGame((s) => s.currentTool);
  const ownedTools = useGame((s) => s.ownedTools);
  const inventory = useGame((s) => s.inventory);
  const stage = useGame((s) => s.stage);
  const click = useGame((s) => s.click);
  const selectTool = useGame((s) => s.selectTool);
  const shelveToBacklog = useGame((s) => s.shelveToBacklog);
  const sellAllItems = useGame((s) => s.sellAllItems);
  const rage = useGame((s) => s.rage);
  const revengeLeft = useGame((s) => s.revengeLeft);
  const mutations = useGame((s) => s.mutations);

  // 变异触发：全屏一闪 + 新长出的器官 emoji 炸入
  const [mutateFx, setMutateFx] = useState<{ id: number; mut: MutationId } | null>(null);

  const [shakeCls, setShakeCls] = useState('');
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [jitterId, setJitterId] = useState(0); // 撬不动时给箱子一个小抖动

  const s = useGame();
  const cPower = clickPowerBase(s);
  const cap = benchCapacity(s);
  const cMult = comboMult(s);

  const [particles, setParticles] = useState<Particle[]>([]);
  const [dmgs, setDmgs] = useState<Dmg[]>([]);
  const [bark, setBark] = useState<{ id: number; text: string } | null>(null);
  const [swing, setSwing] = useState(0);
  const holdRef = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const lastBarkRef = useRef(0);
  const downRef = useRef(false); // 是否仍按住
  const ptrRef = useRef({ x: 0, y: 0 });

  // 背包总价值（与「全卖」一致：零件/元素留作合成，不计入一键卖出的金额）
  const invIds = Object.keys(inventory).filter((id) => inventory[id] > 0);
  const bagValue = invIds.reduce((sum, id) => {
    const it = ITEM_MAP[id];
    if (it.kind === 'part' || it.kind === 'element') return sum;
    return sum + sellValue(it, it.rarity, sellBonus(s)) * inventory[id];
  }, 0);

  // 拆出稀有时老哥惊呼
  useEffect(() => {
    return on('reveal', (r) => {
      if (r.topRarity === 'legendary' || r.topRarity === 'absurd') {
        setBark({ id: pid++, text: BARKS_LUCKY[Math.floor(Math.random() * BARKS_LUCKY.length)] });
      }
    });
  }, []);

  // 变异：戏剧性的一刻——全屏一闪 + 新器官炸入 + 老哥吼叫
  useEffect(() => {
    return on('mutate', (mut) => {
      setMutateFx({ id: pid++, mut });
      setBark({ id: pid++, text: MUTATE_BARKS[mut] });
    });
  }, []);
  useEffect(() => {
    if (!mutateFx) return;
    const t = setTimeout(() => setMutateFx((m) => (m?.id === mutateFx.id ? null : m)), 1400);
    return () => clearTimeout(t);
  }, [mutateFx]);

  // 反馈分级：有意义的震动 / 撬不动的小抖动 + 闷响
  useEffect(() => {
    return on('feedback', (lvl: FeedbackLevel) => {
      const cls =
        lvl === 'danger' ? 'shakeL'
          : lvl === 'open' ? 'shakeL'
          : lvl === 'crack' ? 'shakeM'
          : lvl === 'hit' ? 'shakeS'
          : '';
      if (lvl === 'ineffective') {
        // 不震屏：箱子小抖 + 闷响 + 吐槽
        setJitterId((v) => v + 1);
        sfxBonk();
        const now = performance.now();
        if (now - lastBarkRef.current > 360) {
          lastBarkRef.current = now;
          setBark({ id: pid++, text: BONK_BARKS[Math.floor(Math.random() * BONK_BARKS.length)] });
        }
        return;
      }
      if (lvl === 'crack') sfxCrack();
      if (cls) {
        setShakeCls(cls);
        if (shakeTimer.current) clearTimeout(shakeTimer.current);
        const dur = cls === 'shakeL' ? 220 : cls === 'shakeM' ? 150 : 90;
        shakeTimer.current = setTimeout(() => setShakeCls(''), dur);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // P7：全屏特写已退役，不再暂停砸击（revealStart/revealEnd 不再 emit）。

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
        artId: SCRAPS[Math.floor(Math.random() * SCRAPS.length)],
      });
    }
    setParticles((p) => [...p.slice(-40), ...next]);
    setTimeout(() => {
      const ids = new Set(next.map((p) => p.id));
      setParticles((p) => p.filter((x) => !ids.has(x.id)));
    }, 650);
  };

  const doOne = () => {
    // 本次点击是否对工作台任意一个箱子有效（决定是否放特效/音效）
    const st = useGame.getState();
    const effective = st.workbench.some((p) => effAff(st, p) > 0);
    click();
    setSwing((v) => v + 1);
    if (effective) {
      spawnFx(ptrRef.current.x, ptrRef.current.y);
      sfxRip();
      maybeBark();
    }
  };

  const runHold = () => {
    doOne();
    holdRef.current = window.setTimeout(runHold, clickCooldown(useGame.getState()));
  };

  const startHold = (e: React.PointerEvent) => {
    e.preventDefault();
    downRef.current = true;
    ptrRef.current = { x: e.clientX, y: e.clientY };
    if (holdRef.current === null) runHold();
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

  const tool = TOOL_MAP[currentTool] ?? TOOL_MAP.hand;
  const heat = combo >= 50 ? 'rage' : combo >= 20 ? 'hot' : combo >= 8 ? 'warm' : '';
  const n = workbench.length;
  const expedition = workbench.find((p) => p.missionId); // 当前台上的远征现场（若有）
  const boxSize = n <= 1 ? 150 : n <= 2 ? 116 : n <= 4 ? 92 : n <= 6 ? 72 : 56;
  const ragePct = Math.min(100, Math.max(0, rage));
  const rageColor = ragePct >= 70 ? '#ff5a6e' : ragePct >= 40 ? '#ffce3a' : '#54e08a';
  const portraitId = workerPortraitId(combo);
  const sceneStyle = { '--scene-bg': `url("${sceneBackground(stage)}")` } as CSSProperties;

  return (
    <div className={'scene ' + heat + (shakeCls ? ' ' + shakeCls : '')} style={sceneStyle}>
      {/* 背景：随阶段升级的手绘场景 */}
      <div className="sceneBg">
        <div className="hangLight" />
        <div className="boxMountain" />
        <div className="floor" />
      </div>

      {/* 小标牌 */}
      <div className="sceneMeta">
        <span title="单次拆解（不含连击）"><GameIcon kind="upgrade" id="clickPower" className="tinyIcon" />{fmt(cPower)}</span>
        <span title="同时处理"><GameIcon kind="ui" id="logo" className="tinyIcon" />{workbench.length}/{cap}</span>
        <span title="待拆队列"><GameIcon kind="ui" id="inbox" className="tinyIcon" />{queueLen}</span>
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
        {/* 远征现场提示：台上有远征结构时，明确告知玩家正在现场亲手拆解 */}
        {expedition && (
          <div className="expeditionBanner">
            <GameIcon kind="ui" id="map" className="labelIcon" />
            远征现场：{(expedition.label ?? '').replace('📍 远征现场 · ', '')} —— 砸穿它即完成
          </div>
        )}

        {/* 快递（主角，放大居中） */}
        <div className="boxes">
          {workbench.length === 0 ? (
            <div className="boxesEmpty"><GameIcon kind="ui" id="inbox" className="inlineIcon" />没货了……砸两下，新货马上到！</div>
          ) : (
            workbench.map((p) => {
              const pct = Math.max(0, (p.sealHP / p.sealMax) * 100);
              const dmgStage = pct < 34 ? ' d2' : pct < 67 ? ' d1' : '';
              const mat = MATERIALS[p.material] ?? MATERIALS.paper;
              // 软梯度后唯一的硬门槛 = 缺少指定变异
              const needMut = p.requireMutation && !s.mutations.includes(p.requireMutation)
                ? MUTATION_MAP[p.requireMutation] : null;
              const gated = !!needMut; // eff<=0 仅可能因变异门
              const danger = !!p.danger && !gated;
              return (
                <div
                  className={'bigBox' + (!gated && pct < 100 ? ' hurt' : '') + dmgStage + (gated ? ' gated' : '')}
                  key={p.id}
                  style={{ width: boxSize * 1.15 }}
                >
                  <button
                    className="shelveBtn"
                    title="搁置到积压区"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      shelveToBacklog(p.id);
                    }}
                  >
                    <GameIcon kind="ui" id="inbox" />
                  </button>
                  <div className={'bigBoxWrap' + (gated ? ' jitter' : '')} key={gated ? jitterId : undefined}>
                    <span className="matBadge" style={{ background: mat.color + '33', borderColor: mat.color }}>
                      <GameIcon kind="material" id={mat.id} name={mat.name} emoji={mat.emoji} />
                      {mat.name}
                    </span>
                    {danger && (
                      <span className="dangerBadge" title="危险品：用拆弹钳才安全，错了会炸">
                        <GameIcon kind="ui" id="danger" className="tinyIcon" />危险
                      </span>
                    )}
                    <GameIcon
                      key={swing}
                      className="bigBoxEmoji"
                      kind={p.label ? undefined : 'parcel'}
                      id={p.label ? undefined : p.size}
                      name={p.label ?? PARCEL_MAP[p.size].name}
                      emoji={p.emoji}
                      size={boxSize}
                    />
                    {!gated && pct < 67 && <GameIcon className="crack c1" kind="ui" id="crack" size={28} />}
                    {!gated && pct < 34 && <GameIcon className="crack c2" kind="ui" id="boom" size={34} />}
                    {needMut && (
                      <div className="gateOverlay mutGate">
                        <GameIcon kind="ui" id="mutation" className="labelIcon" />
                        需要变异：<GameIcon kind="mutation" id={needMut.id} name={needMut.name} emoji={needMut.emoji} className="labelIcon" />{needMut.name}
                      </div>
                    )}
                  </div>
                  <div className="bigBoxName">{p.label ?? PARCEL_MAP[p.size].name}</div>
                  <div className="bigHp"><div className="bigHpFill" style={{ width: pct + '%' }} /></div>
                </div>
              );
            })
          )}
        </div>

        {/* 暴躁老哥（站旁边念叨，变异后浑身长怪器官） */}
        <div className="dude side">
          {bark && <div className="bark" key={bark.id}>{bark.text}</div>}
          <img
            className={'dudePortrait' + (combo >= 20 ? ' mad' : '')}
            src={WORKER_PORTRAITS[portraitId]}
            alt=""
            aria-hidden="true"
            draggable={false}
          />
          {mutations.length > 0 && (
            <div className="dudeMutations">
              {mutations.map((id, i) => (
                <GameIcon
                  className="mutBadge"
                  kind="mutation"
                  id={id}
                  name={MUTATION_MAP[id].name}
                  emoji={MUTATION_MAP[id].emoji}
                  key={id + i}
                  title={MUTATION_MAP[id].name}
                />
              ))}
            </div>
          )}
          <GameIcon className="dudeHand" kind="tool" id={tool.id} name={tool.name} emoji={tool.emoji} key={swing % 1000} />
          <div className="dudeName">{tool.name}</div>
          {revengeLeft > 0 && <div className="revengeTag">报复×{revengeLeft}</div>}
        </div>

        {/* 粒子 */}
        {particles.map((p) => (
          <GameIcon
            className="scrap"
            key={p.id}
            kind={p.artId === 'crack' ? 'ui' : 'fx'}
            id={p.artId}
            style={{ left: p.x, top: p.y, ['--dx' as any]: p.dx + 'px', ['--dy' as any]: p.dy + 'px' }}
          />
        ))}
        {/* 伤害数字 */}
        {dmgs.map((d) => (
          <span className={'dmg' + (d.big ? ' big' : '')} key={d.id} style={{ left: d.x, top: d.y }}>
            {d.text}
          </span>
        ))}

        <div className="tapHint"><GameIcon kind="ui" id="click" className="inlineIcon" />按住猛砸</div>
      </div>

      {/* 暴怒条 */}
      <div className="rageBarWrap">
        <span className="rageBarLabel">暴怒</span>
        <div className="rageBar">
          <div
            className="rageFill"
            style={{ width: ragePct + '%', background: rageColor }}
          />
        </div>
        <span className="rageBarNum" style={{ color: rageColor }}>{Math.floor(ragePct)}</span>
      </div>

      {/* 工具箱切换 */}
      {ownedTools.length > 1 && (
        <div className="toolSwitch">
          {ownedTools.map((id) => {
            const t = TOOL_MAP[id];
            return (
              <button
                key={id}
                className={'toolChip' + (id === currentTool ? ' on' : '')}
                onClick={() => selectTool(id)}
                title={t.name}
              >
                <GameIcon className="toolChipEmoji" kind="tool" id={t.id} name={t.name} emoji={t.emoji} />
                <span className="toolChipName">{t.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 卖货条 */}
      <div className="sellBar">
        <div className="bagInfo"><GameIcon kind="ui" id="bag" className="inlineIcon" />背包 <b>{money(bagValue)}</b></div>
        <button className="sellBtn" disabled={bagValue <= 0} onClick={() => sellAllItems(null)}>
          <GameIcon kind="ui" id="sell" className="inlineIcon" />全卖 {bagValue > 0 ? '+' + money(bagValue) : ''}
        </button>
      </div>

      {/* 变异时刻：全屏紫闪 + 新器官炸入 */}
      {mutateFx && (
        <div className="mutateFlash" key={mutateFx.id}>
          <GameIcon
            className="mutateEmoji"
            kind="mutation"
            id={mutateFx.mut}
            name={MUTATION_MAP[mutateFx.mut].name}
            emoji={MUTATION_MAP[mutateFx.mut].emoji}
          />
          <span className="mutateLabel">变异！{MUTATION_MAP[mutateFx.mut].name}</span>
        </div>
      )}
    </div>
  );
}
