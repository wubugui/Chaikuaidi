import { GameIcon } from './GameIcon';

export type PanelId = 'bag' | 'upgrade' | 'shop' | 'workshop' | 'refinery' | 'backlog' | 'factory' | 'merchant' | 'missions' | 'quotes' | 'mutations' | 'collection' | 'achievements' | 'prestige';

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
  { id: 'workshop', label: '工坊', emoji: '🔧', minStage: 2 },
  { id: 'refinery', label: '提炼', emoji: '🧪', minStage: 4 },
  { id: 'backlog', label: '积压', emoji: '📥', minStage: 2 },
  { id: 'factory', label: '厂房', emoji: '🏭', minStage: 3 },
  { id: 'missions', label: '远征', emoji: '🗺️', minStage: 3 },
  { id: 'merchant', label: '黑市', emoji: '🕶️', minStage: 2 },
  { id: 'quotes', label: '语录', emoji: '🗯️', minStage: 2 },
  { id: 'mutations', label: '变异', emoji: '🧬', minStage: 3 },
  { id: 'collection', label: '图鉴', emoji: '🖼️', minStage: 3 },
  { id: 'achievements', label: '成就', emoji: '🏅' },
  { id: 'prestige', label: '转生', emoji: '♻️', minStage: 4 },
];

const NAV_ICON_ID: Partial<Record<PanelId, string>> = {
  upgrade: 'workshop',
  shop: 'logo',
  backlog: 'inbox',
  missions: 'map',
  achievements: 'achievement',
};

interface Props {
  stage: number;
  active: PanelId | null;
  onSelect: (id: PanelId) => void;
  merchantPresent?: boolean;
}

export function BottomNav({ stage, active, onSelect, merchantPresent }: Props) {
  const items = NAV_ITEMS.filter((i) => !i.minStage || stage >= i.minStage);
  return (
    <nav className="bottomNav">
      {items.map((it) => {
        const pulse = it.id === 'merchant' && merchantPresent;
        return (
          <button
            key={it.id}
            className={'navBtn' + (active === it.id ? ' on' : '') + (pulse ? ' merchantPulse' : '')}
            onClick={() => onSelect(it.id)}
          >
            <GameIcon className="navEmoji" kind="ui" id={NAV_ICON_ID[it.id] ?? it.id} name={it.label} emoji={it.emoji} />
            <span className="navLabel">{it.label}</span>
            {pulse && <span className="navBadge" />}
          </button>
        );
      })}
    </nav>
  );
}
