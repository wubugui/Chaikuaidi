import { useEffect, useState } from 'react';
import { Topbar } from './ui/Topbar';
import { Workbench } from './ui/Workbench';
import { Inventory } from './ui/Inventory';
import { UpgradePanel } from './ui/UpgradePanel';
import { Shop } from './ui/Shop';
import { Collection } from './ui/Collection';
import { Quotes } from './ui/Quotes';
import { Achievements } from './ui/Achievements';
import { Prestige } from './ui/Prestige';
import { EffectsLayer } from './ui/effects/EffectsLayer';
import { OfflineModal } from './ui/OfflineModal';
import { Intro } from './ui/Intro';
import { useGameLoop } from './game/loop';
import { ensureStarter, useGame } from './game/store';
import { setAudioEnabled } from './lib/audio';

type Tab = 'upgrade' | 'shop' | 'quotes' | 'collection' | 'achievements' | 'prestige';

const TABS: { id: Tab; label: string; emoji: string; minStage?: number }[] = [
  { id: 'upgrade', label: '升级', emoji: '⬆️' },
  { id: 'shop', label: '进货', emoji: '🛒', minStage: 2 },
  { id: 'quotes', label: '语录', emoji: '🗯️', minStage: 2 },
  { id: 'collection', label: '图鉴', emoji: '🖼️', minStage: 3 },
  { id: 'achievements', label: '成就', emoji: '🏅' },
  { id: 'prestige', label: '转生', emoji: '♻️', minStage: 4 },
];

export default function App() {
  useGameLoop();
  const [tab, setTab] = useState<Tab>('upgrade');
  const stage = useGame((s) => s.stage);
  const audioEnabled = useGame((s) => s.audioEnabled);

  useEffect(() => {
    ensureStarter();
  }, []);
  useEffect(() => {
    setAudioEnabled(audioEnabled);
  }, [audioEnabled]);

  const visibleTabs = TABS.filter((t) => !t.minStage || stage >= t.minStage);
  const activeTab: Tab = visibleTabs.some((t) => t.id === tab) ? tab : 'upgrade';

  return (
    <div className="app">
      <Topbar />
      <main className="main">
        <section className="left">
          <Workbench />
          <Inventory />
        </section>
        <section className="right">
          <nav className="tabs">
            {visibleTabs.map((t) => (
              <button
                key={t.id}
                className={'tab' + (activeTab === t.id ? ' active' : '')}
                onClick={() => setTab(t.id)}
              >
                <span className="tabEmoji">{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </nav>
          <div className="panel">
            {activeTab === 'upgrade' && <UpgradePanel />}
            {activeTab === 'shop' && <Shop />}
            {activeTab === 'quotes' && <Quotes />}
            {activeTab === 'collection' && <Collection />}
            {activeTab === 'achievements' && <Achievements />}
            {activeTab === 'prestige' && <Prestige />}
          </div>
        </section>
      </main>
      <EffectsLayer />
      <OfflineModal />
      <Intro />
    </div>
  );
}
