import { MATERIALS, type MaterialId } from '../data/materials';
import { MUTATION_MAP, type MutationId } from '../data/mutations';
import type { Parcel } from '../game/state';
import { useGame } from '../game/store';
import { fmt } from '../lib/format';

/** 台上/队列里暂时开不了的快递。软梯度后唯一卡死的只剩「缺指定变异」。 */
function isBacklog(p: Parcel, mutations: MutationId[]): boolean {
  return !!p.requireMutation && !mutations.includes(p.requireMutation);
}

interface Group {
  material: MaterialId;
  emoji: string;
  label: string;
  count: number;
  needMut: MutationId;
}

export function Backlog() {
  const workbench = useGame((s) => s.workbench);
  const queue = useGame((s) => s.queue);
  const mutations = useGame((s) => s.mutations);

  const stuck = [...workbench, ...queue].filter((p) => isBacklog(p, mutations));

  // 按 材质 + 名称 分组
  const groups = new Map<string, Group>();
  for (const p of stuck) {
    const label = p.label ?? MATERIALS[p.material].name;
    const needMut = p.requireMutation!;
    const key = p.material + '|' + label + '|' + needMut;
    const g = groups.get(key);
    if (g) g.count += 1;
    else groups.set(key, { material: p.material, emoji: p.emoji, label, count: 1, needMut });
  }
  const list = [...groups.values()].sort((a, b) => b.count - a.count);

  return (
    <div className="backlogPanel">
      <p className="shopHint">这些是你暂时撬不动的货——炸出对应变异，就能开了。</p>
      {list.length === 0 ? (
        <div className="invEmpty">没有积压，来者不拒！</div>
      ) : (
        <div className="backlogList">
          {list.map((g) => {
            const mat = MATERIALS[g.material];
            const mut = MUTATION_MAP[g.needMut];
            return (
              <div className="backlogRow" key={g.material + g.label + g.needMut}>
                <span className="backlogEmoji">{g.emoji}</span>
                <div className="backlogInfo">
                  <div className="backlogName">
                    {g.label} <span className="backlogCount">×{fmt(g.count)}</span>
                  </div>
                  <span className="matBadge" style={{ background: mat.color + '33', borderColor: mat.color }}>
                    {mat.emoji} {mat.name}
                  </span>
                </div>
                <div className="backlogHint mutHint">
                  需要变异：{mut.emoji}{mut.name}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
