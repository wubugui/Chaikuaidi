import { useEffect, useState } from 'react';
import { on } from '../game/events';

interface SellerPayload {
  name: string;
  emoji: string;
  lines: string[];
  item: string;
}

/**
 * 荒诞卖家对白：买/派出离谱货时一个角色「闯进来」一本正经地胡说八道。
 * 大 emoji + 名牌 + 气泡，逐句点「下一句」推进，最后一句点「成交」关掉。
 */
export function SellerDialog() {
  const [seller, setSeller] = useState<SellerPayload | null>(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    return on('seller', (s) => {
      setSeller(s);
      setIdx(0);
    });
  }, []);

  if (!seller) return null;

  const lines = seller.lines.length > 0 ? seller.lines : ['……'];
  const last = idx >= lines.length - 1;
  const advance = () => {
    if (last) setSeller(null);
    else setIdx((i) => i + 1);
  };

  return (
    <div className="sellerBg" onClick={advance}>
      <div className="sellerCard" onClick={(e) => e.stopPropagation()}>
        <div className="sellerCharacter">{seller.emoji}</div>
        <div className="sellerNameTag">{seller.name}</div>
        <div className="sellerItemTag">关于「{seller.item}」</div>
        <div className="sellerBubble">{lines[idx]}</div>
        <div className="sellerDots">
          {lines.map((_, i) => (
            <span key={i} className={'sellerDot' + (i === idx ? ' on' : '')} />
          ))}
        </div>
        <button className="btn primary sellerNext" onClick={advance}>
          {last ? '成交' : '下一句'}
        </button>
      </div>
    </div>
  );
}
