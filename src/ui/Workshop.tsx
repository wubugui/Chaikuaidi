import { BLUEPRINTS, DEVICE_BLUEPRINT, type BlueprintDef } from '../data/blueprints';
import { AUTO_LINE_INTERVAL, factoryFree } from '../game/state';
import { PIPELINE_INTERVAL, PIPELINE_NAME, PIPELINE_SPACE } from '../data/giants';
import { REFINE_INTERVAL, REFINERY_DEVICE, REFINERY_SPACE } from '../data/refine';
import { ORDNANCE } from '../data/ordnance';
import { ITEM_MAP } from '../data/items';
import { MATERIALS } from '../data/materials';
import { useGame } from '../game/store';
import { fmt, money } from '../lib/format';
import { GameIcon } from './GameIcon';

function deviceEffectLine(devId: string, count: number): string {
  const bp = DEVICE_BLUEPRINT[devId];
  if (PIPELINE_SPACE[devId]) {
    const per = (PIPELINE_INTERVAL / count).toFixed(1);
    const what = devId === 'pipeline_heavy' ? '货轮/坦克' : '汽车/客机';
    return `${PIPELINE_NAME[devId]} ×${count}（占厂房 ${PIPELINE_SPACE[devId] * count} 格）：每 ~${per}s 拆掉一件${what}`;
  }
  if (devId === REFINERY_DEVICE) {
    const per = (REFINE_INTERVAL / count).toFixed(1);
    return `提炼炉 ×${count}（占厂房 ${REFINERY_SPACE * count} 格）：每 ~${per}s 自动精炼一炉元素`;
  }
  if (!bp) return `${devId} ×${count}`;
  if (bp.autolineMaterial) {
    const mat = MATERIALS[bp.autolineMaterial];
    const per = (AUTO_LINE_INTERVAL / count).toFixed(1);
    return `${bp.name.replace('图纸', '')} ×${count}：每 ~${per}s 自动拆一个积压的${mat.name}货`;
  }
  if (devId === 'sorter') {
    return `零件分拣机 ×${count}：全局零件掉率 +${count * 5}%`;
  }
  return `${bp.name} ×${count}`;
}

/** 该图纸合成时是否被厂房空间卡住（拆卸管线/提炼炉占地） */
function pipelineSpaceBlocked(s: ReturnType<typeof useGame.getState>, bp: BlueprintDef): boolean {
  if (bp.result.type !== 'device') return false;
  const need = bp.result.id === REFINERY_DEVICE ? REFINERY_SPACE : PIPELINE_SPACE[bp.result.id];
  return !!need && factoryFree(s) < need;
}

function craftable(s: ReturnType<typeof useGame.getState>, bp: BlueprintDef): boolean {
  if (!s.blueprints.includes(bp.id)) return false;
  if (s.money < bp.moneyCost) return false;
  for (const inp of bp.inputs) if ((s.inventory[inp.item] ?? 0) < inp.qty) return false;
  if (pipelineSpaceBlocked(s, bp)) return false;
  return true;
}

export function Workshop() {
  const s = useGame();
  const stage = useGame((st) => st.stage);
  const m = useGame((st) => st.money);
  const blueprints = useGame((st) => st.blueprints);
  const target = useGame((st) => st.targetBlueprint);
  const devices = useGame((st) => st.devices);
  const deviceEnabled = useGame((st) => st.deviceEnabled);
  const ordnance = useGame((st) => st.ordnance);
  const buyBlueprint = useGame((st) => st.buyBlueprint);
  const setTarget = useGame((st) => st.setTargetBlueprint);
  const craft = useGame((st) => st.craftBlueprint);
  const toggleDevice = useGame((st) => st.toggleDevice);

  const builtIds = Object.keys(devices).filter((d) => (devices[d] ?? 0) > 0);
  const ownedOrd = ORDNANCE.filter((o) => (ordnance[o.id] ?? 0) > 0);

  return (
    <div className="workshop">
      <p className="shopHint">拆解掉的零件在这里变成自动化设备。设一张图纸为「目标」，它要的零件会在掉落和背包里发光。</p>

      <h3 className="shopSecTitle"><GameIcon kind="ui" id="blueprint" className="inlineIcon" />图纸 / 合成</h3>
      {BLUEPRINTS.map((bp) => {
        const owned = blueprints.includes(bp.id);
        const locked = stage < bp.unlockStage;
        const isTarget = target === bp.id;
        const canCraft = craftable(s, bp);
        const built =
          bp.result.type === 'device'
            ? (devices[bp.result.id] ?? 0)
            : bp.result.type === 'ordnance'
              ? (ordnance[bp.result.id] ?? 0)
              : 0;
        return (
          <div className={'bpCard' + (locked ? ' locked' : '') + (isTarget ? ' bpTarget' : '')} key={bp.id}>
            <div className="bpHead">
              <GameIcon className="bpEmoji" kind="blueprint" id={bp.id} name={bp.name} emoji={bp.emoji} />
              <div className="bpInfo">
                <div className="bpName">
                  {bp.name}
                  {built > 0 && <span className="bpBuilt">已建 ×{built}</span>}
                </div>
                <div className="bpDesc">{bp.desc}</div>
              </div>
            </div>

            {owned && (
              <div className="bpInputs">
                {bp.inputs.map((inp) => {
                  const have = s.inventory[inp.item] ?? 0;
                  const met = have >= inp.qty;
                  const it = ITEM_MAP[inp.item];
                  const emphasize = isTarget && !met;
                  return (
                    <span
                      key={inp.item}
                      className={'bpReq' + (met ? ' met' : ' unmet') + (emphasize ? ' bpReqTarget' : '')}
                      title={it?.name}
                    >
                      {emphasize && <GameIcon kind="ui" id="spark" className="tinyIcon" />}
                      <GameIcon kind="item" id={it?.id} name={it?.name} emoji={it?.emoji} className="tinyIcon" /> {have}/{inp.qty}
                    </span>
                  );
                })}
                <span className="bpMoney"><GameIcon kind="ui" id="sell" className="tinyIcon" /> {money(bp.moneyCost)}</span>
              </div>
            )}

            <div className="bpActions">
              {locked ? (
                <div className="batchLock"><GameIcon kind="ui" id="lock" className="tinyIcon" />阶段{bp.unlockStage}</div>
              ) : !owned ? (
                <button className="btn buy" disabled={m < bp.buyCost} onClick={() => buyBlueprint(bp.id)}>
                  买图纸<span className="cost">{money(bp.buyCost)}</span>
                </button>
              ) : (
                <>
                  <button
                    className={'btn small' + (isTarget ? ' primary' : '')}
                    onClick={() => setTarget(isTarget ? null : bp.id)}
                  >
                    {isTarget ? <><GameIcon kind="ui" id="target" className="tinyIcon" />目标中</> : '设为目标'}
                  </button>
                  <button className="btn small primary" disabled={!canCraft} onClick={() => craft(bp.id)}>
                    合成
                  </button>
                  {pipelineSpaceBlocked(s, bp) && (
                    <span className="benchFullHint"><GameIcon kind="ui" id="factory" className="tinyIcon" />厂房放不下，先去厂房扩建</span>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}

      <h3 className="shopSecTitle"><GameIcon kind="ui" id="factory" className="inlineIcon" />设备</h3>
      {builtIds.length === 0 ? (
        <div className="invEmpty">还没造任何设备～合成一台自动拆转区，让它替你拆积压货。</div>
      ) : (
        <div className="deviceList">
          {builtIds.map((d) => {
            // 分拣机是被动加成（不 tick）：不需要开关。其余（自动线 / 提炼炉）默认停工，需手动开启
            const togglable = d !== 'sorter';
            const on = !!deviceEnabled[d];
            return (
              <div className="deviceRow" key={d}>
                <GameIcon className="deviceEmoji" kind="blueprint" id={DEVICE_BLUEPRINT[d]?.id} name={DEVICE_BLUEPRINT[d]?.name} emoji={DEVICE_BLUEPRINT[d]?.emoji} />
                <span className="deviceEffect">{deviceEffectLine(d, devices[d])}</span>
                {togglable && (
                  <button
                    className={'btn small deviceToggle' + (on ? ' primary' : '')}
                    onClick={() => toggleDevice(d)}
                    title={on ? '点击停工' : '点击开始运行（默认停工）'}
                  >
                    {on ? <><GameIcon kind="ui" id="running" className="tinyIcon" />运行中</> : <><GameIcon kind="ui" id="paused" className="tinyIcon" />已停</>}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <h3 className="shopSecTitle"><GameIcon kind="ui" id="boom" className="inlineIcon" />军火库</h3>
      {ownedOrd.length === 0 ? (
        <div className="invEmpty">还没造军火～用元素合成核弹/EMP/轨道炮，去厂房「轰开」离谱货。</div>
      ) : (
        <div className="deviceList">
          {ownedOrd.map((o) => (
            <div className="deviceRow" key={o.id}>
              <GameIcon className="deviceEmoji" kind="ordnance" id={o.id} name={o.name} emoji={o.emoji} />
              <span className="deviceEffect">{o.name} ×{fmt(ordnance[o.id])} —— {o.desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
