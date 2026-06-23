import { useEffect, useState } from 'react';
import { on } from '../../game/events';
import { sfxBoom } from '../../lib/audio';

/** 危险品爆炸时的全屏 💥 闪光 + 抖动 */
export function BoomFlash() {
  const [id, setId] = useState(0);

  useEffect(() => {
    return on('boom', () => {
      sfxBoom();
      setId((v) => v + 1);
    });
  }, []);

  useEffect(() => {
    if (id === 0) return;
    const t = setTimeout(() => setId(0), 600);
    return () => clearTimeout(t);
  }, [id]);

  if (id === 0) return null;
  return (
    <div className="boomFlash" key={id}>
      <span className="boomEmoji">💥</span>
    </div>
  );
}
