import { useEffect, useState } from 'react';
import { on } from '../../game/events';
import { BLUEPRINT_MAP } from '../../data/blueprints';

/** 合成成功时的短暂浮层：🛠️ + 设备名 */
export function CraftFlash() {
  const [state, setState] = useState<{ id: number; text: string } | null>(null);

  useEffect(() => {
    return on('craft', (bpId) => {
      const bp = BLUEPRINT_MAP[bpId];
      setState({ id: Date.now(), text: bp ? `🛠️ 合成：${bp.name.replace('图纸', '')}` : '🛠️ 合成完成' });
    });
  }, []);

  useEffect(() => {
    if (!state) return;
    const t = setTimeout(() => setState(null), 1100);
    return () => clearTimeout(t);
  }, [state]);

  if (!state) return null;
  return (
    <div className="craftFlashLayer" key={state.id}>
      <div className="craftFlashCard">{state.text}</div>
    </div>
  );
}
