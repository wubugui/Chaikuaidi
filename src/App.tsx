import { useEffect, useState } from 'react';
import { Topbar } from './ui/Topbar';
import { GameScene } from './ui/GameScene';
import { Inventory } from './ui/Inventory';
import { UpgradePanel } from './ui/UpgradePanel';
import { Shop } from './ui/Shop';
import { Workshop } from './ui/Workshop';
import { Refinery } from './ui/Refinery';
import { Backlog } from './ui/Backlog';
import { Factory } from './ui/Factory';
import { Missions } from './ui/Missions';
import { Merchant } from './ui/Merchant';
import { SellerDialog } from './ui/SellerDialog';
import { MerchantBanner } from './ui/MerchantBanner';
import { BoomFlash } from './ui/effects/BoomFlash';
import { CraftFlash } from './ui/effects/CraftFlash';
import { Quotes } from './ui/Quotes';
import { Mutations } from './ui/Mutations';
import { Collection } from './ui/Collection';
import { Achievements } from './ui/Achievements';
import { Prestige } from './ui/Prestige';
import { BottomNav, NAV_ITEMS, type PanelId } from './ui/BottomNav';
import { EffectsLayer } from './ui/effects/EffectsLayer';
import { RevealLayer } from './ui/effects/RevealLayer';
import { PopReveal } from './ui/effects/PopReveal';
import { OfflineModal } from './ui/OfflineModal';
import { Intro } from './ui/Intro';
import { useGameLoop } from './game/loop';
import { ensureStarter, useGame } from './game/store';
import { setAudioEnabled } from './lib/audio';

const PANEL_TITLE: Record<PanelId, string> = {
  bag: '🎒 背包',
  upgrade: '🛠️ 升级 & 装备',
  shop: '🛒 进货批次',
  workshop: '🛠️ 工坊',
  refinery: '🧪 元素提炼',
  backlog: '📥 积压区',
  factory: '🏭 厂房 & 拆卸管线',
  missions: '🗺️ 离场远征',
  merchant: '🕶️ 黑市商人',
  quotes: '🗯️ 暴躁语录',
  mutations: '🧬 变异肉身',
  collection: '🖼️ 收藏图鉴',
  achievements: '🏅 成就',
  prestige: '♻️ 跑路重开',
};

export default function App() {
  useGameLoop();
  const [panel, setPanel] = useState<PanelId | null>(null);
  const stage = useGame((s) => s.stage);
  const audioEnabled = useGame((s) => s.audioEnabled);
  const merchantPresent = useGame((s) => s.merchant !== null);

  useEffect(() => {
    ensureStarter();
  }, []);
  useEffect(() => {
    setAudioEnabled(audioEnabled);
  }, [audioEnabled]);

  // 阶段回退后关掉不可用面板
  const active =
    panel && NAV_ITEMS.find((i) => i.id === panel && (!i.minStage || stage >= i.minStage)) ? panel : null;
  const toggle = (id: PanelId) => setPanel((p) => (p === id ? null : id));

  return (
    <div className="game">
      <Topbar />
      <GameScene />
      <MerchantBanner onOpen={() => setPanel('merchant')} />
      <BottomNav stage={stage} active={active} onSelect={toggle} merchantPresent={merchantPresent} />

      {active && (
        <div className="drawerWrap" onClick={() => setPanel(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawerHead">
              <span className="drawerTitle">{PANEL_TITLE[active]}</span>
              <button className="drawerClose" onClick={() => setPanel(null)}>✕</button>
            </div>
            <div className="drawerBody">
              {active === 'bag' && <Inventory />}
              {active === 'upgrade' && <UpgradePanel />}
              {active === 'shop' && <Shop />}
              {active === 'workshop' && <Workshop />}
              {active === 'refinery' && <Refinery />}
              {active === 'backlog' && <Backlog />}
              {active === 'factory' && <Factory />}
              {active === 'missions' && <Missions />}
              {active === 'merchant' && <Merchant />}
              {active === 'quotes' && <Quotes />}
              {active === 'mutations' && <Mutations />}
              {active === 'collection' && <Collection />}
              {active === 'achievements' && <Achievements />}
              {active === 'prestige' && <Prestige />}
            </div>
          </div>
        </div>
      )}

      <EffectsLayer />
      <BoomFlash />
      <CraftFlash />
      <RevealLayer />
      <PopReveal />
      <OfflineModal />
      <SellerDialog />
      <Intro />
    </div>
  );
}
