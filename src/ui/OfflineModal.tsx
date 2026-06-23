import { useGame } from '../game/store';
import { fmt, money } from '../lib/format';

function dur(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h} 小时 ${m} 分`;
  if (m > 0) return `${m} 分钟`;
  return `${Math.floor(seconds)} 秒`;
}

export function OfflineModal() {
  const offline = useGame((s) => s.offline);
  const dismiss = useGame((s) => s.dismissOffline);
  if (!offline) return null;

  return (
    <div className="modalBg" onClick={dismiss}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modalTitle">🌙 欢迎回来</div>
        <p className="modalBody">
          你离开了 <b>{dur(offline.seconds)}</b>，自动拆包工帮你：
        </p>
        <div className="offlineStats">
          <div>📦 拆了 <b>{fmt(offline.opened)}</b> 个</div>
          <div>💰 赚了 <b>{money(offline.cash)}</b></div>
        </div>
        <button className="btn primary" onClick={dismiss}>
          收下！
        </button>
      </div>
    </div>
  );
}
