import { MATERIALS, type MaterialId } from '../data/materials';
import { MUTATION_MAP, type MutationId } from '../data/mutations';
import { PIPELINE_NAME } from '../data/giants';
import { PARCEL_MAP } from '../data/parcels';
import { benchCapacity } from '../game/compute';
import { backlogGroupKey, type Parcel } from '../game/state';
import { useGame } from '../game/store';
import { fmt } from '../lib/format';
import { GameIcon } from './GameIcon';

interface Group {
  key: string;
  firstId: number;
  material: MaterialId;
  emoji: string;
  name: string;
  count: number;
  danger: boolean;
  needMut?: MutationId;
  requirePipeline?: string;
  requireOrdnance?: string;
}

export function Backlog() {
  const backlog = useGame((s) => s.backlog);
  const workbench = useGame((s) => s.workbench);
  const loadFromBacklog = useGame((s) => s.loadFromBacklog);
  const dumpGroupToBelt = useGame((s) => s.dumpGroupToBelt);
  const cap = useGame((s) => benchCapacity(s));

  const benchFull = workbench.length >= cap;

  // 分组：稳定键
  const groups = new Map<string, Group>();
  for (const p of backlog as Parcel[]) {
    const sizeName = PARCEL_MAP[p.size].name;
    const key = backlogGroupKey(p, sizeName);
    const g = groups.get(key);
    if (g) g.count += 1;
    else
      groups.set(key, {
        key,
        firstId: p.id,
        material: p.material,
        emoji: p.emoji,
        name: p.label ?? sizeName,
        count: 1,
        danger: !!p.danger,
        needMut: p.requireMutation,
        requirePipeline: p.requirePipeline,
        requireOrdnance: p.requireOrdnance,
      });
  }
  const list = [...groups.values()].sort((a, b) => b.count - a.count);

  return (
    <div className="backlogPanel">
      <p className="shopHint">买来的货和搁置的硬箱都堆在这儿——点「上台」手动送上工作台，或一键倒进传送带让它自动跑。</p>
      {list.length === 0 ? (
        <div className="invEmpty">积压区空空如也——买点货或把砸不动的搁这儿。</div>
      ) : (
        <div className="backlogList">
          {list.map((g) => {
            const mat = MATERIALS[g.material];
            const mut = g.needMut ? MUTATION_MAP[g.needMut] : null;
            return (
              <div className="backlogRow" key={g.key}>
                <GameIcon className="backlogEmoji" name={g.name} emoji={g.emoji} />
                <div className="backlogInfo">
                  <div className="backlogName">
                    {g.name} <span className="backlogCount">×{fmt(g.count)}</span>
                    {g.danger && <span className="dangerTag"><GameIcon kind="ui" id="danger" className="tinyIcon" /></span>}
                    {mut && (
                      <span className="mutTag">
                        <GameIcon kind="ui" id="mutation" className="tinyIcon" />
                        <GameIcon kind="mutation" id={mut.id} name={mut.name} emoji={mut.emoji} className="tinyIcon" />
                      </span>
                    )}
                    {g.requirePipeline && (
                      <span className="giantPipeTag"><GameIcon kind="ui" id="pipe" className="tinyIcon" />需要管线：{PIPELINE_NAME[g.requirePipeline] ?? g.requirePipeline}</span>
                    )}
                    {g.requireOrdnance && (
                      <span className="absurdTag"><GameIcon kind="ui" id="boom" className="tinyIcon" />离谱货：去厂房用军火轰开</span>
                    )}
                  </div>
                  <span className="matBadge" style={{ background: mat.color + '33', borderColor: mat.color }}>
                    <GameIcon kind="material" id={mat.id} name={mat.name} emoji={mat.emoji} />
                    {mat.name}
                  </span>
                </div>
                <div className="backlogBtns">
                  {g.requireOrdnance ? (
                    <span className="benchFullHint"><GameIcon kind="ui" id="boom" className="tinyIcon" />离谱货：只能在「厂房」用军火轰开</span>
                  ) : g.requirePipeline ? (
                    <span className="benchFullHint"><GameIcon kind="ui" id="pipe" className="tinyIcon" />巨型货：只能在「厂房」靠拆卸管线拆解</span>
                  ) : (
                    <>
                      <button
                        className="btn loadBtn"
                        disabled={benchFull}
                        onClick={() => loadFromBacklog(g.firstId)}
                        title={benchFull ? '工作台满' : '送一件上工作台'}
                      >
                        上台
                      </button>
                      {benchFull && <span className="benchFullHint">工作台满</span>}
                      <button
                        className="btn dumpBtn"
                        onClick={() => dumpGroupToBelt(g.key)}
                        title="把这组全部倒进传送带自动处理"
                      >
                        全部倒入传送带
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
