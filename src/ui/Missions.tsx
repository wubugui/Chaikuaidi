import { MISSIONS, MISSION_MAP, type MissionDef } from '../data/missions';
import { ITEM_MAP } from '../data/items';
import { ORDNANCE_MAP } from '../data/ordnance';
import { MUTATION_MAP, type MutationId } from '../data/mutations';
import { useGame } from '../game/store';
import { money } from '../lib/format';
import { GameIcon } from './GameIcon';

/** 未满足的前置，返回人类可读的提示；满足则返回 null */
function requireHint(def: MissionDef, done: string[], ordnance: Record<string, number>, mutations: string[]): string | null {
  const req = def.requires;
  if (!req) return null;
  if (req.mission && !done.includes(req.mission)) {
    return `需先完成远征「${MISSION_MAP[req.mission]?.name ?? req.mission}」`;
  }
  if (req.ordnance && (ordnance[req.ordnance] ?? 0) < 1) {
    const o = ORDNANCE_MAP[req.ordnance];
    return `需先备一发 ${o?.name ?? req.ordnance}`;
  }
  if (req.mutation && !mutations.includes(req.mutation)) {
    const mu = MUTATION_MAP[req.mutation as MutationId];
    return `需先变异出 ${mu?.name ?? req.mutation}`;
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

  return (
    <div className="missionsPanel">
      <p className="shopHint">
        有些东西大到根本运不回厂房——对撞机、核电站、空间站……你只能亲自带队过去，花一笔出勤费，
        然后<b>到现场亲手把它拆了</b>。派出后它会作为一座「远征现场」上你的工作台，用装备的工具砸开它即完成。
        每个地点都是<b>独一无二</b>的，拆一次就没了，但会返还一件别处绝无的收藏。
      </p>

      <div className="missionList">
        {MISSIONS.map((def) => {
          const isDone = done.includes(def.id);
          const live = active.includes(def.id);
          const lockedStage = stage < def.unlockStage;
          const hint = requireHint(def, done, ordnance, mutations);
          const unique = ITEM_MAP[def.rewards.unique];

          // 进行中：现场结构已在工作台/积压区，去主场景亲手拆
          if (live) {
            return (
              <div className="missionRow inprogress" key={def.id}>
                <GameIcon className="missionEmoji" kind="mission" id={def.id} name={def.name} emoji={def.emoji} />
                <div className="missionInfo">
                  <div className="missionName">{def.name} <span className="missionGoing"><GameIcon kind="ui" id="workshop" className="tinyIcon" />进行中（在现场亲自拆解）</span></div>
                  <div className="missionFlavor">回主界面，用装备的工具把这座「远征现场 · {def.name}」砸开——拆穿即收获 {unique && <GameIcon kind="item" id={unique.id} name={unique.name} emoji={unique.emoji} className="tinyIcon" />}{unique?.name}。</div>
                </div>
              </div>
            );
          }

          // 已完成
          if (isDone) {
            return (
              <div className="missionRow done" key={def.id}>
                <GameIcon className="missionEmoji" kind="mission" id={def.id} name={def.name} emoji={def.emoji} />
                <div className="missionInfo">
                  <div className="missionName">{def.name} <span className="doneTag">✓ 已拆除</span></div>
                  <div className="missionFlavor">已收入 {unique && <GameIcon kind="item" id={unique.id} name={unique.name} emoji={unique.emoji} className="tinyIcon" />}{unique?.name} · 独一无二，去过就没了。</div>
                </div>
              </div>
            );
          }

          // 锁定（阶段/前置）
          const locked = lockedStage || !!hint;
          const poor = m < def.cost;
          return (
            <div className={'missionRow' + (locked ? ' locked' : '')} key={def.id}>
              <GameIcon className="missionEmoji" kind="mission" id={def.id} name={def.name} emoji={def.emoji} />
              <div className="missionInfo">
                <div className="missionName">
                  {def.name}
                  <span className="missionUnique"><GameIcon kind="ui" id="unique" className="tinyIcon" />唯一</span>
                </div>
                <div className="missionFlavor">{def.flavor}</div>
                <div className="missionMeta">
                  卖家：<b>{def.seller.name}</b> · 到现场亲手拆 · 返还 {unique && <GameIcon kind="item" id={unique.id} name={unique.name} emoji={unique.emoji} className="tinyIcon" />}{unique?.name}
                </div>
                {lockedStage && <div className="missionLockHint"><GameIcon kind="ui" id="lock" className="tinyIcon" />需阶段 {def.unlockStage}</div>}
                {!lockedStage && hint && <div className="missionLockHint"><GameIcon kind="ui" id="lock" className="tinyIcon" />{hint}</div>}
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
