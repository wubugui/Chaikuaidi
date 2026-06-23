import { useEffect, useState } from 'react';
import { MATERIALS } from '../data/materials';
import { MUTATION_MAP } from '../data/mutations';
import { GIANT_MAP, PIPELINE_NAME } from '../data/giants';
import { ABSURD_MAP } from '../data/absurd';
import { ORDNANCE_MAP } from '../data/ordnance';
import { CONTAINERS, LUGGAGE } from '../data/shop';
import { factoryFree } from '../game/state';
import { useGame } from '../game/store';
import { money } from '../lib/format';

function mmss(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m + ':' + String(r).padStart(2, '0');
}

export function Merchant() {
  const merchant = useGame((s) => s.merchant);
  const m = useGame((s) => s.money);
  const free = useGame((s) => factoryFree(s));
  const buyFromMerchant = useGame((s) => s.buyFromMerchant);

  // 倒计时刷新
  const [, force] = useState(0);
  useEffect(() => {
    if (!merchant) return;
    const t = setInterval(() => force((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, [merchant]);

  if (!merchant) {
    return (
      <div className="merchantPanel">
        <div className="invEmpty">🕶️ 商人不在……下次到访还要等等。</div>
      </div>
    );
  }

  const left = merchant.until - Date.now();

  return (
    <div className="merchantPanel">
      <div className="merchantCountdown">🕶️ 黑市商人在场 · 限时 <b>{mmss(left)}</b></div>
      <p className="shopHint">限量稀缺货，过这村没这店——错过就得等下一趟。</p>
      <div className="merchantList">
        {merchant.offers.map((o) => {
          const giant = o.kind === 'giant' ? GIANT_MAP[o.id] : undefined;
          const absurd = o.kind === 'absurd' ? ABSURD_MAP[o.id] : undefined;
          const good =
            o.kind === 'container'
              ? CONTAINERS.find((c) => c.id === o.id)
              : o.kind === 'giant'
                ? giant
                : o.kind === 'absurd'
                  ? absurd
                  : LUGGAGE.find((l) => l.id === o.id);
          if (!good) return null;
          const isContainer = o.kind === 'container';
          const base = good.price;
          const mat =
            isContainer || giant || absurd
              ? MATERIALS[(good as { material: keyof typeof MATERIALS }).material]
              : null;
          const danger = isContainer && (good as { danger?: boolean }).danger;
          const needMut = isContainer ? (good as { requireMutation?: string }).requireMutation : undefined;
          const mut = needMut ? MUTATION_MAP[needMut as keyof typeof MUTATION_MAP] : null;
          const ord = absurd ? ORDNANCE_MAP[absurd.requireOrdnance] : null;
          const noSpace = (!!giant && free < giant.space) || (!!absurd && free < absurd.space);
          const soldOut = o.stock <= 0;
          return (
            <div className={'merchantOffer' + (soldOut ? ' soldout' : '')} key={o.id}>
              <div className="batchEmoji">{good.emoji}</div>
              <div className="batchInfo">
                <div className="batchName">
                  {good.name}
                  {danger && <span className="dangerTag">⚠️ 危险品</span>}
                  {mut && <span className="mutTag">🧬{mut.emoji}{mut.name}</span>}
                  {giant && (
                    <span className="giantPipeTag">
                      🏭{PIPELINE_NAME[giant.requirePipeline]} · 占 {giant.space} 格
                    </span>
                  )}
                  {absurd && (
                    <span className="absurdTag">
                      💥 需 {ord?.emoji}{ord?.name} 轰开 · 占 {absurd.space} 格
                    </span>
                  )}
                  {absurd?.unique && <span className="uniqueTag">🏅 独一无二</span>}
                </div>
                {mat && (
                  <span className="matBadge" style={{ background: mat.color + '33', borderColor: mat.color }}>
                    {mat.emoji} {mat.name}
                  </span>
                )}
                <div className="merchantStock">{soldOut ? '售罄' : '剩 ×' + o.stock}</div>
                {noSpace && !soldOut && <div className="benchFullHint">厂房放不下，先扩建或拆掉现有的</div>}
              </div>
              <div className="merchantPrice">
                <span className="origPrice">{money(base)}</span>
                <span className="discPrice">{money(o.price)}</span>
                <button
                  className="btn buy grab"
                  disabled={soldOut || m < o.price || noSpace}
                  onClick={() => buyFromMerchant(o.id)}
                >
                  {soldOut ? '售罄' : '抢购'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
