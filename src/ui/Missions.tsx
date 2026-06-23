import { useEffect, useState } from 'react';
import { MISSIONS, MISSION_MAP, type MissionDef } from '../data/missions';
import { ITEM_MAP } from '../data/items';
import { ORDNANCE_MAP } from '../data/ordnance';
import { MUTATION_MAP, type MutationId } from '../data/mutations';
import { useGame } from '../game/store';
import { money } from '../lib/format';

function dur(sec: number): string {
  const m = Math.floor(sec / 60);
  const r = Math.floor(sec % 60);
  if (m > 0) return r > 0 ? `${m}分${r}秒` : `${m}分钟`;
  return `${r}秒`;
}

/** 未满足的前置，返回人类可读的提示；满足则返回 null */
function requireHint(def: MissionDef, done: string[], ordnance: Record<string, number>, mutations: string[]): string | null {
  const req = def.requires;
  if (!req) return null;
  if (req.mission && !done.includes(req.mission)) {
    return `需先完成远征「${MISSION_MAP[req.mission]?.name ?? req.mission}」`;
  }
  if (req.ordnance && (ordnance[req.ordnance] ?? 0) < 1) {
    const o = ORDNANCE_MAP[req.ordnance];
    return `需先备一发 ${o?.emoji ?? ''}${o?.name ?? req.ordnance}`;
  }
  if (req.mutation && !mutations.includes(req.mutation)) {
    const mu = MUTATION_MAP[req.mutation as MutationId];
    return `需先变异出 ${mu?.emoji ?? ''}${mu?.name ?? req.mutation}`;
  }
  return null;
}

export function Missions() {
  const m = useGame((s) => s.money);
  const stage = useGame((s) => s.stage);
  const active = useGame((s) => s.missions);
  const done = useGame((s) => s.doneMissions);
  const ordnance = useGame((s) => s.ordnance);
  const mutations = useGame((s) => s.mutations);
  const dispatchMission = useGame((s) => s.dispatchMission);

  // 倒计时刷新
  const [, force] = useState(0);
  useEffect(() => {
    if (active.length === 0) return;
    const t = setInterval(() => force((v) => v + 1), 500);
    return () => clearInterval(t);
  }, [active.length]);

  const now = Date.now();

  return (
    <div className="missionsPanel">
      <p className="shopHint">
        有些东西大到根本运不回厂房——对撞机、核电站、空间站……你只能亲自带队过去，花一笔出勤费，
        派远征队拆。每个地点都是<b>独一无二</b>的，拆一次就没了，但会返还一件别处绝无的收藏。
      </p>

      <div className="missionList">
        {MISSIONS.map((def) => {
          const isDone = done.includes(def.id);
          const live = active.find((a) => a.id === def.id);
          const lockedStage = stage < def.unlockStage;
          const hint = requireHint(def, done, ordnance, mutations);
          const unique = ITEM_MAP[def.rewards.unique];

          // 进行中：倒计时进度条
          if (live) {
            const total = def.durationSec * 1000;
            const left = Math.max(0, live.endsAt - now);
            const pct = Math.min(100, Math.round(((total - left) / total) * 100));
            return (
              <div className="missionRow inprogress" key={def.id}>
                <span className="missionEmoji">{def.emoji}</span>
                <div className="missionInfo">
                  <div className="missionName">{def.name} <span className="missionGoing">远征中…</span></div>
                  <div className="missionBarTrack">
                    <div className="missionBarFill" style={{ width: pct + '%' }} />
                  </div>
                  <div className="missionCountdown">还剩 {dur(left / 1000)} · 返还 {unique?.emoji}{unique?.name}</div>
                </div>
              </div>
            );
          }

          // 已完成
          if (isDone) {
            return (
              <div className="missionRow done" key={def.id}>
                <span className="missionEmoji">{def.emoji}</span>
                <div className="missionInfo">
                  <div className="missionName">{def.name} <span className="doneTag">✓ 已拆除</span></div>
                  <div className="missionFlavor">已收入 {unique?.emoji}{unique?.name} · 独一无二，去过就没了。</div>
                </div>
              </div>
            );
          }

          // 锁定（阶段/前置）
          const locked = lockedStage || !!hint;
          const poor = m < def.cost;
          return (
            <div className={'missionRow' + (locked ? ' locked' : '')} key={def.id}>
              <span className="missionEmoji">{def.emoji}</span>
              <div className="missionInfo">
                <div className="missionName">
                  {def.name}
                  <span className="missionUnique">🏅 唯一</span>
                </div>
                <div className="missionFlavor">{def.flavor}</div>
                <div className="missionMeta">
                  卖家：<b>{def.seller.name}</b> · 耗时 {dur(def.durationSec)} · 返还 {unique?.emoji}{unique?.name}
                </div>
                {lockedStage && <div className="missionLockHint">🔒 需阶段 {def.unlockStage}</div>}
                {!lockedStage && hint && <div className="missionLockHint">🔒 {hint}</div>}
              </div>
              <div className="missionGoCol">
                <button
                  className="btn buy"
                  disabled={locked || poor}
                  onClick={() => dispatchMission(def.id)}
                >
                  前往<span className="cost">{money(def.cost)}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
