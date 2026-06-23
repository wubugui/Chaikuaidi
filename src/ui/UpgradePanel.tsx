import { useState } from 'react';
import { ITEM_MAP } from '../data/items';
import { MATERIALS, type MaterialId } from '../data/materials';
import { TOOLS, toolUpgradeCost } from '../data/tools';
import { UPGRADES, upgradeBulkCost, upgradeCost } from '../data/upgrades';
import { useGame } from '../game/store';
import { money } from '../lib/format';

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
  const ownedTools = useGame((s) => s.ownedTools);
  const toolLevels = useGame((s) => s.toolLevels);
  const inventory = useGame((s) => s.inventory);
  const buyUpgrade = useGame((s) => s.buyUpgrade);
  const buyTool = useGame((s) => s.buyTool);
  const selectTool = useGame((s) => s.selectTool);
  const upgradeTool = useGame((s) => s.upgradeTool);
  const [bulk, setBulk] = useState<1 | 10 | 25>(1);

  return (
    <div className="upgrades">
      {/* 工具箱 */}
      <div className="toolboxGrid">
        {TOOLS.map((t) => {
          const owned = ownedTools.includes(t.id);
          const equipped = t.id === currentTool;
          // 亲和度摘要：该工具擅长（>=1）的材质 emoji
          const affList = (Object.keys(t.affinity) as MaterialId[])
            .filter((mat) => (t.affinity[mat] ?? 0) >= 1)
            .sort((a, b) => (t.affinity[b] ?? 0) - (t.affinity[a] ?? 0));

          if (!owned) {
            if (stage < t.unlockStage) {
              return (
                <div className="toolCard locked" key={t.id}>
                  <div className="toolCardHead">
                    <span className="toolCardEmoji">{t.emoji}</span>
                    <span className="toolCardName">{t.name}</span>
                  </div>
                  <div className="toolLock">🔒 阶段{t.unlockStage}</div>
                </div>
              );
            }
            return (
              <div className="toolCard" key={t.id}>
                <div className="toolCardHead">
                  <span className="toolCardEmoji">{t.emoji}</span>
                  <span className="toolCardName">{t.name}</span>
                </div>
                <div className="toolAff">
                  {affList.map((mat) => (
                    <span key={mat} title={MATERIALS[mat].name}>{MATERIALS[mat].emoji}</span>
                  ))}
                </div>
                <button className="btn buy" disabled={m < t.cost} onClick={() => buyTool(t.id)}>
                  购买 <span className="cost">{money(t.cost)}</span>
                </button>
              </div>
            );
          }

          const lvl = toolLevels[t.id] ?? 0;
          const cost = toolUpgradeCost(t, lvl);
          const matId = t.upgradeMat;
          const matHave = matId ? inventory[matId] ?? 0 : Infinity;
          const matDef = matId ? ITEM_MAP[matId] : null;
          const canUpgrade = m >= cost.money && matHave >= cost.mat;

          return (
            <div className={'toolCard owned' + (equipped ? ' equipped' : '')} key={t.id}>
              <div className="toolCardHead">
                <span className="toolCardEmoji">{t.emoji}</span>
                <span className="toolCardName">{t.name} <span className="toolLvl">Lv.{lvl}</span></span>
              </div>
              <div className="toolAff">
                {affList.map((mat) => (
                  <span key={mat} title={MATERIALS[mat].name}>{MATERIALS[mat].emoji}</span>
                ))}
              </div>
              <div className="toolBtns">
                <button
                  className={'btn small' + (equipped ? ' primary' : '')}
                  disabled={equipped}
                  onClick={() => selectTool(t.id)}
                >
                  {equipped ? '已装备' : '装备'}
                </button>
                <button
                  className="btn small buy"
                  disabled={!canUpgrade}
                  onClick={() => upgradeTool(t.id)}
                  title={`+20% 拆解`}
                >
                  升级
                  <span className="cost">
                    {money(cost.money)}
                    {matDef ? ` ${cost.mat}×${matDef.emoji}` : ''}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
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
