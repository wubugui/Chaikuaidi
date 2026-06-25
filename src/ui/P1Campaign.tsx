import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ACCIDENT_ARCHIVE_MAP,
  BLACK_MARKET_OFFER_MAP,
  GOODS_SHOP,
  ITEM_MAP,
  TOOL_SHOP,
  MACHINES,
  RISK_MAP,
  RUMOR_MAP,
  TARGET_MAP,
  TARGETS,
  TOOLS,
} from '../content';
import type { PartDef, RiskLevel, TargetDef } from '../content/types';
import { SELLER_MAP } from '../content/sellers';
import { actions } from '../game/actions';
import { onGameFx, type GameFxEvent } from '../game/runtimeEvents';
import { runtimeGameStore, useRuntimeGame } from '../game/runtimeStore';
import { getAudioVolume, setAudioVolume, sfxBonk, sfxBoom, sfxCash, sfxCrack, sfxMaterialHit } from '../lib/audio';
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

/** 砸击源 id -> 手绘工具图标（工具坞 + 鼠标光标用） */
const TOOL_ICON: Record<string, string> = {
  hand: '/game-art/icons/tool-hand.png',
  hammer: '/game-art/icons/tool-press.png',
  crowbar: '/game-art/icons/tool-crowbar.png',
  'remote-probe': '/game-art/icons/tool-disarm.png',
  'mecha-fist': '/game-art/icons/mutation-mecharm.png',
  'mecha-shoulder-ram': '/game-art/icons/tool-press.png',
  'gundam-pile': '/game-art/icons/tool-laserrig.png',
  'ultra-beam': '/game-art/icons/tool-laserrig.png',
  'ultra-stomp': '/game-art/icons/mutation-sawlegs.png',
  'ultra-flying-kick': '/game-art/icons/mutation-sawlegs.png',
};
function toolIcon(id: string): string {
  return TOOL_ICON[id] ?? '/game-art/icons/tool-hand.png';
}

type PanelId = 'targets' | 'goods' | 'market' | 'machines' | 'routes' | 'lore' | 'settings';

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
  const [openPanel, setOpenPanel] = useState<PanelId | null>(null);
  const [shake, setShake] = useState('');
  const [freeze, setFreeze] = useState(false);
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);
  const [sellerOpen, setSellerOpen] = useState(true);
  const [sellerLine, setSellerLine] = useState(0);
  const [bursts, setBursts] = useState<Array<{ id: number; x: number; y: number; kind: string; bits: Array<{ tx: number; ty: number }> }>>([]);
  const holdTimer = useRef<number | null>(null);
  const heldPart = useRef<string | null>(null);
  const shakeTimer = useRef<number | null>(null);
  const freezeTimer = useRef<number | null>(null);
  const burstId = useRef(0);
  const hitPos = useRef({ x: 50, y: 46 });
  const didBoot = useRef(false);

  useEffect(() => {
    if (didBoot.current) return;
    didBoot.current = true;
    actions.ensureP1Run();
    if (!run.currentTarget && !run.runResult) {
      // 开局即上工：先拆快递。快递是老哥的日常工作，没钱时永远能回来拆。
      window.setTimeout(() => actions.openParcel(), 0);
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
      if (event.kind === 'hit') {
        const material = event.targetId && event.partId ? TARGET_MAP[event.targetId]?.parts.find((part) => part.id === event.partId)?.material : undefined;
        sfxMaterialHit(material ?? 'paper');
      }
      if (event.kind === 'ineffective') sfxBonk();
      if (event.kind === 'crack' || event.kind === 'final-break') sfxCrack();
      if (event.kind === 'accident') sfxBoom();
      if (event.kind === 'reward') sfxCash();
      // 砸感：按事件强度触发震屏 / 闪白
      const level =
        event.kind === 'final-break' || event.kind === 'accident'
          ? 'shakeL flash'
          : event.kind === 'crack'
            ? 'shakeM'
            : event.kind === 'hit'
              ? 'shakeS'
              : '';
      if (level) {
        setShake(level);
        if (shakeTimer.current) window.clearTimeout(shakeTimer.current);
        shakeTimer.current = window.setTimeout(() => setShake(''), 240);
      }
      // 砸感：在命中点炸出碎片
      if (event.kind === 'hit' || event.kind === 'crack' || event.kind === 'final-break') {
        const count = event.kind === 'final-break' ? 14 : event.kind === 'crack' ? 9 : 5;
        const bits = Array.from({ length: count }, () => ({
          tx: Math.round((Math.random() - 0.5) * 90),
          ty: Math.round(-10 - Math.random() * 70),
        }));
        const id = ++burstId.current;
        setBursts((list) => [...list.slice(-6), { id, x: hitPos.current.x, y: hitPos.current.y, kind: event.kind, bits }]);
        window.setTimeout(() => setBursts((list) => list.filter((item) => item.id !== id)), 640);
      }
      // 命中卡帧 hitstop：裂开/砸开瞬间短暂定格，强调打击感
      if (event.kind === 'crack' || event.kind === 'final-break') {
        setFreeze(true);
        if (freezeTimer.current) window.clearTimeout(freezeTimer.current);
        freezeTimer.current = window.setTimeout(() => setFreeze(false), event.kind === 'final-break' ? 130 : 55);
      }
    });
  }, []);

  useEffect(() => {
    return () => {
      if (holdTimer.current) window.clearInterval(holdTimer.current);
      if (shakeTimer.current) window.clearTimeout(shakeTimer.current);
      if (freezeTimer.current) window.clearTimeout(freezeTimer.current);
    };
  }, []);

  // 兜底：无论指针在哪松开（包括按钮因部位砸开变 disabled 不再回调的情况），都停手
  useEffect(() => {
    const release = () => {
      if (holdTimer.current) {
        window.clearInterval(holdTimer.current);
        holdTimer.current = null;
      }
      heldPart.current = null;
      actions.stopHit();
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    return () => {
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
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

  // 拥有的工具 -> 工具坞 + 数字键热键
  const ownedTools = useMemo(() => TOOLS.filter((tool) => run.tools[tool.id]), [run.tools]);
  const activeTool = TOOLS.find((tool) => tool.id === run.selectedSourceId) ?? ownedTools[0];
  const stageCursor = activeTool ? `url("${assetUrl(toolIcon(activeTool.id))}") 16 16, crosshair` : 'crosshair';

  // 新手向导：根据当前处境给"下一步该干嘛"的一句话提示（条件满足即自动消失，不啰嗦）
  const onParcel = !!target && target.id.startsWith('parcel-');
  const onlyHand = ownedTools.length <= 1;
  const cheapestGood = Math.min(...GOODS_SHOP.map((g) => g.price));
  const coachTip: string | null = (() => {
    if (run.runResult) return null;
    if (target && !onParcel && onlyHand) return '徒手砸不动这种硬货 —— 开「货架」买把趁手工具，或「当废铁卖」换废料、回去拆快递。';
    if (onParcel && onlyHand && run.money >= 120) return '钱够了！开「货架」里的工具铺，买把大锤拆得更快。';
    if (run.ownedGoods.length === 0 && run.money >= cheapestGood && !onlyHand) return '攒够钱了，开「货架」买件稀罕货，砸开看看里面是什么。';
    if (!run.autoPipelineUnlocked && run.money >= 1200) return '钱够建「自动拆快递管线」了：点工具坞的「自动拆」，以后躺着收钱。';
    return null;
  })();

  // 命中点（碎片/抖动定位）与目标整体损坏度（diegetic：越砸越暗越糙）
  const selectedHotspot = currentView?.hotspots.find((spot) => spot.partId === selectedPartId);
  if (selectedHotspot) {
    hitPos.current = {
      x: (selectedHotspot.x + selectedHotspot.width / 2) * 100,
      y: (selectedHotspot.y + selectedHotspot.height / 2) * 100,
    };
  }
  let dmgHp = 0;
  let dmgMax = 0;
  if (run.currentTarget) {
    for (const partState of Object.values(run.currentTarget.parts)) {
      if (partState.exposed) {
        dmgHp += partState.hp;
        dmgMax += partState.maxHp;
      }
    }
  }
  const targetDamage = dmgMax > 0 ? Math.min(1, Math.max(0, 1 - dmgHp / dmgMax)) : 0;
  const spriteFilter = `drop-shadow(0 26px 20px #000c) brightness(${(1 - targetDamage * 0.3).toFixed(3)}) contrast(${(1 + targetDamage * 0.28).toFixed(3)}) saturate(${(1 - targetDamage * 0.34).toFixed(3)})`;

  // 卖家对白气泡（diegetic）：第一句用目标 intro，之后轮播卖家吐槽
  const seller = target?.sellerId ? SELLER_MAP[target.sellerId] : undefined;
  const sellerLines = seller ? [target?.intro ?? '', ...seller.lines].filter(Boolean) : [];
  const sellerText = sellerLines.length ? sellerLines[sellerLine % sellerLines.length] : '';
  useEffect(() => {
    setSellerOpen(true);
    setSellerLine(0);
  }, [target?.id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenPanel(null);
      const num = Number(event.key);
      if (num >= 1 && num <= 9 && ownedTools[num - 1]) {
        actions.selectSource(ownedTools[num - 1].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ownedTools]);

  const stopHold = () => {
    if (holdTimer.current) {
      window.clearInterval(holdTimer.current);
      holdTimer.current = null;
    }
    heldPart.current = null;
    actions.stopHit();
  };

  const startHold = (partId: string, event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    stopHold();
    heldPart.current = partId;
    actions.startHit(partId, run.selectedSourceId);
    actions.hitPart(partId, run.selectedSourceId);
    holdTimer.current = window.setInterval(() => {
      const pid = heldPart.current;
      if (!pid) return;
      const live = runtimeGameStore.getState().run;
      const partRuntime = live.currentTarget?.parts[pid];
      // 部位砸开 / 目标结束 / 不可砸 -> 自动停手，别再对着空气狂刷"砸不到"
      if (!live.currentTarget || !partRuntime || partRuntime.destroyed || !partRuntime.exposed) {
        stopHold();
        return;
      }
      actions.hitPart(pid, live.selectedSourceId);
    }, run.hitMode === 'remote' ? 460 : 260);
  };

  const startTarget = (targetId: string) => {
    stopHold();
    setOpenPanel(null);
    actions.dismissResult();
    actions.startTarget(targetId);
  };

  const continueAfterResult = () => {
    const result = run.runResult;
    const completedTarget = result?.targetId ? TARGET_MAP[result.targetId] : undefined;
    actions.dismissResult();
    // 拆完快递就继续拆下一个快递（日常工作流）；拆完特殊货物则回到目标清单挑下一件。
    if (result?.reason === 'completed') {
      if (completedTarget && completedTarget.id.startsWith('parcel-')) actions.openParcel();
      else actions.startRecommendedTarget();
    }
  };

  // 底部菜单坞：低频面板按需打开，平时不在屏上
  const showMarket = meta.unlockedPanels.includes('black-market') || meta.rumors.includes('rumor-black-market-missile') || meta.rumors.includes('rumor-black-market-open');
  const showMachines = true; // 起手就有起步机械，随时可部署/升级
  const showRoutes = meta.unlockedPanels.includes('factory') || meta.unlockedPanels.includes('expedition') || meta.giantForms.unlockedSourceIds.length > 0;
  const menu: Array<{ id: PanelId; icon: string; label: string; show: boolean }> = [
    { id: 'targets', icon: '/game-art/icons/ui-target.png', label: '目标', show: true },
    { id: 'goods', icon: '/game-art/icons/ui-merchant.png', label: '货架', show: true },
    { id: 'market', icon: '/game-art/icons/ui-merchant.png', label: '黑市', show: showMarket },
    { id: 'machines', icon: '/game-art/icons/ui-factory.png', label: '机械', show: showMachines },
    { id: 'routes', icon: '/game-art/icons/ui-map.png', label: '路线', show: showRoutes },
    { id: 'lore', icon: '/game-art/icons/ui-collection.png', label: '档案', show: true },
    { id: 'settings', icon: '/game-art/icons/ui-workshop.png', label: '设置', show: true },
  ];

  return (
    <div
      className={`p1Campaign ${target?.scale ?? 'idle'} ${Date.now() < run.rageBurstUntil ? 'rageBursting' : ''} ${freeze ? 'frozen' : ''}`}
      onContextMenu={(event) => event.preventDefault()}
      data-testid="p1-campaign"
    >
      {/* ===== 砸击现场：铺满整窗 ===== */}
      <div className={`p1Stage ${shake}`} style={{ cursor: target ? stageCursor : 'default' }}>
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
              style={{ filter: spriteFilter }}
            />
            {targetDamage > 0.06 && (
              <div className={`p1Damage ${target.scale}`} style={{ opacity: Math.min(0.9, targetDamage) }} aria-hidden="true" />
            )}
            <div className="p1Worker" title={`老哥状态：${rageState}`}>
              <img src={workerSrc} alt="" draggable={false} />
            </div>
            {/* 分层高亮：把当前视角每个部位从原图里裁出来，hover/选中时那一块真实美术亮起来 */}
            {target.scale !== 'desktop' &&
              currentView?.hotspots.map((hotspot) => {
                const part = target.parts.find((item) => item.id === hotspot.partId);
                const runtimePart = run.currentTarget?.parts[hotspot.partId];
                if (!part || !runtimePart?.exposed || runtimePart.destroyed) return null;
                const cutStage = stageForPart(target, part, runtimePart.hp, runtimePart.maxHp);
                const cutArt = cutStage?.art ?? target.icon;
                const partRisk = part.riskTriggers.map((trigger) => run.risks[trigger.riskId]).find(Boolean);
                const active = hoveredPart === part.id || selectedPartId === part.id;
                const inset = `${(hotspot.y * 100).toFixed(2)}% ${((1 - hotspot.x - hotspot.width) * 100).toFixed(2)}% ${((1 - hotspot.y - hotspot.height) * 100).toFixed(2)}% ${(hotspot.x * 100).toFixed(2)}%`;
                return (
                  <span
                    key={`cut-${hotspot.id}`}
                    className={`p1PartCut ${active ? 'active' : ''} ${riskClass(partRisk?.level)}`}
                    style={{ clipPath: `inset(${inset} round 14px)` }}
                    aria-hidden="true"
                  >
                    <img className={`p1PartCutImg ${target.scale}`} src={assetUrl(cutArt)} alt="" draggable={false} />
                  </span>
                );
              })}
            {currentView?.hotspots.map((hotspot) => {
              const part = target.parts.find((item) => item.id === hotspot.partId);
              const runtimePart = run.currentTarget?.parts[hotspot.partId];
              if (!part || !runtimePart?.exposed) return null;
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
                  onPointerDown={(event) => {
                    actions.selectSource(run.selectedSourceId);
                    startHold(part.id, event);
                  }}
                  onPointerEnter={() => setHoveredPart(part.id)}
                  onPointerUp={stopHold}
                  onPointerCancel={stopHold}
                  onPointerLeave={() => {
                    setHoveredPart((current) => (current === part.id ? null : current));
                    stopHold();
                  }}
                  onClick={(event) => event.stopPropagation()}
                >
                  <span className="p1HotspotMark" aria-hidden="true" />
                  <span className="p1HotspotName">{part.name}</span>
                </button>
              );
            })}
            <div className="p1Particles" aria-hidden="true">
              {bursts.map((burst) =>
                burst.bits.map((bit, index) => (
                  <span
                    key={`${burst.id}-${index}`}
                    className={`p1Particle ${burst.kind}`}
                    style={{ left: `${burst.x}%`, top: `${burst.y}%`, ['--tx']: `${bit.tx}px`, ['--ty']: `${bit.ty}px` } as React.CSSProperties}
                  />
                )),
              )}
            </div>
            <div className="p1FxLayer" aria-hidden="true">
              {fxEvents.map((event, index) => (
                <span
                  key={event.id}
                  className={`p1Fx ${event.kind}`}
                  style={{ left: `${30 + ((event.id * 17) % 42)}%`, top: `${28 + ((index * 13) % 34)}%` }}
                >
                  {event.message}
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className="p1NoTarget">
            <strong>本轮作业空闲</strong>
            <span>打开底部「目标」选一个已解锁目标开砸。</span>
          </div>
        )}
      </div>

      {/* ===== 卖家全屏立绘对话（视觉小说式） ===== */}
      {seller && sellerOpen && (
        <div
          className="p1SellerVN"
          onClick={() => (sellerLine + 1 >= sellerLines.length ? setSellerOpen(false) : setSellerLine((line) => line + 1))}
        >
          <img className="p1SellerVNPortrait" src={assetUrl(seller.portrait)} alt={seller.name} draggable={false} />
          <div className="p1SellerVNBox">
            <button className="p1SellerVNClose" onClick={(event) => { event.stopPropagation(); setSellerOpen(false); }} title="跳过">×</button>
            <span className="p1SellerVNName">{seller.name}</span>
            <p className="p1SellerVNText">{sellerText}</p>
            <span className="p1SellerVNHint">{sellerLine + 1 >= sellerLines.length ? '点一下 · 开砸！' : '点一下 · 还有呢'}</span>
          </div>
        </div>
      )}
      {seller && !sellerOpen && (
        <button className="p1SellerReopen" onClick={() => { setSellerLine(0); setSellerOpen(true); }} title={`${seller.name}：再听他叨叨`}>
          <img src={assetUrl(seller.portrait)} alt={seller.name} draggable={false} />
        </button>
      )}

      {/* ===== 顶部极简 HUD ===== */}
      <header className="p1Hud">
        <div className="p1Brand">
          <b>暴躁老哥砸万物</b>
          {target && <span className="p1NowTarget">{target.name}</span>}
        </div>
        <div className="p1StatusStrip">
          <span className="chip money">¥{Math.floor(run.money)}</span>
          <span className="chip scrap">废料 {Math.floor(run.scrap)}</span>
          <span className="chip rep">信誉 {meta.reputation}</span>
          {run.combo > 1 && <span className="chip combo">连击 ×{run.combo}</span>}
        </div>
        <div className={`p1RageWrap ${rageState === '失控' || rageState === '暴怒' ? 'hot' : ''}`} title={`老哥状态：${rageState}`}>
          <span className="p1RageLabel">怒气 · {rageState}</span>
          <div className="p1RageMeter"><i style={{ width: `${Math.min(100, run.rage)}%` }} /></div>
        </div>
      </header>

      {/* ===== 视角切换（场景内，多视角才出现） ===== */}
      {target && run.currentTarget && target.views.length > 1 && (
        <div className="p1ViewSwitch">
          {target.views.map((view) => {
            const unlocked = run.currentTarget?.unlockedViews.includes(view.id);
            return (
              <button key={view.id} disabled={!unlocked} className={view.id === currentView?.id ? 'active' : ''} onClick={() => actions.switchView(view.id)}>
                {view.name}
              </button>
            );
          })}
        </div>
      )}

      {/* ===== 新手向导：一句话下一步（满足条件自动消失） ===== */}
      {coachTip && !openPanel && (
        <div className="p1Coach" data-testid="coach-tip">{coachTip}</div>
      )}

      {/* ===== 底部操作坞 ===== */}
      <footer className="p1Dock">
        <div className="p1ToolDock" onWheel={(event) => {
          if (ownedTools.length < 2) return;
          const idx = ownedTools.findIndex((tool) => tool.id === activeTool?.id);
          const next = ownedTools[(idx + (event.deltaY > 0 ? 1 : -1) + ownedTools.length) % ownedTools.length];
          if (next) actions.selectSource(next.id);
        }}>
          <button
            className="p1ParcelBtn"
            onClick={() => actions.openParcel()}
            title="回去拆快递：老哥的日常工作，永远有货、永远来钱"
          >
            <span>拆快递</span>
            <small>日常</small>
          </button>
          <button
            className={`p1AutoBtn ${run.autoPipeline ? 'on' : ''} ${run.autoPipelineUnlocked ? '' : 'locked'}`}
            onClick={() => actions.toggleAutoPipeline()}
            title={run.autoPipelineUnlocked
              ? '自动拆快递管线：开启后自动连拆快递、自动结算、自动开下一单（只对快递生效）'
              : '后期里程碑升级：花 ¥1200 建一条自动拆快递管线，建好就被动收钱，老哥不用一直点'}
          >
            <span>自动拆</span>
            <small>{!run.autoPipelineUnlocked ? '建¥1200' : run.autoPipeline ? '运行中' : '关'}</small>
          </button>
          {ownedTools.map((tool, index) => (
            <button
              key={tool.id}
              className={`p1ToolSlot ${activeTool?.id === tool.id ? 'active' : ''}`}
              onClick={() => actions.selectSource(tool.id)}
              title={`${tool.name}（按 ${index + 1}）`}
            >
              <img className="p1ToolGlyph" src={assetUrl(toolIcon(tool.id))} alt="" draggable={false} />
              <small>{index + 1}</small>
            </button>
          ))}
        </div>

        <div className="p1PartHud">
          {selectedPart && selectedPartState ? (
            <>
              <div className="p1PartLine">
                <strong>{selectedPart.name}</strong>
                <em>{selectedStage?.label}</em>
                {selectedRisk && <span className={`p1RiskTag ${riskClass(selectedRisk.level)}`}>{RISK_MAP[selectedRisk.riskId]?.name ?? '风险'}</span>}
              </div>
              <div className="p1Hp"><i style={{ width: `${Math.max(0, (selectedPartState.hp / selectedPartState.maxHp) * 100)}%` }} /></div>
              <div className="p1PartActions">
                <button onClick={() => actions.inspectPart(selectedPart.id)}>检查</button>
                <button onClick={() => actions.setHitMode(run.hitMode === 'melee' ? 'remote' : 'melee')}>
                  {run.hitMode === 'melee' ? '近身砸' : '远程试探'}
                </button>
                <button className="danger" disabled={!rageReady} onClick={() => actions.useRageBurst(selectedPart.id)}>暴走砸</button>
                {target && !target.id.startsWith('parcel-') && (
                  <button className="ghost" onClick={() => actions.scrapSellCurrent()} title="砸不动？当废铁卖了，按价值折算废料">当废铁卖</button>
                )}
                <button className="ghost" disabled={!target} onClick={() => actions.retreatTarget()}>撤退</button>
              </div>
            </>
          ) : (
            <div className="p1PartIdle">{target ? TUTORIAL_COPY[target.id] ?? target.intro : '打开「目标」开始作业。'}</div>
          )}
        </div>

        <nav className="p1MenuDock">
          {menu.filter((item) => item.show).map((item) => (
            <button
              key={item.id}
              className={openPanel === item.id ? 'active' : ''}
              onClick={() => setOpenPanel((current) => (current === item.id ? null : item.id))}
            >
              <img className="p1MenuGlyph" src={assetUrl(item.icon)} alt="" draggable={false} />
              <small>{item.label}</small>
            </button>
          ))}
        </nav>
      </footer>

      {/* ===== 聚焦面板（按需打开） ===== */}
      {openPanel && (
        <div className="p1Overlay" onPointerDown={() => setOpenPanel(null)}>
          <div className="p1OverlayCard" onPointerDown={(event) => event.stopPropagation()}>
            <div className="p1OverlayHead">
              <b>{menu.find((item) => item.id === openPanel)?.label}</b>
              <button className="p1OverlayClose" onClick={() => setOpenPanel(null)}>×</button>
            </div>
            <div className="p1OverlayBody">
              {openPanel === 'targets' && (
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
                          {completed ? '已砸开' : !unlocked ? `${item.phase.toUpperCase()} 传闻锁定` : item.entryCost?.money ? `入场 ¥${item.entryCost.money}` : `${item.phase.toUpperCase()} · ${item.scale}`}
                        </small>
                      </button>
                    );
                  })}
                </div>
              )}

              {openPanel === 'goods' && (
                <div className="p1GoodsPanel" data-testid="goods-panel">
                  {/* 工具铺：徒手免费，更趁手的家伙得花拆快递的钱买。没对的工具，硬货砸不动。 */}
                  <div className="p1BlockHeader">
                    <span className="p1Eyebrow">工具铺</span>
                    <b>现金 ¥{Math.floor(run.money)}</b>
                  </div>
                  <div className="p1ToolShop">
                    {TOOL_SHOP.map((tool) => {
                      const owned = !!run.tools[tool.id];
                      const canPay = run.money >= (tool.price ?? 0);
                      return (
                        <div className={`p1ToolShopItem ${owned ? 'owned' : ''}`} key={tool.id} data-testid="tool-shop-item">
                          <img src={assetUrl(toolIcon(tool.id))} alt="" draggable={false} />
                          <div className="p1ToolShopMeta">
                            <strong>{tool.name}</strong>
                            <small>{tool.tags.join('/')}</small>
                          </div>
                          {owned ? (
                            <span className="p1ToolOwned">已拥有</span>
                          ) : (
                            <button className="p1BuyBtn" disabled={!canPay} onClick={() => actions.buyTool(tool.id)}>买 ¥{tool.price}</button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* 货架：买来的独一无二货物。同时只能砸一件，可随时切换，进度保留。 */}
                  <div className="p1BlockHeader">
                    <span className="p1Eyebrow">我的货架</span>
                    <b>{run.ownedGoods.length} 件</b>
                  </div>
                  <div className="p1ShelfList">
                    {run.ownedGoods.length === 0 ? (
                      <em>货架空空。先拆快递攒钱，再到下面买点能砸的稀罕货。</em>
                    ) : (
                      run.ownedGoods.map((good) => {
                        const def = TARGET_MAP[good.targetId];
                        const totalMax = Object.values(good.runtime.parts).reduce((sum, p) => sum + p.maxHp, 0);
                        const totalHp = Object.values(good.runtime.parts).reduce((sum, p) => sum + (p.destroyed ? 0 : p.hp), 0);
                        const progress = totalMax > 0 ? Math.round((1 - totalHp / totalMax) * 100) : 0;
                        const isActive = run.activeGoodInstanceId === good.instanceId;
                        return (
                          <div className={`p1ShelfItem ${isActive ? 'active' : ''}`} key={good.instanceId} data-testid="shelf-item">
                            <img src={assetUrl(def?.icon ?? '')} alt="" draggable={false} />
                            <div className="p1ShelfMeta">
                              <strong>{good.revealed ? def?.name ?? good.targetId : '???（还没上手）'}</strong>
                              <div className="p1ShelfBar"><i style={{ width: `${progress}%` }} /></div>
                              <small>{isActive ? '正在工作台' : `进度 ${progress}%`}</small>
                            </div>
                            <div className="p1ShelfActions">
                              <button disabled={isActive} onClick={() => { actions.activateGood(good.instanceId); setOpenPanel(null); }}>上台砸</button>
                              <button className="ghost" onClick={() => { actions.activateGood(good.instanceId); actions.scrapSellCurrent(); }} title="当废铁卖了换废料">卖废铁</button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* 商店：半盲购买。买之前只看外形、卖家吹嘘和价格，材质/门槛要砸了才知道。 */}
                  <div className="p1BlockHeader">
                    <span className="p1Eyebrow">黑市散货 · 半盲购买</span>
                    <b>现金 ¥{Math.floor(run.money)}</b>
                  </div>
                  <div className="p1ShopList">
                    {GOODS_SHOP.map((offer) => {
                      const canPay = run.money >= offer.price;
                      return (
                        <div className={`p1ShopItem ${offer.tier}`} key={offer.id} data-testid="shop-item">
                          <img src={assetUrl(offer.icon)} alt="" draggable={false} />
                          <div className="p1ShopMeta">
                            <strong>{offer.name}</strong>
                            <p className="p1ShopHype">{offer.hype}</p>
                            <small className="p1ShopHint">{offer.hint}</small>
                          </div>
                          <button className="p1BuyBtn" disabled={!canPay} onClick={() => { actions.buyGood(offer.id); setOpenPanel(null); }}>
                            买 ¥{offer.price}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {openPanel === 'market' && (
                <div data-testid="black-market-panel">
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
                        if (!offer) return null;
                        const canPay = run.money >= (offer.cost.money ?? 0) && meta.reputation >= (offer.cost.reputation ?? 0);
                        return (
                          <div className={`p1Offer ${offer.rarity}`} key={offer.id}>
                            <strong>{offer.title}</strong>
                            <span>{TARGET_MAP[offer.targetId]?.name ?? offer.targetId}</span>
                            <small>¥{offer.cost.money ?? 0} · 信誉 {offer.cost.reputation ?? 0} · {offer.unique ? '独一无二' : '限时'}</small>
                            <div>
                              <button disabled={!canPay} onClick={() => { actions.acceptBlackMarketOffer(offer.id); setOpenPanel(null); }}>接单开砸</button>
                              <button className="ghost" onClick={() => actions.declineBlackMarketOffer(offer.id)}>拒单</button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {openPanel === 'machines' && (
                <div className="p1MachinePanel" data-testid="machines-panel">
                  {/* 升级用稀有材料库存（砸特殊货物掉的） */}
                  <div className="p1MatStrip">
                    <span>废料 {Math.floor(run.scrap)}</span>
                    {['m_hardcore', 'm_pressgem', 'm_oddmatter'].map((id) => (
                      <span key={id} className={(run.materials[id] ?? 0) > 0 ? 'has' : ''}>
                        {ITEM_MAP[id]?.name ?? id} {run.materials[id] ?? 0}
                      </span>
                    ))}
                  </div>
                  <div className="p1MachineGrid">
                    {MACHINES.map((machine) => {
                      const runtime = run.machines[machine.id];
                      const cost = runtime ? actions.machineUpgradeCost(machine.id) : null;
                      const canUpgrade = !!cost
                        && run.money >= cost.money
                        && run.scrap >= cost.scrap
                        && Object.entries(cost.materials).every(([id, n]) => (run.materials[id] ?? 0) >= n);
                      return (
                        <div className={`p1Machine ${runtime?.jammed ? 'jammed' : ''}`} key={machine.id}>
                          <strong>{machine.name} <em className="p1MachineLv">Lv.{runtime?.level ?? 1}</em></strong>
                          <span>{runtime?.deployedPartId ? `部署：${target?.parts.find((part) => part.id === runtime.deployedPartId)?.name ?? runtime.deployedPartId}` : '未部署'}</span>
                          <div className="p1MachineMeter"><i style={{ width: `${runtime ? (runtime.durability / runtime.maxDurability) * 100 : 0}%` }} /></div>
                          <button disabled={!runtime || !selectedPart || !target} onClick={() => selectedPart && actions.deployMachine(machine.id, selectedPart.id)}>部署到当前部位</button>
                          <button disabled={!runtime} onClick={() => actions.repairMachine(machine.id)}>修理</button>
                          {cost ? (
                            <button className="p1UpgradeBtn" disabled={!canUpgrade} onClick={() => actions.upgradeMachine(machine.id)}>
                              升到 Lv.{(runtime?.level ?? 1) + 1}
                              <small>¥{cost.money} · 废料{cost.scrap}{Object.entries(cost.materials).map(([id, n]) => ` · ${ITEM_MAP[id]?.name ?? id}×${n}`).join('')}</small>
                            </button>
                          ) : runtime ? (
                            <button className="p1UpgradeBtn" disabled>已满级 Lv.{runtime.level}</button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {openPanel === 'routes' && (
                <div className="p1Progression">
                  <div className="p1ProgressRows">
                    <span>厂房 Lv.{meta.factory.level} · {meta.factory.usedSlots}/{meta.factory.capacity}</span>
                    <span>管线 {meta.factory.unlockedPipelineIds.length}/3</span>
                    <span>远征完成 {meta.expedition.completedLocationIds.length}</span>
                    <span>巨型形态 {meta.giantForms.unlockedSourceIds.length}/6</span>
                  </div>
                  <div className="p1RouteGrid">
                    {meta.unlockedPanels.includes('factory') && <button onClick={() => actions.upgradeFactory()}>扩建厂房</button>}
                    {meta.giantForms.unlockedSourceIds.map((sourceId) => (
                      <button key={sourceId} className={meta.giantForms.activeSourceId === sourceId ? 'active' : ''} onClick={() => actions.activateGiantForm(sourceId)}>
                        {TOOLS.find((tool) => tool.id === sourceId)?.name ?? sourceId}
                      </button>
                    ))}
                    {meta.giantForms.repairsDue.map((sourceId) => (
                      <button key={`repair-${sourceId}`} onClick={() => actions.repairGiantForm(sourceId)}>修理 {TOOLS.find((tool) => tool.id === sourceId)?.name ?? sourceId}</button>
                    ))}
                    {['赚钱路线', '事故档案路线', '变异路线', '黑市路线', '机械路线', 'Boss路线'].map((route) => (
                      <button key={route} className={meta.routeFocus === route ? 'active' : ''} onClick={() => actions.setRouteFocus(route)}>{route}</button>
                    ))}
                  </div>
                </div>
              )}

              {openPanel === 'lore' && (
                <div className="p1Lore">
                  <span className="p1Eyebrow">传闻</span>
                  <div>{meta.rumors.length === 0 ? <em>还没有传闻。</em> : meta.rumors.map((id) => <span key={id}>{RUMOR_MAP[id]?.title ?? id}</span>)}</div>
                  <span className="p1Eyebrow">事故档案</span>
                  <div>{meta.accidentArchives.length === 0 ? <em>事故档案为空。</em> : meta.accidentArchives.map((id) => <span key={id}>{ACCIDENT_ARCHIVE_MAP[id]?.title ?? id}</span>)}</div>
                </div>
              )}

              {openPanel === 'settings' && (
                <div className="p1Settings">
                  <label>
                    <span>音量 {Math.round(audioVolume * 100)}%</span>
                    <input type="range" min="0" max="1" step="0.05" value={audioVolume} onChange={(event) => { const next = Number(event.currentTarget.value); setAudioVolume(next); setAudioVolumeState(next); }} />
                  </label>
                  <small>震屏和闪光使用低强度默认值，危险提示同时显示文字。数字键 1-9 切工具，滚轮也行。</small>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== 结算 ===== */}
      {run.runResult && (
        <div className="p1ResultOverlay" role="dialog" aria-modal="true">
          <div className="p1ResultCard">
            <span className="p1Eyebrow">旧货市场快报 · 号外</span>
            <h2>
              {run.runResult.reason === 'completed' ? '砸开了！' : run.runResult.reason === 'retreated' ? '老哥及时撤退' : run.runResult.reason === 'death' ? '本轮终结' : '现场发生事故'}
            </h2>
            <div className="p1ClipByline">
              <span>本报砸击现场讯</span>
              <span>信誉 +{run.runResult.reputation}</span>
            </div>
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
