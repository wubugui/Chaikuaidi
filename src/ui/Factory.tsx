import { BLUEPRINT_MAP } from '../data/blueprints';
import {
  GIANTS, PIPELINE_INTERVAL, PIPELINE_NAME, PIPELINE_SPACE,
  factoryExpandCost, FACTORY_EXPAND_STEP,
} from '../data/giants';
import { ORDNANCE_MAP } from '../data/ordnance';
import { factoryFree, factoryUsed, type Parcel } from '../game/state';
import { useGame } from '../game/store';
import { fmt, money } from '../lib/format';

interface GiantRow {
  id: string;
  emoji: string;
  name: string;
  space: number;
  count: number;
  requirePipeline: string;
}

interface AbsurdRow {
  firstId: number;
  emoji: string;
  name: string;
  space: number;
  count: number;
  requireOrdnance: string;
}

export function Factory() {
  const s = useGame();
  const m = useGame((st) => st.money);
  const stage = useGame((st) => st.stage);
  const backlog = useGame((st) => st.backlog);
  const devices = useGame((st) => st.devices);
  const deviceEnabled = useGame((st) => st.deviceEnabled);
  const ordnance = useGame((st) => st.ordnance);
  const factorySpace = useGame((st) => st.factorySpace);
  const buyGiant = useGame((st) => st.buyGiant);
  const expandFactory = useGame((st) => st.expandFactory);
  const useOrdnance = useGame((st) => st.useOrdnance);
  const toggleDevice = useGame((st) => st.toggleDevice);

  const used = factoryUsed(s);
  const free = factoryFree(s);
  const expandCost = factoryExpandCost(factorySpace);

  // 厂房里的巨型货分组
  const giantGroups = new Map<string, GiantRow>();
  for (const p of backlog as Parcel[]) {
    if (!p.requirePipeline) continue;
    const key = p.label ?? p.emoji;
    const g = giantGroups.get(key);
    if (g) g.count += 1;
    else
      giantGroups.set(key, {
        id: key,
        emoji: p.emoji,
        name: p.label ?? '巨型货',
        space: p.space ?? 0,
        count: 1,
        requirePipeline: p.requirePipeline,
      });
  }
  const heldGiants = [...giantGroups.values()];

  // 厂房里的离谱货分组（只能用军火轰开）
  const absurdGroups = new Map<string, AbsurdRow>();
  for (const p of backlog as Parcel[]) {
    if (!p.requireOrdnance) continue;
    const key = p.label ?? p.emoji;
    const g = absurdGroups.get(key);
    if (g) g.count += 1;
    else
      absurdGroups.set(key, {
        firstId: p.id,
        emoji: p.emoji,
        name: p.label ?? '离谱货',
        space: p.space ?? 0,
        count: 1,
        requireOrdnance: p.requireOrdnance,
      });
  }
  const heldAbsurds = [...absurdGroups.values()];

  // 已建管线
  const pipelines = Object.keys(PIPELINE_SPACE)
    .filter((id) => (devices[id] ?? 0) > 0)
    .map((id) => ({ id, count: devices[id] }));

  const pct = factorySpace > 0 ? Math.min(100, Math.round((used / factorySpace) * 100)) : 0;

  return (
    <div className="factoryPanel">
      <p className="shopHint">
        巨型货（汽车/客机/货轮/坦克）暴力拆不开，得靠 🏭 拆卸管线慢慢肢解成成堆零件与原料。它们和管线都占厂房空间——放不下就先扩建或等现有的拆完。
      </p>

      {/* 空间条 */}
      <div className="factorySpaceBar">
        <div className="factorySpaceHead">
          <span>🏭 厂房空间</span>
          <b>{fmt(used)} / {fmt(factorySpace)}</b>
          <span className="factoryFree">（剩 {fmt(free)}）</span>
        </div>
        <div className="spaceBarTrack">
          <div className="spaceBarFill" style={{ width: pct + '%' }} />
        </div>
        <button className="btn buy" disabled={m < expandCost} onClick={() => expandFactory()}>
          扩建 +{FACTORY_EXPAND_STEP}<span className="cost">{money(expandCost)}</span>
        </button>
      </div>

      {/* 厂房里的巨型货 */}
      <h3 className="shopSecTitle">🚚 厂房里的巨型货</h3>
      {heldGiants.length === 0 ? (
        <div className="invEmpty">厂房空着——去下面买台巨型货，或找 🕶️ 黑市商人淘点货轮/坦克/飞机。</div>
      ) : (
        <div className="giantHeldList">
          {heldGiants.map((g) => {
            const hasPipeline = (devices[g.requirePipeline] ?? 0) > 0;
            const pipeOn = hasPipeline && !!deviceEnabled[g.requirePipeline];
            return (
              <div className="giantHeldRow" key={g.id}>
                <span className="giantEmoji">{g.emoji}</span>
                <div className="giantInfo">
                  <div className="giantName">
                    {g.name} <span className="backlogCount">×{fmt(g.count)}</span>
                    <span className="giantSpace">占 {g.space} 格</span>
                  </div>
                  {pipeOn ? (
                    <span className="giantProgress">🏭 {PIPELINE_NAME[g.requirePipeline]} 正在拆解中…</span>
                  ) : hasPipeline ? (
                    <span className="giantNeedPipe">🏭{PIPELINE_NAME[g.requirePipeline]} 已停工——去下方开启它</span>
                  ) : (
                    <span className="giantNeedPipe">需要 🏭{PIPELINE_NAME[g.requirePipeline]}（去工坊合成）</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 厂房里的离谱货（军火轰开） */}
      {heldAbsurds.length > 0 && (
        <>
          <h3 className="shopSecTitle">💥 离谱货（军火轰开）</h3>
          <p className="shopHint">高达/变形金刚/外星飞船/黑方碑——任何工具和管线都开不了，只能用对应军火「轰开」。轰开 = 大爆炸 + 高概率把老哥也炸出新变异！</p>
          <div className="giantHeldList">
            {heldAbsurds.map((a) => {
              const ord = ORDNANCE_MAP[a.requireOrdnance];
              const have = ordnance[a.requireOrdnance] ?? 0;
              const canBoom = have >= 1;
              return (
                <div className="giantHeldRow absurdRow" key={a.name}>
                  <span className="giantEmoji">{a.emoji}</span>
                  <div className="giantInfo">
                    <div className="giantName">
                      {a.name} <span className="backlogCount">×{fmt(a.count)}</span>
                      <span className="giantSpace">占 {a.space} 格</span>
                    </div>
                    <span className={canBoom ? 'giantProgress' : 'giantNeedPipe'}>
                      💣 需要：{ord?.emoji}{ord?.name}（拥有 ×{fmt(have)}）
                    </span>
                  </div>
                  <div className="giantBuyCol">
                    <button
                      className="btn buy boomBtn"
                      disabled={!canBoom}
                      onClick={() => useOrdnance(a.firstId)}
                      title={canBoom ? '用军火轰开它' : `先去工坊造一发${ord?.name}`}
                    >
                      💥 轰开
                    </button>
                    {!canBoom && <span className="benchFullHint">没有{ord?.name}，去工坊合成</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 已建拆卸管线 */}
      <h3 className="shopSecTitle">🏭 拆卸管线</h3>
      {pipelines.length === 0 ? (
        <div className="invEmpty">还没建任何拆卸管线——去 🔧 工坊用零件合成一条。</div>
      ) : (
        <div className="pipelineList">
          {pipelines.map((p) => {
            const per = (PIPELINE_INTERVAL / p.count).toFixed(1);
            const bp = BLUEPRINT_MAP[Object.keys(BLUEPRINT_MAP).find((k) => BLUEPRINT_MAP[k].result.id === p.id) ?? ''];
            const on = !!deviceEnabled[p.id];
            return (
              <div className="pipelineRow" key={p.id}>
                <span className="deviceEmoji">🏭</span>
                <span className="deviceEffect">
                  {PIPELINE_NAME[p.id]} ×{p.count}（占 {PIPELINE_SPACE[p.id] * p.count} 格）：每 ~{per}s 拆掉一件
                  {bp?.desc?.includes('货轮') ? '货轮/坦克' : '汽车/客机'}
                </span>
                <button
                  className={'btn small deviceToggle' + (on ? ' primary' : '')}
                  onClick={() => toggleDevice(p.id)}
                  title={on ? '点击停工' : '点击开始运行（默认停工）'}
                >
                  {on ? '▶️ 运行中' : '⏸️ 已停'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 重型货物购买（非商人专属） */}
      <h3 className="shopSecTitle">🚛 重型货物</h3>
      <p className="shopHint">空间不够会禁用——先扩建厂房或等现有的拆完。最稀缺的货轮/坦克/飞机只在 🕶️ 黑市商人到访时供货。</p>
      <div className="giantShopList">
        {GIANTS.filter((g) => !g.merchantOnly).map((g) => {
          const locked = stage < g.unlockStage;
          const noSpace = free < g.space;
          const poor = m < g.price;
          return (
            <div className={'giantCard' + (locked ? ' locked' : '')} key={g.id}>
              <div className="batchEmoji">{g.emoji}</div>
              <div className="batchInfo">
                <div className="batchName">
                  {g.name}
                  <span className="giantSpace">占 {g.space} 格</span>
                  <span className="giantPipeTag">🏭{PIPELINE_NAME[g.requirePipeline]}</span>
                </div>
                <div className="luggageFlavor">{g.flavor}</div>
              </div>
              {locked ? (
                <div className="batchLock">🔒 阶段{g.unlockStage}</div>
              ) : (
                <div className="giantBuyCol">
                  <button
                    className="btn buy"
                    disabled={poor || noSpace}
                    onClick={() => buyGiant(g.id)}
                  >
                    买入<span className="cost">{money(g.price)}</span>
                  </button>
                  {noSpace && <span className="benchFullHint">厂房放不下，先扩建或拆掉现有的</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
