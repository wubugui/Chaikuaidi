import { useEffect, useState } from 'react';
import { RARITIES, rarityRank } from '../../data/rarity';
import { on, type RevealData } from '../../game/events';
import { neededParts } from '../../data/blueprints';
import { useGame } from '../../game/store';
import { isShowcase } from './RevealLayer';
import { sfxLoot } from '../../lib/audio';

interface Pop {
  id: number;
  data: RevealData;
}

const LIFE_MS = 900;
/** 离谱「炸一下」中心闪光时长 */
const BOOM_MS = 700;

/**
 * P7：非阻塞的开箱小爆窗 + 离谱「炸一下」。
 * - 处理所有「值得一看」的揭晓（稀有 / 史诗 / 传说 / 离谱）——全屏特写已退役，全部走这里。
 * - 普通无弹窗（飞屑特效已覆盖，杜绝刷屏）。
 * - 容器 pointer-events:none，绝不挡操作；屏上最多 4 个，自动消失，无需点击收下。
 * - 离谱（absurd）额外炸一记中心闪光（短促 boom，然后消失）。
 */
export function PopReveal() {
  const [pops, setPops] = useState<Pop[]>([]);
  const [boomKey, setBoomKey] = useState(0); // 离谱炸一下：>0 时渲染中心闪光
  const need = neededParts(useGame());

  useEffect(() => {
    const off = on('reveal', (r) => {
      if (isShowcase(r)) return; // 兜底：理论上恒为 false（全屏特写已退役）
      if (rarityRank(r.topRarity) < rarityRank('rare')) return; // 普通：不弹（特效已覆盖）
      const id = r.id;
      setPops((p) => [...p.slice(-3), { id, data: r }]); // 屏上最多 4 个
      setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), LIFE_MS);
      // 离谱：额外炸一记中心闪光（非阻塞，自动消失）
      if (rarityRank(r.topRarity) >= rarityRank('absurd')) {
        sfxLoot('absurd');
        setBoomKey((k) => k + 1);
      }
    });
    return off;
  }, []);

  // 炸一下闪光自动消失
  useEffect(() => {
    if (boomKey === 0) return;
    const t = setTimeout(() => setBoomKey(0), BOOM_MS);
    return () => clearTimeout(t);
  }, [boomKey]);

  if (pops.length === 0 && boomKey === 0) return null;

  return (
    <>
      {boomKey > 0 && (
        <div className="absurdBoom" key={boomKey}>
          <span className="absurdBoomEmoji">💥</span>
          <span className="absurdBoomLabel">离谱！</span>
        </div>
      )}
      {pops.length > 0 && (
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
      )}
    </>
  );
}
