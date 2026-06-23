import { useCallback, useEffect, useRef, useState } from 'react';
import { RARITIES, rarityRank } from '../../data/rarity';
import { emit, on, type RevealData } from '../../game/events';
import { sfxLoot } from '../../lib/audio';
import { fmt } from '../../lib/format';
import type { Rarity } from '../../data/types';

const DURATION: Record<Rarity, number> = {
  common: 650,
  rare: 1000,
  epic: 1400,
  legendary: 2200,
  absurd: 3000,
};

export function RevealLayer() {
  const [current, setCurrent] = useState<RevealData | null>(null);
  const [flashKey, setFlashKey] = useState(0);
  const queue = useRef<RevealData[]>([]);
  const showing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const advance = useCallback(() => {
    clearTimeout(timer.current);
    const next = queue.current.shift();
    if (!next) {
      if (showing.current) {
        showing.current = false;
        emit('revealEnd');
      }
      setCurrent(null);
      return;
    }
    if (!showing.current) {
      showing.current = true;
      emit('revealStart');
    }
    setCurrent(next);
    sfxLoot(next.topRarity);
    if (rarityRank(next.topRarity) >= rarityRank('legendary')) setFlashKey((k) => k + 1);
    timer.current = setTimeout(advance, DURATION[next.topRarity]);
  }, []);

  useEffect(() => {
    const off = on('reveal', (r) => {
      queue.current.push(r);
      // 防止自动产线时特写堆积太多
      if (queue.current.length > 5) queue.current.splice(0, queue.current.length - 5);
      if (!showing.current) advance();
    });
    return () => {
      off();
      clearTimeout(timer.current);
    };
  }, [advance]);

  if (!current) return null;
  const topR = RARITIES[current.topRarity];
  const grand = rarityRank(current.topRarity) >= rarityRank('epic');
  const huge = rarityRank(current.topRarity) >= rarityRank('legendary');

  return (
    <div className={'revealBg r-' + current.topRarity} onPointerDown={advance}>
      {huge && <div className="revealFlash" key={flashKey} />}
      <div className={'revealStage' + (grand ? ' grand' : '')}>
        {grand && <div className="revealRays" style={{ color: topR.color }} />}

        <div className="revealTitle" style={{ color: topR.color }}>
          {topR.badge} 拆出 {topR.name}！
        </div>

        <div className={'revealItems n' + Math.min(current.items.length, 4)}>
          {current.items.map((it, i) => {
            const r = RARITIES[it.rarity];
            return (
              <div
                className={'revealItem' + (it.isDestroyed ? ' riDestroyed' : '')}
                key={i}
                style={{ borderColor: r.color, animationDelay: i * 70 + 'ms', boxShadow: `0 0 24px ${r.color}66` }}
              >
                <div className="riEmoji" style={{ filter: `drop-shadow(0 0 12px ${r.color})` }}>
                  {it.emoji}
                  {it.isDestroyed && <span className="riDestroyedOverlay">💥</span>}
                </div>
                <div className="riName" style={{ color: r.color }}>{it.name}</div>
                <div className="riTag">
                  {it.isDestroyed
                    ? <span className="riDestroyedLabel">踢坏了</span>
                    : it.kind === 'quote'
                      ? '🗯️ 语录'
                      : it.kind === 'collectible'
                        ? '🖼️ 收藏'
                        : '¥' + fmt(it.value)}
                </div>
                {it.isNew && !it.isDestroyed && <div className="riNew">{it.kind === 'quote' ? '✨ 新语录' : '✨ 新收藏'}</div>}
              </div>
            );
          })}
        </div>

        <div className="revealHint">👆 点击收取</div>
      </div>
    </div>
  );
}
