import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ACCIDENT_ARCHIVE_MAP,
  BLACK_MARKET_OFFER_MAP,
  MACHINES,
  RISK_MAP,
  RUMOR_MAP,
  TARGET_MAP,
  TARGETS,
  TOOLS,
} from '../content';
import type { PartDef, RiskLevel, TargetDef } from '../content/types';
import { actions } from '../game/actions';
import { onGameFx, type GameFxEvent } from '../game/runtimeEvents';
import { useRuntimeGame } from '../game/runtimeStore';
import { getAudioVolume, setAudioVolume, sfxBonk, sfxBoom, sfxCash, sfxCrack, sfxRip } from '../lib/audio';
import { assetUrl } from '../lib/asset';

const TUTORIAL_COPY: Record<string, string> = {
  'parcel-basic': '按住发光热区，别松手。',
  'parcel-combo': '连续砸会涨连击，伤害会慢慢变高。',
  'parcel-cash': '砸开后奖励会直接进本轮账本。',
  'parcel-tool': '硬壳箱用锤子、撬棍更舒服。',
  'parcel-before-rage': '最后一个普通快递，后面开始不讲道理。',
  'parcel-tape-final': '每砸掉一层，里面都会露出更欠砸的一层。',
  'safe-stubborn': '先看线索，再决定要不要强砸机关部位。',
  'car-scrapyard': '切视角、部署机械，但最后一击尽量亲手来。',
  'missile-dont-touch': '这不是普通货。检查、远程试探、撤退都是真选项。',
};

function riskClass(level?: RiskLevel) {
  if (!level || level === 'unknown') return 'unknown';
  if (level === 'suspicious') return 'suspicious';
  if (level === 'dangerous') return 'dangerous';
  return 'critical';
}

function stageForPart(target: TargetDef | undefined, part: PartDef | undefined, hp = 0, maxHp = 1) {
  if (!target || !part) return undefined;
  const pct = maxHp > 0 ? hp / maxHp : 0;
  return part.stages.reduce((current, stage) => (pct <= stage.threshold ? stage : current), part.stages[0]);
}

export function P1Campaign() {
  const run = useRuntimeGame((state) => state.run);
  const meta = useRuntimeGame((state) => state.meta);
  const [fxEvents, setFxEvents] = useState<GameFxEvent[]>([]);
  const [audioVolume, setAudioVolumeState] = useState(() => getAudioVolume());
  const holdTimer = useRef<number | null>(null);
  const didBoot = useRef(false);

  useEffect(() => {
    if (didBoot.current) return;
    didBoot.current = true;
    actions.ensureP1Run();
    if (!run.currentTarget && !run.runResult) {
      window.setTimeout(() => actions.startRecommendedTarget(), 0);
    }
  }, [run.currentTarget, run.runResult]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      actions.tickRuntime(0.65);
      actions.tickMachines();
    }, 650);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    return onGameFx((event) => {
      setFxEvents((events) => [...events.slice(-12), event]);
      window.setTimeout(() => setFxEvents((events) => events.filter((item) => item.id !== event.id)), 1150);
      if (event.kind === 'hit') sfxRip();
      if (event.kind === 'ineffective') sfxBonk();
      if (event.kind === 'crack' || event.kind === 'final-break') sfxCrack();
      if (event.kind === 'accident') sfxBoom();
      if (event.kind === 'reward') sfxCash();
    });
  }, []);

  useEffect(() => {
    return () => {
      if (holdTimer.current) window.clearInterval(holdTimer.current);
    };
  }, []);

  const target = run.currentTarget ? TARGET_MAP[run.currentTarget.targetId] : undefined;
  const currentView = target?.views.find((view) => view.id === run.currentTarget?.currentViewId) ?? target?.views[0];
  const visibleParts = useMemo(() => {
    if (!target || !run.currentTarget || !currentView) return [];
    return target.parts.filter((part) => part.viewId === currentView.id && run.currentTarget?.parts[part.id]?.exposed);
  }, [target, run.currentTarget, currentView]);
  const selectedPartId = run.currentTarget?.selectedPartId ?? visibleParts[0]?.id;
  const selectedPart = target?.parts.find((part) => part.id === selectedPartId);
  const selectedPartState = selectedPartId ? run.currentTarget?.parts[selectedPartId] : undefined;
  const selectedStage = stageForPart(target, selectedPart, selectedPartState?.hp, selectedPartState?.maxHp);
  const selectedRiskIds = selectedPart?.riskTriggers.map((trigger) => trigger.riskId) ?? [];
  const selectedRisk = selectedRiskIds.map((id) => run.risks[id]).find(Boolean);
  const rageReady = run.rage >= 100 && Date.now() >= run.rageCooldownUntil;
  const rageState = Date.now() < run.rageBurstUntil ? '失控' : run.rage >= 100 ? '暴怒' : run.rage >= 55 ? '烦躁' : '平静';
  const workerSrc = assetUrl(
    rageState === '失控'
      ? '/game-art/characters/worker-demon.png'
      : rageState === '暴怒'
        ? '/game-art/characters/worker-furious.png'
        : rageState === '烦躁'
          ? '/game-art/characters/worker-angry.png'
          : '/game-art/characters/worker-neutral.png',
  );

  const stopHold = () => {
    if (holdTimer.current) {
      window.clearInterval(holdTimer.current);
      holdTimer.current = null;
    }
    actions.stopHit();
  };

  const startHold = (partId: string, event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    stopHold();
    actions.startHit(partId, run.selectedSourceId);
    actions.hitPart(partId, run.selectedSourceId);
    holdTimer.current = window.setInterval(() => actions.hitPart(partId, run.selectedSourceId), run.hitMode === 'remote' ? 460 : 260);
  };

  const startTarget = (targetId: string) => {
    stopHold();
    actions.dismissResult();
    actions.startTarget(targetId);
  };

  const continueAfterResult = () => {
    const result = run.runResult;
    actions.dismissResult();
    if (result?.reason === 'completed') actions.startRecommendedTarget();
  };

  return (
    <div
      className={`p1Campaign ${target?.scale ?? 'idle'} ${Date.now() < run.rageBurstUntil ? 'rageBursting' : ''}`}
      onPointerDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
      data-testid="p1-campaign"
    >
      <section className="p1StagePanel">
        <div className="p1StageFrame">
          {currentView && <img className="p1StageBg" src={assetUrl(currentView.background)} alt="" draggable={false} />}
          <div className="p1StageShade" />
          {target ? (
            <>
              <div className={`p1TargetAura ${target.scale}`} />
              <img
                className={`p1TargetSprite ${target.scale}`}
                src={assetUrl(selectedStage?.art ?? target.icon)}
                alt={target.name}
                draggable={false}
              />
              <div className="p1Worker" title={`老哥状态：${rageState}`}>
                <img src={workerSrc} alt="" draggable={false} />
                <span>{rageState}</span>
              </div>
              {currentView?.hotspots.map((hotspot) => {
                const part = target.parts.find((item) => item.id === hotspot.partId);
                const runtimePart = run.currentTarget?.parts[hotspot.partId];
                if (!part || !runtimePart?.exposed) return null;
                const pct = Math.max(0, runtimePart.hp / runtimePart.maxHp);
                const partRisk = part.riskTriggers.map((trigger) => run.risks[trigger.riskId]).find(Boolean);
                return (
                  <button
                    key={hotspot.id}
                    className={`p1Hotspot ${runtimePart.destroyed ? 'destroyed' : ''} ${selectedPartId === part.id ? 'selected' : ''} ${riskClass(partRisk?.level)}`}
                    style={{
                      left: `${hotspot.x * 100}%`,
                      top: `${hotspot.y * 100}%`,
                      width: `${hotspot.width * 100}%`,
                      height: `${hotspot.height * 100}%`,
                    }}
                    disabled={runtimePart.destroyed}
                    onPointerDown={(event) => startHold(part.id, event)}
                    onPointerUp={stopHold}
                    onPointerCancel={stopHold}
                    onPointerLeave={stopHold}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <span>{part.name}</span>
                    <i style={{ width: `${pct * 100}%` }} />
                  </button>
                );
              })}
              <div className="p1FxLayer" aria-hidden="true">
                {fxEvents.map((event, index) => (
                  <span
                    key={event.id}
                    className={`p1Fx ${event.kind}`}
                    style={{
                      left: `${18 + ((event.id * 17) % 62)}%`,
                      top: `${24 + ((index * 13) % 38)}%`,
                    }}
                  >
                    {event.message}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="p1NoTarget">
              <strong>本轮作业空闲</strong>
              <span>从右侧选择一个已解锁目标。</span>
            </div>
          )}
        </div>
        <div className="p1StatusStrip">
          <span>本轮现金 ¥{Math.floor(run.money)}</span>
          <span>废料 {Math.floor(run.scrap)}</span>
          <span>信誉 {meta.reputation}</span>
          <span>连击 {run.combo}</span>
          <span>怒气 {Math.floor(run.rage)}%</span>
        </div>
      </section>

      <aside className="p1ControlPanel">
        <div className="p1PanelBlock p1TargetHeader">
          <div>
            <span className="p1Eyebrow">作业目标</span>
            <h2>{target?.name ?? '选择目标'}</h2>
          </div>
          {target && <span className={`p1Scale ${target.scale}`}>{target.phase.toUpperCase()} · {target.scale}</span>}
          <p>{target ? TUTORIAL_COPY[target.id] ?? target.intro : '从快递热身一路推进到黑市、厂房、远征、巨型形态和终局目标。'}</p>
        </div>

        {target && run.currentTarget && (
          <div className="p1PanelBlock">
            <div className="p1ViewTabs">
              {target.views.map((view) => {
                const unlocked = run.currentTarget?.unlockedViews.includes(view.id);
                return (
                  <button key={view.id} disabled={!unlocked} className={view.id === currentView?.id ? 'active' : ''} onClick={() => actions.switchView(view.id)}>
                    {view.name}
                  </button>
                );
              })}
            </div>
            {selectedPart && selectedPartState && (
              <div className="p1PartCard">
                <div className="p1PartTop">
                  <strong>{selectedPart.name}</strong>
                  <span>{selectedStage?.label}</span>
                </div>
                <div className="p1Hp">
                  <i style={{ width: `${Math.max(0, (selectedPartState.hp / selectedPartState.maxHp) * 100)}%` }} />
                </div>
                <div className="p1PartActions">
                  <button onClick={() => actions.inspectPart(selectedPart.id)}>检查</button>
                  <button onClick={() => actions.setHitMode(run.hitMode === 'melee' ? 'remote' : 'melee')}>
                    {run.hitMode === 'melee' ? '近身砸' : '远程试探'}
                  </button>
                  <button className="danger" disabled={!rageReady} onClick={() => actions.useRageBurst(selectedPart.id)}>
                    暴走砸
                  </button>
                </div>
                {selectedRisk && (
                  <div className={`p1Risk ${riskClass(selectedRisk.level)}`}>
                    <b>{RISK_MAP[selectedRisk.riskId]?.name ?? selectedRisk.riskId}</b>
                    <span>{selectedRisk.clues[selectedRisk.clues.length - 1] ?? '风险未知，检查后再决定。'}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="p1PanelBlock">
          <span className="p1Eyebrow">工具</span>
          <div className="p1ToolGrid">
            {TOOLS.map((tool) => {
              const owned = !!run.tools[tool.id];
              const selected = run.selectedSourceId === tool.id;
              return (
                <button key={tool.id} className={selected ? 'active' : ''} disabled={!owned} onClick={() => actions.selectSource(tool.id)}>
                  <strong>{tool.name}</strong>
                  <span>{owned ? `耐久 ${Math.ceil(run.tools[tool.id].durability)}` : `¥${tool.price}`}</span>
                </button>
              );
            })}
          </div>
        </div>

        {(meta.discoveredTargets.includes('car-scrapyard') || meta.unlockedPanels.includes('factory')) && (
          <div className="p1PanelBlock">
            <span className="p1Eyebrow">机械</span>
            <div className="p1MachineGrid">
              {MACHINES.map((machine) => {
                const runtime = run.machines[machine.id];
                return (
                  <div className={`p1Machine ${runtime?.jammed ? 'jammed' : ''}`} key={machine.id}>
                    <strong>{machine.name}</strong>
                    <span>
                      {runtime?.deployedPartId ? `部署：${target?.parts.find((part) => part.id === runtime.deployedPartId)?.name ?? runtime.deployedPartId}` : '未部署'}
                    </span>
                    <div className="p1MachineMeter">
                      <i style={{ width: `${runtime ? (runtime.durability / runtime.maxDurability) * 100 : 0}%` }} />
                    </div>
                    <button disabled={!runtime || !selectedPart || !target} onClick={() => selectedPart && actions.deployMachine(machine.id, selectedPart.id)}>
                      部署到当前部位
                    </button>
                    <button disabled={!runtime} onClick={() => actions.repairMachine(machine.id)}>修理</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(meta.unlockedPanels.includes('black-market') || meta.rumors.includes('rumor-black-market-missile') || meta.rumors.includes('rumor-black-market-open')) && (
          <div className="p1PanelBlock p1BlackMarket" data-testid="black-market-panel">
            <div className="p1BlockHeader">
              <span className="p1Eyebrow">黑市委托</span>
              <b>卖家信任 {meta.blackMarket.sellerTrust}</b>
            </div>
            <button onClick={() => actions.refreshBlackMarket()}>刷新委托</button>
            <div className="p1OfferList">
              {meta.blackMarket.currentOfferIds.length === 0 ? (
                <em>暂无可接委托。</em>
              ) : (
                meta.blackMarket.currentOfferIds.map((offerId) => {
                  const offer = BLACK_MARKET_OFFER_MAP[offerId];
                  const canPay = !!offer && run.money >= (offer.cost.money ?? 0) && meta.reputation >= (offer.cost.reputation ?? 0);
                  if (!offer) return null;
                  return (
                    <div className={`p1Offer ${offer.rarity}`} key={offer.id}>
                      <strong>{offer.title}</strong>
                      <span>{TARGET_MAP[offer.targetId]?.name ?? offer.targetId}</span>
                      <small>¥{offer.cost.money ?? 0} · 信誉 {offer.cost.reputation ?? 0} · {offer.unique ? '独一无二' : '限时'}</small>
                      <div>
                        <button disabled={!canPay} onClick={() => actions.acceptBlackMarketOffer(offer.id)}>接单开砸</button>
                        <button className="ghost" onClick={() => actions.declineBlackMarketOffer(offer.id)}>拒单</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {(meta.unlockedPanels.includes('factory') || meta.unlockedPanels.includes('expedition') || meta.giantForms.unlockedSourceIds.length > 0) && (
          <div className="p1PanelBlock p1Progression">
            <span className="p1Eyebrow">路线 / 设施</span>
            <div className="p1ProgressRows">
              <span>厂房 Lv.{meta.factory.level} · {meta.factory.usedSlots}/{meta.factory.capacity}</span>
              <span>管线 {meta.factory.unlockedPipelineIds.length}/3</span>
              <span>远征完成 {meta.expedition.completedLocationIds.length}</span>
              <span>巨型形态 {meta.giantForms.unlockedSourceIds.length}/6</span>
            </div>
            <div className="p1RouteGrid">
              {meta.unlockedPanels.includes('factory') && (
                <button onClick={() => actions.upgradeFactory()}>
                  扩建厂房
                </button>
              )}
              {meta.giantForms.unlockedSourceIds.map((sourceId) => (
                <button key={sourceId} className={meta.giantForms.activeSourceId === sourceId ? 'active' : ''} onClick={() => actions.activateGiantForm(sourceId)}>
                  {TOOLS.find((tool) => tool.id === sourceId)?.name ?? sourceId}
                </button>
              ))}
              {meta.giantForms.repairsDue.map((sourceId) => (
                <button key={`repair-${sourceId}`} onClick={() => actions.repairGiantForm(sourceId)}>
                  修理 {TOOLS.find((tool) => tool.id === sourceId)?.name ?? sourceId}
                </button>
              ))}
              {['赚钱路线', '事故档案路线', '变异路线', '黑市路线', '机械路线', 'Boss路线'].map((route) => (
                <button key={route} className={meta.routeFocus === route ? 'active' : ''} onClick={() => actions.setRouteFocus(route)}>
                  {route}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="p1PanelBlock">
          <span className="p1Eyebrow">目标清单</span>
          <div className="p1TargetList">
            {TARGETS.map((item) => {
              const unlocked = meta.discoveredTargets.includes(item.id);
              const completed = meta.completedTargets.includes(item.id);
              const canAfford = (!item.entryCost?.money || run.money >= item.entryCost.money) && (!item.entryCost?.reputation || meta.reputation >= item.entryCost.reputation);
              return (
                <button
                  key={item.id}
                  className={`${target?.id === item.id ? 'active' : ''} ${completed ? 'done' : ''}`}
                  disabled={!unlocked || !canAfford}
                  onClick={() => startTarget(item.id)}
                >
                  <span>{unlocked ? item.name : '???'}</span>
                  <small>
                    {completed
                      ? '已砸开'
                      : !unlocked
                        ? `${item.phase.toUpperCase()} 传闻锁定`
                        : item.entryCost?.money
                          ? `入场 ¥${item.entryCost.money}`
                          : `${item.phase.toUpperCase()} · ${item.scale}`}
                  </small>
                </button>
              );
            })}
          </div>
          <button className="p1Retreat" disabled={!target} onClick={() => actions.retreatTarget()}>
            撤退并结算情报
          </button>
        </div>

        <div className="p1PanelBlock p1Lore">
          <span className="p1Eyebrow">传闻 / 档案</span>
          <div>
            {meta.rumors.length === 0 ? <em>还没有传闻。</em> : meta.rumors.map((id) => <span key={id}>{RUMOR_MAP[id]?.title ?? id}</span>)}
          </div>
          <div>
            {meta.accidentArchives.length === 0 ? <em>事故档案为空。</em> : meta.accidentArchives.map((id) => <span key={id}>{ACCIDENT_ARCHIVE_MAP[id]?.title ?? id}</span>)}
          </div>
        </div>

        <div className="p1PanelBlock p1Settings">
          <span className="p1Eyebrow">设置</span>
          <label>
            <span>音量 {Math.round(audioVolume * 100)}%</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={audioVolume}
              onChange={(event) => {
                const next = Number(event.currentTarget.value);
                setAudioVolume(next);
                setAudioVolumeState(next);
              }}
            />
          </label>
          <small>震屏和闪光使用低强度默认值，危险提示同时显示文字。</small>
        </div>
      </aside>

      {run.runResult && (
        <div className="p1ResultOverlay" role="dialog" aria-modal="true">
          <div className="p1ResultCard">
            <span className="p1Eyebrow">本次结算</span>
            <h2>
              {run.runResult.reason === 'completed'
                ? '砸开了'
                : run.runResult.reason === 'retreated'
                  ? '撤退成功'
                  : run.runResult.reason === 'death'
                    ? '本轮结束'
                    : '事故记录'}
            </h2>
            <p>{run.accident?.summary ?? (run.runResult.reason === 'completed' ? '奖励已入账，下一个更离谱。' : '情报保留，长期进度不会清空。')}</p>
            <div className="p1ResultStats">
              <span>现金 +{Math.floor(run.runResult.reason === 'completed' ? run.runResult.money : 0)}</span>
              <span>废料 +{Math.floor(run.runResult.reason === 'completed' ? run.runResult.scrap : 0)}</span>
              <span>信誉 +{run.runResult.reputation}</span>
            </div>
            {run.runResult.worldChanges.length > 0 && <p className="p1WorldChange">{run.runResult.worldChanges[0]}</p>}
            <div className="p1ResultActions">
              {(run.runResult.reason === 'death' || (run.runResult.reason === 'accident' && run.accident?.severity !== 'minor')) ? (
                <button onClick={() => actions.startNewRun()}>开始下一周目</button>
              ) : (
                <button onClick={continueAfterResult}>{run.runResult.reason === 'completed' ? '继续下个目标' : '回到目标清单'}</button>
              )}
              <button className="ghost" onClick={() => actions.dismissResult()}>只关结算</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
