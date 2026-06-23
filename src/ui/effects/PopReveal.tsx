import { useEffect, useState } from 'react';
import { RARITIES } from '../../data/rarity';
import { on, type RevealData } from '../../game/events';
import { neededParts } from '../../data/blueprints';
import { useGame } from '../../game/store';
import { isShowcase } from './RevealLayer';

interface Pop {
  id: number;
  data: RevealData;
}

const LIFE_MS = 900;

/**
 * 非阻塞的盲盒小弹窗：处理「非演出级」开箱。
 * 容器 pointer-events:none，z-index 在抽屉(30)之下、场景之上，绝不挡操作。
 */
export function PopReveal() {
  const [pops, setPops] = useState<Pop[]>([]);
  const need = neededParts(useGame());

  useEffect(() => {
    const off = on('reveal', (r) => {
      if (isShowcase(r)) return; // 演出级交给 RevealLayer
      const id = r.id;
      setPops((p) => [...p.slice(-4), { id, data: r }]);
      setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), LIFE_MS);
    });
    return off;
  }, []);

  if (pops.length === 0) return null;

  return (
    <div className="popLayer">
      {pops.map((pop) => {
        const topR = RARITIES[pop.data.topRarity];
        const items = pop.data.items.slice(0, 4);
        return (
          <div className="popCard" key={pop.id} style={{ borderColor: topR.color }}>
            <div className="popBack">❓</div>
            <div className="popFront">
              {items.map((it, i) => {
                const r = RARITIES[it.rarity];
                const targetPart = it.kind === 'part' && it.itemId != null && need.has(it.itemId);
                return (
                  <div className={'popItem' + (targetPart ? ' popItemTarget' : '')} key={i} style={{ borderColor: r.color }}>
                    <span className="popEmoji">{it.emoji}</span>
                    <span className="popName" style={{ color: r.color }}>{it.name}</span>
                    {targetPart && <span className="popTargetTag">✨</span>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
