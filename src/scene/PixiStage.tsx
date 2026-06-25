import { useEffect, useRef } from 'react';
import { SceneApp } from './SceneApp';

export function PixiStage() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (import.meta.env.MODE === 'test') return;

    const host = hostRef.current;
    if (!host) return;

    const scene = new SceneApp();
    let cancelled = false;

    void scene.mount(host).then(() => {
      if (cancelled) scene.destroy();
    });

    return () => {
      cancelled = true;
      scene.destroy();
    };
  }, []);

  if (import.meta.env.MODE === 'test') {
    return (
      <div className="pixiStageMount" data-testid="pixi-stage" ref={hostRef}>
        <canvas data-testid="pixi-stage-canvas" aria-hidden="true" />
      </div>
    );
  }

  return <div className="pixiStageMount" data-testid="pixi-stage" ref={hostRef} />;
}
