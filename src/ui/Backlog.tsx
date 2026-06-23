import { MATERIALS, type MaterialId } from '../data/materials';
import { MUTATION_MAP, type MutationId } from '../data/mutations';
import { recommendedToolFor, TOOL_MAP } from '../data/tools';
import type { Parcel } from '../game/state';
import { useGame } from '../game/store';
import { fmt } from '../lib/format';

/** 台上/队列里暂时开不了的快递（缺工具或缺变异） */
function isBacklog(p: Parcel, ownedTools: string[], mutations: MutationId[]): boolean {
  // 变异门：没有指定变异 = 卡死，必积压
  if (p.requireMutation && !mutations.includes(p.requireMutation)) return true;
  // 危险品：只要有工具能砸到（即便有风险）就不算积压
  return !ownedTools.some((t) => (TOOL_MAP[t as keyof typeof TOOL_MAP]?.affinity[p.material] ?? 0) >= 1);
}

interface Group {
  material: MaterialId;
  emoji: string;
  label: string;
  count: number;
  needMut?: MutationId;
}

export function Backlog() {
  const workbench = useGame((s) => s.workbench);
  const queue = useGame((s) => s.queue);
  const ownedTools = useGame((s) => s.ownedTools);
  const mutations = useGame((s) => s.mutations);

  const stuck = [...workbench, ...queue].filter((p) => isBacklog(p, ownedTools, mutations));

  // 按 材质 + 名称 分组
  const groups = new Map<string, Group>();
  for (const p of stuck) {
    const label = p.label ?? MATERIALS[p.material].name;
    const needMut = p.requireMutation && !mutations.includes(p.requireMutation) ? p.requireMutation : undefined;
    const key = p.material + '|' + label + '|' + (needMut ?? '');
    const g = groups.get(key);
    if (g) g.count += 1;
    else groups.set(key, { material: p.material, emoji: p.emoji, label, count: 1, needMut });
  }
  const list = [...groups.values()].sort((a, b) => b.count - a.count);

  return (
    <div className="backlogPanel">
      <p className="shopHint">这些是你暂时撬不动的货——攒钱买对工具，就能开了。</p>
      {list.length === 0 ? (
        <div className="invEmpty">没有积压，来者不拒！</div>
      ) : (
        <div className="backlogList">
          {list.map((g) => {
            const mat = MATERIALS[g.material];
            const mut = g.needMut ? MUTATION_MAP[g.needMut] : null;
            const rec = mut ? null : recommendedToolFor(g.material);
            return (
              <div className="backlogRow" key={g.material + g.label + (g.needMut ?? '')}>
                <span className="backlogEmoji">{g.emoji}</span>
                <div className="backlogInfo">
                  <div className="backlogName">
                    {g.label} <span className="backlogCount">×{fmt(g.count)}</span>
                  </div>
                  <span className="matBadge" style={{ background: mat.color + '33', borderColor: mat.color }}>
                    {mat.emoji} {mat.name}
                  </span>
                </div>
                <div className={'backlogHint' + (mut ? ' mutHint' : '')}>
                  {mut ? <>需要变异：{mut.emoji}{mut.name}</> : <>需要 {rec ? rec.emoji + rec.name : '更强工具'}</>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
