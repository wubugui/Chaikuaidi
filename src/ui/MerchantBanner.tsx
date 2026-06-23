import { useEffect, useState } from 'react';
import { useGame } from '../game/store';

function mmss(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m + ':' + String(r).padStart(2, '0');
}

interface Props {
  onOpen: () => void;
}

export function MerchantBanner({ onOpen }: Props) {
  const merchant = useGame((s) => s.merchant);
  const [, force] = useState(0);

  useEffect(() => {
    if (!merchant) return;
    const t = setInterval(() => force((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, [merchant]);

  if (!merchant) return null;
  const left = merchant.until - Date.now();

  return (
    <button className="merchantBanner" onClick={onOpen}>
      🕶️ 黑市商人来了！<span className="merchantBannerTime">限时 {mmss(left)}</span>
    </button>
  );
}
