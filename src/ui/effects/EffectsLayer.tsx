import { useEffect, useState } from 'react';
import { RARITIES } from '../../data/rarity';
import { on, type FloatText, type LootBurst } from '../../game/events';
import { sfxLoot, sfxOpen, sfxRip } from '../../lib/audio';

interface FlyBurst extends LootBurst {
  x: number;
  rot: number;
}

export function EffectsLayer() {
  const [bursts, setBursts] = useState<FlyBurst[]>([]);
  const [floats, setFloats] = useState<FloatText[]>([]);
  const [newCollect, setNewCollect] = useState<LootBurst | null>(null);

  useEffect(() => {
    const offLoot = on('loot', (b) => {
      const fly: FlyBurst = { ...b, x: 40 + Math.random() * 20, rot: (Math.random() - 0.5) * 60 };
      setBursts((prev) => [...prev.slice(-30), fly]);
      setTimeout(() => setBursts((prev) => prev.filter((p) => p.id !== b.id)), 1100);
      sfxLoot(b.rarity);
      if (b.isNewCollectible) {
        setNewCollect(b);
        setTimeout(() => setNewCollect((c) => (c?.id === b.id ? null : c)), 2600);
      }
    });
    const offOpen = on('open', () => {
      sfxRip();
      sfxOpen();
    });
    const offFloat = on('float', (f) => {
      setFloats((prev) => [...prev.slice(-10), f]);
      setTimeout(() => setFloats((prev) => prev.filter((p) => p.id !== f.id)), 900);
    });
    return () => {
      offLoot();
      offOpen();
      offFloat();
    };
  }, []);

  return (
    <div className="fxLayer">
      {bursts.map((b) => {
        const r = RARITIES[b.rarity];
        return (
          <span
            key={b.id}
            className={'flyLoot r-' + b.rarity}
            style={{ left: b.x + '%', color: r.color, ['--rot' as any]: b.rot + 'deg' }}
          >
            {b.emoji}
          </span>
        );
      })}

      {floats.map((f) => (
        <span key={f.id} className="cashFloat" style={{ color: f.color }}>
          {f.text}
        </span>
      ))}

      {newCollect && (
        <div className="collectToast" style={{ borderColor: RARITIES[newCollect.rarity].color }}>
          <div className="ctEmoji">{newCollect.emoji}</div>
          <div className="ctText">
            <div className="ctTitle" style={{ color: RARITIES[newCollect.rarity].color }}>
              {newCollect.newKind === 'quote' ? '🗯️ 新语录！' : '✨ 新收藏品！'}
            </div>
            <div className="ctSub">
              {newCollect.newKind === 'quote'
                ? `「${newCollect.quoteText ?? ''}」 去「语录」装备它`
                : '已加入图鉴'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
