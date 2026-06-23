import { useState } from 'react';
import { nextTool, TOOL_MAP } from '../data/tools';
import { UPGRADES, upgradeBulkCost, upgradeCost } from '../data/upgrades';
import { useGame } from '../game/store';
import { fmt, money } from '../lib/format';

// 升级解锁阶段
const UPGRADE_STAGE: Record<string, number> = {
  clickPower: 1,
  clickSpeed: 1,
  deliverRate: 2,
  autoWorker: 2,
  autoPower: 2,
  luck: 2,
  workbench: 3,
  sellPrice: 3,
  comboCap: 3,
};

export function UpgradePanel() {
  const m = useGame((s) => s.money);
  const upgrades = useGame((s) => s.upgrades);
  const stage = useGame((s) => s.stage);
  const currentTool = useGame((s) => s.currentTool);
  const buyUpgrade = useGame((s) => s.buyUpgrade);
  const buyTool = useGame((s) => s.buyTool);
  const [bulk, setBulk] = useState<1 | 10 | 25>(1);

  const tool = TOOL_MAP[currentTool];
  const nt = nextTool(currentTool);

  return (
    <div className="upgrades">
      {/* 工具主线 */}
      <div className="toolBox">
        <div className="toolNow">
          当前工具 <b>{tool.emoji} {tool.name}</b>（拆解 {fmt(tool.power)}）
        </div>
        {nt ? (
          <button className="btn tool" disabled={m < nt.cost} onClick={buyTool}>
            升级到 {nt.emoji} {nt.name}（拆解 {fmt(nt.power)}）<span className="cost">{money(nt.cost)}</span>
          </button>
        ) : (
          <div className="toolMax">🔫 已是顶级工具</div>
        )}
      </div>

      <div className="bulkRow">
        购买数量：
        {([1, 10, 25] as const).map((n) => (
          <button key={n} className={'chip' + (bulk === n ? ' on' : '')} onClick={() => setBulk(n)}>
            ×{n}
          </button>
        ))}
      </div>

      <div className="upgradeList">
        {UPGRADES.map((u) => {
          const need = UPGRADE_STAGE[u.id] ?? 1;
          if (stage < need) {
            return (
              <div className="upgradeRow locked" key={u.id}>
                <span className="lockIcon">🔒</span>
                <span className="upInfo">阶段 {need} 解锁</span>
              </div>
            );
          }
          const lvl = upgrades[u.id] ?? 0;
          const maxed = u.maxLevel > 0 && lvl >= u.maxLevel;
          const buyN = u.maxLevel > 0 ? Math.min(bulk, u.maxLevel - lvl) : bulk;
          const cost = maxed ? 0 : upgradeBulkCost(u, lvl, buyN);
          const oneCost = upgradeCost(u, lvl);
          return (
            <div className="upgradeRow" key={u.id}>
              <div className="upMain">
                <span className="upEmoji">{u.emoji}</span>
                <div className="upText">
                  <div className="upName">
                    {u.name} <span className="upLvl">Lv.{lvl}{u.maxLevel > 0 ? `/${u.maxLevel}` : ''}</span>
                  </div>
                  <div className="upDesc">{u.desc}</div>
                </div>
              </div>
              {maxed ? (
                <div className="upMax">MAX</div>
              ) : (
                <button
                  className="btn buy"
                  disabled={m < cost}
                  onClick={() => buyUpgrade(u.id, bulk)}
                  title={`下一级 ${money(oneCost)}`}
                >
                  ×{buyN}
                  <span className="cost">{money(cost)}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
