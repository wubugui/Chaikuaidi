export type PanelId = 'bag' | 'upgrade' | 'shop' | 'backlog' | 'quotes' | 'collection' | 'achievements' | 'prestige';

export interface NavItem {
  id: PanelId;
  label: string;
  emoji: string;
  minStage?: number;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'bag', label: '背包', emoji: '🎒' },
  { id: 'upgrade', label: '升级', emoji: '🛠️' },
  { id: 'shop', label: '进货', emoji: '🛒', minStage: 2 },
  { id: 'backlog', label: '积压', emoji: '📥', minStage: 2 },
  { id: 'quotes', label: '语录', emoji: '🗯️', minStage: 2 },
  { id: 'collection', label: '图鉴', emoji: '🖼️', minStage: 3 },
  { id: 'achievements', label: '成就', emoji: '🏅' },
  { id: 'prestige', label: '转生', emoji: '♻️', minStage: 4 },
];

interface Props {
  stage: number;
  active: PanelId | null;
  onSelect: (id: PanelId) => void;
}

export function BottomNav({ stage, active, onSelect }: Props) {
  const items = NAV_ITEMS.filter((i) => !i.minStage || stage >= i.minStage);
  return (
    <nav className="bottomNav">
      {items.map((it) => (
        <button
          key={it.id}
          className={'navBtn' + (active === it.id ? ' on' : '')}
          onClick={() => onSelect(it.id)}
        >
          <span className="navEmoji">{it.emoji}</span>
          <span className="navLabel">{it.label}</span>
        </button>
      ))}
    </nav>
  );
}
