import { MATERIALS, type MaterialId } from '../data/materials';
import { MUTATIONS, MUTATION_MAP } from '../data/mutations';
import { bodyAffinity } from '../game/compute';
import { useGame } from '../game/store';
import { GameIcon } from './GameIcon';

export function Mutations() {
  const s = useGame();
  const owned = new Set(s.mutations);

  // 变异提供的工作台容量
  const benchBonus = s.mutations.reduce((sum, id) => sum + (MUTATION_MAP[id]?.benchBonus ?? 0), 0);

  // 肉身材质效率汇总
  const bodyMats = (Object.keys(MATERIALS) as MaterialId[])
    .map((m) => ({ m, v: bodyAffinity(s, m) }))
    .filter((x) => x.v > 0);

  return (
    <div className="mutationsPanel">
      <p className="shopHint">
        变异是肉身自带的「内置工具」——永久、可叠加。
        获取方式：用错工具炸开危险品，意外中有小概率变异（越炸越容易，垫刀递增）。
      </p>

      <div className="mutSummary">
        <span className="mutStat"><GameIcon kind="ui" id="logo" className="tinyIcon" />工作台 +{benchBonus} <small>（变异部分）</small></span>
        {bodyMats.length > 0 ? (
          <span className="mutStat">
            <GameIcon kind="ui" id="mutation" className="tinyIcon" />
            肉身效率：{bodyMats.map((x) => MATERIALS[x.m].name).join(' / ')}
          </span>
        ) : (
          <span className="mutStat dim"><GameIcon kind="ui" id="mutation" className="tinyIcon" />暂无肉身材质效率</span>
        )}
        <span className="mutStat dim">已变异 {s.mutations.length}/{MUTATIONS.length}</span>
      </div>

      <div className="mutationGrid">
        {MUTATIONS.map((m) => {
          const has = owned.has(m.id);
          const count = s.mutations.filter((x) => x === m.id).length;
          return (
            <div className={'mutCard' + (has ? ' owned' : ' locked')} key={m.id}>
              <GameIcon className="mutCardEmoji" kind="mutation" id={m.id} name={m.name} emoji={m.emoji} />
              <div className="mutCardBody">
                <div className="mutCardName">
                  {m.name}
                  {has && count > 1 && <span className="mutCount">×{count}</span>}
                </div>
                {has ? (
                  <div className="mutCardDesc">{m.desc}</div>
                ) : (
                  <div className="mutCardDesc dim">
                    获取方式：用错工具炸开危险品，有小概率变异
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
