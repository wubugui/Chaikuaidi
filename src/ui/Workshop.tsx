import { BLUEPRINTS, DEVICE_BLUEPRINT, type BlueprintDef } from '../data/blueprints';
import { AUTO_LINE_INTERVAL, factoryFree } from '../game/state';
import { PIPELINE_INTERVAL, PIPELINE_NAME, PIPELINE_SPACE } from '../data/giants';
import { ITEM_MAP } from '../data/items';
import { MATERIALS } from '../data/materials';
import { useGame } from '../game/store';
import { money } from '../lib/format';

function deviceEffectLine(devId: string, count: number): string {
  const bp = DEVICE_BLUEPRINT[devId];
  if (PIPELINE_SPACE[devId]) {
    const per = (PIPELINE_INTERVAL / count).toFixed(1);
    const what = devId === 'pipeline_heavy' ? '货轮/坦克' : '汽车/客机';
    return `${PIPELINE_NAME[devId]} ×${count}（占厂房 ${PIPELINE_SPACE[devId] * count} 格）：每 ~${per}s 拆掉一件${what}`;
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

/** 该图纸合成时是否被厂房空间卡住（拆卸管线占地） */
function pipelineSpaceBlocked(s: ReturnType<typeof useGame.getState>, bp: BlueprintDef): boolean {
  if (bp.result.type !== 'device') return false;
  const need = PIPELINE_SPACE[bp.result.id];
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
  const buyBlueprint = useGame((st) => st.buyBlueprint);
  const setTarget = useGame((st) => st.setTargetBlueprint);
  const craft = useGame((st) => st.craftBlueprint);

  const builtIds = Object.keys(devices).filter((d) => (devices[d] ?? 0) > 0);

  return (
    <div className="workshop">
      <p className="shopHint">拆解掉的 🔩 零件在这里变成自动化设备。设一张图纸为「目标」，它要的零件会在掉落和背包里发光。</p>

      <h3 className="shopSecTitle">📐 图纸 / 合成</h3>
      {BLUEPRINTS.map((bp) => {
        const owned = blueprints.includes(bp.id);
        const locked = stage < bp.unlockStage;
        const isTarget = target === bp.id;
        const canCraft = craftable(s, bp);
        const built = bp.result.type === 'device' ? (devices[bp.result.id] ?? 0) : 0;
        return (
          <div className={'bpCard' + (locked ? ' locked' : '') + (isTarget ? ' bpTarget' : '')} key={bp.id}>
            <div className="bpHead">
              <span className="bpEmoji">{bp.emoji}</span>
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
                      {emphasize && '✨'}
                      {it?.emoji ?? '🔩'} {have}/{inp.qty}
                    </span>
                  );
                })}
                <span className="bpMoney">💰 {money(bp.moneyCost)}</span>
              </div>
            )}

            <div className="bpActions">
              {locked ? (
                <div className="batchLock">🔒 阶段{bp.unlockStage}</div>
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
                    {isTarget ? '🎯 目标中' : '设为目标'}
                  </button>
                  <button className="btn small primary" disabled={!canCraft} onClick={() => craft(bp.id)}>
                    合成
                  </button>
                  {pipelineSpaceBlocked(s, bp) && (
                    <span className="benchFullHint">🏭 厂房放不下，先去厂房扩建</span>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}

      <h3 className="shopSecTitle">⚙️ 设备</h3>
      {builtIds.length === 0 ? (
        <div className="invEmpty">还没造任何设备～合成一台自动拆转区，让它替你拆积压货。</div>
      ) : (
        <div className="deviceList">
          {builtIds.map((d) => (
            <div className="deviceRow" key={d}>
              <span className="deviceEmoji">{DEVICE_BLUEPRINT[d]?.emoji ?? '⚙️'}</span>
              <span className="deviceEffect">{deviceEffectLine(d, devices[d])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
