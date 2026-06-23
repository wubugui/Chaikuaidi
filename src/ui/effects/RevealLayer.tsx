import { useCallback, useEffect, useRef, useState } from 'react';
import { RARITIES, rarityRank } from '../../data/rarity';
import { emit, on, type RevealData } from '../../game/events';
import { neededParts } from '../../data/blueprints';
import { useGame } from '../../game/store';
import { sfxLoot, sfxOpen } from '../../lib/audio';
import { fmt } from '../../lib/format';
import type { Rarity } from '../../data/types';

type Phase = 'peek' | 'burst' | 'show';

const PEEK_MS: Record<Rarity, number> = {
  common: 350,
  rare: 500,
  epic: 700,
  legendary: 1000,
  absurd: 1300,
};
const BURST_MS = 260;
const SHOW_MS: Record<Rarity, number> = {
  common: 1400,
  rare: 1400,
  epic: 1600,
  legendary: 2600,
  absurd: 3400,
};

/** 只有「演出级」的开箱才走全屏特写：手动 稀有+ ／ 自动 传说+ */
export function isShowcase(r: RevealData): boolean {
  const rank = rarityRank(r.topRarity);
  return r.manual ? rank >= rarityRank('rare') : rank >= rarityRank('legendary');
}

/** 该揭晓是否需要「✅ 收下」确认（稀有+ 不会被误触吞掉） */
function needsConfirm(r: RevealData): boolean {
  return rarityRank(r.topRarity) >= rarityRank('rare');
}

export function RevealLayer() {
  const [current, setCurrent] = useState<RevealData | null>(null);
  const [phase, setPhase] = useState<Phase>('peek');
  const [flashKey, setFlashKey] = useState(0);
  const queue = useRef<RevealData[]>([]);
  const showing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  // 进入下一个揭晓（队列空则收尾）
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
    setPhase('peek');
    timer.current = setTimeout(() => goBurst(next), PEEK_MS[next.topRarity]);
  }, []);

  // 偷窥 → 爆开
  const goBurst = useCallback((r: RevealData) => {
    clearTimeout(timer.current);
    setPhase('burst');
    sfxOpen();
    if (rarityRank(r.topRarity) >= rarityRank('legendary')) setFlashKey((k) => k + 1);
    timer.current = setTimeout(() => goShow(r), BURST_MS);
  }, []);

  // 爆开 → 揭晓
  const goShow = useCallback((r: RevealData) => {
    clearTimeout(timer.current);
    setPhase('show');
    sfxLoot(r.topRarity);
    // 稀有+ 必须点「✅ 收下」才推进，不自动消失也不被误触吞掉
    if (needsConfirm(r)) return;
    timer.current = setTimeout(advance, SHOW_MS[r.topRarity]);
  }, [advance]);

  useEffect(() => {
    const off = on('reveal', (r) => {
      if (!isShowcase(r)) return; // 非演出级交给 PopReveal
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

  const need = neededParts(useGame());

  if (!current) return null;
  const topR = RARITIES[current.topRarity];
  const grand = rarityRank(current.topRarity) >= rarityRank('epic');
  const huge = rarityRank(current.topRarity) >= rarityRank('legendary');
  const confirm = needsConfirm(current); // 稀有+ 只能靠按钮推进

  // 背景点击：偷窥阶段直接爆开；show 阶段——稀有+ 不响应背景点击（防误触），
  // 普通演出（理论上不出现）仍可点背景推进
  const onTap = () => {
    if (phase === 'peek') goBurst(current);
    else if (phase === 'show' && !confirm) advance();
  };

  return (
    <div className={'revealBg r-' + current.topRarity} onPointerDown={onTap}>
      {(phase === 'burst' || phase === 'show') && huge && (
        <div className="revealFlash" key={flashKey} />
      )}

      {phase === 'peek' && (
        <div className="revealPeek">
          <div
            className="revealBox"
            style={{ ['--rc' as any]: topR.color, textShadow: `0 0 26px ${topR.color}, 0 0 60px ${topR.color}88` }}
          >
            {current.parcelEmoji}
          </div>
          <div className="revealQ" style={{ color: topR.color }}>？？？</div>
          <div className="revealPeekHint">里面是啥……</div>
        </div>
      )}

      {phase === 'burst' && (
        <div className="revealBurst">
          <div className="revealBoom">💥</div>
        </div>
      )}

      {phase === 'show' && (
        <div className={'revealStage' + (grand ? ' grand' : '')}>
          {grand && <div className="revealRays" style={{ color: topR.color }} />}

          <div className="revealTitle" style={{ color: topR.color }}>
            {topR.badge} 拆出 {topR.name}！
          </div>

          <div className={'revealItems n' + Math.min(current.items.length, 4)}>
            {current.items.map((it, i) => {
              const r = RARITIES[it.rarity];
              const targetPart = it.kind === 'part' && it.itemId != null && need.has(it.itemId);
              return (
                <div
                  className={'revealItem riFlip' + (it.isDestroyed ? ' riDestroyed' : '') + (targetPart ? ' riTargetPart' : '')}
                  key={i}
                  style={{ ['--flipDelay' as any]: i * 180 + 'ms' }}
                >
                  <div className="riBack">❓</div>
                  <div
                    className="riFront"
                    style={{ borderColor: r.color, boxShadow: `0 0 24px ${r.color}66` }}
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
                            : it.kind === 'part'
                              ? '🔩 零件'
                              : '¥' + fmt(it.value)}
                    </div>
                    {targetPart && <div className="riTargetTag">✨ 目标零件</div>}
                    {it.isNew && !it.isDestroyed && <div className="riNew">{it.kind === 'quote' ? '✨ 新语录' : '✨ 新收藏'}</div>}
                  </div>
                </div>
              );
            })}
          </div>

          {confirm ? (
            <button
              className={'revealConfirm r-' + current.topRarity}
              style={{ ['--rc' as any]: topR.color, borderColor: topR.color }}
              onPointerDown={(e) => { e.stopPropagation(); advance(); }}
            >
              ✅ 收下{queue.current.length > 0 ? `（还有 ${queue.current.length}）` : ''}
            </button>
          ) : (
            <div className="revealHint">👆 点击收取</div>
          )}
        </div>
      )}
    </div>
  );
}
