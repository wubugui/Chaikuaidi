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

/**
 * 只有「真·稀世」的开箱才走全屏特写：传说+（手动/自动一致）。
 * 普通/稀有/史诗都不全屏——稀有/史诗交给 PopReveal 小弹窗，普通无弹窗。
 */
export function isShowcase(r: RevealData): boolean {
  // 只有「离谱」(absurd, 0.5%) 这种概率低到离谱的才全屏特写；传说及以下走不挡操作的小浮窗
  return rarityRank(r.topRarity) >= rarityRank('absurd');
}

/** 该揭晓是否需要「✅ 收下」确认：演出级（传说+）才需要刻意收下 */
function needsConfirm(r: RevealData): boolean {
  return isShowcase(r);
}

/** 渲染的卡片上限：超过的件数已入背包/收藏，只提示总数 */
const MAX_CARDS = 24;

export function RevealLayer() {
  const [current, setCurrent] = useState<RevealData | null>(null);
  const [phase, setPhase] = useState<Phase>('peek');
  const [flashKey, setFlashKey] = useState(0);
  const queue = useRef<RevealData[]>([]);
  const showing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  // 面板/抽屉打开时挂起全屏揭晓：busy 期间不进入演出，关闭后恢复
  const uiBusy = useGame((s) => s.uiBusy);
  const uiBusyRef = useRef(uiBusy);
  uiBusyRef.current = uiBusy;

  // 进入下一个揭晓（队列空则收尾）
  const advance = useCallback(() => {
    clearTimeout(timer.current);
    // 抽屉开着时挂起：保留队列，等关闭后再恢复
    if (uiBusyRef.current) return;
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
      // 抽屉开着时只入队不弹出（advance 会自挂起），关闭后由下面的 effect 恢复
      if (!showing.current && !uiBusyRef.current) advance();
    });
    return () => {
      off();
      clearTimeout(timer.current);
    };
  }, [advance]);

  // 抽屉关闭（uiBusy: true → false）时，恢复挂起的队列
  useEffect(() => {
    if (!uiBusy && !showing.current && queue.current.length > 0) advance();
  }, [uiBusy, advance]);

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

      {phase === 'show' && (() => {
        const total = current.items.length;
        // 尺寸分档：件数越多卡片越小（>6 / >12 / >24），避免撑爆视口
        const sizeTier = total > 24 ? ' sz4' : total > 12 ? ' sz3' : total > 6 ? ' sz2' : '';
        const shown = current.items.slice(0, MAX_CARDS);
        const overflow = total - shown.length;
        return (
        <div className={'revealStage' + (grand ? ' grand' : '')}>
          {grand && <div className="revealRays" style={{ color: topR.color }} />}

          {/* sticky 顶部标题，永远在屏内 */}
          <div className="revealTitle revealTitleSticky" style={{ color: topR.color }}>
            {topR.badge} 拆出 {topR.name}！
          </div>

          {/* 中部可滚动战利品区：受视口高度约束，多了能滚 */}
          <div className={'revealItems revealItemsScroll' + sizeTier + ' n' + Math.min(shown.length, 4)}>
            {shown.map((it, i) => {
              const r = RARITIES[it.rarity];
              const targetPart = it.kind === 'part' && it.itemId != null && need.has(it.itemId);
              return (
                <div
                  className={'revealItem riFlip' + (it.isDestroyed ? ' riDestroyed' : '') + (targetPart ? ' riTargetPart' : '')}
                  key={i}
                  style={{ ['--flipDelay' as any]: Math.min(i, 12) * 120 + 'ms' }}
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
            {overflow > 0 && (
              <div className="revealMore">…还有 {overflow} 件已收入背包</div>
            )}
          </div>

          {/* sticky 底部收下按钮，永远在屏内可点 */}
          {confirm ? (
            <button
              className={'revealConfirm revealConfirmSticky r-' + current.topRarity}
              style={{ ['--rc' as any]: topR.color, borderColor: topR.color }}
              onPointerDown={(e) => { e.stopPropagation(); advance(); }}
            >
              ✅ 收下{queue.current.length > 0 ? `（还有 ${queue.current.length}）` : ''}
            </button>
          ) : (
            <div className="revealHint">👆 点击收取</div>
          )}
        </div>
        );
      })()}
    </div>
  );
}
