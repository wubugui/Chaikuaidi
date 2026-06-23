import { useState } from 'react';
import { useGame } from '../game/store';

interface Slide {
  emoji: string;
  text: string;
  sub?: string;
}

const SLIDES: Slide[] = [
  { emoji: '🏚️', text: '世界的某个角落，一座被遗忘的废弃快递收容站。', sub: '成千上万无人认领的包裹，堆积成山。' },
  { emoji: '😤', text: '你，是这里唯一的看守。', sub: '一个……脾气不太好的暴躁老哥。' },
  { emoji: '🥱', text: '日复一日：登记、码放、再登记……', sub: '无聊到骨头缝里都在发霉。' },
  { emoji: '🤬', text: '直到今天，一个胶带缠了八百层的箱子，彻底点燃了你。', sub: '"这玩意儿是用混凝土糊的吗？！"' },
  { emoji: '🖐️💥', text: '"拆！我就不信拆不开你！！"', sub: '你徒手撕开了第一个箱子。那一声脆响……爽。' },
  { emoji: '📦✨', text: '那一刻你顿悟了：这些箱子，天生就是用来拆的。', sub: '拆得越快越爽，装备越来越离谱，骂得越来越上头。' },
];

export function Intro() {
  const introSeen = useGame((s) => s.introSeen);
  const markIntroSeen = useGame((s) => s.markIntroSeen);
  const [i, setI] = useState(0);
  if (introSeen) return null;

  const last = i >= SLIDES.length - 1;
  const slide = SLIDES[i];

  return (
    <div className="introBg">
      <div className="introBox">
        <div className="introEmoji">{slide.emoji}</div>
        <div className="introText">{slide.text}</div>
        {slide.sub && <div className="introSub">{slide.sub}</div>}

        <div className="introDots">
          {SLIDES.map((_, k) => (
            <span key={k} className={'dot' + (k === i ? ' on' : '')} />
          ))}
        </div>

        <div className="introActions">
          <button className="btn" onClick={markIntroSeen}>跳过</button>
          {last ? (
            <button className="btn primary big" onClick={markIntroSeen}>💢 开拆！</button>
          ) : (
            <button className="btn primary" onClick={() => setI((v) => v + 1)}>继续 →</button>
          )}
        </div>
      </div>
    </div>
  );
}
