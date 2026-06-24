import type { CSSProperties } from 'react';
import { GAME_ART_BY_EMOJI, GAME_ART_BY_ID, GAME_ART_BY_KEY, GAME_ART_BY_NAME } from '../assets/gameArt';

interface GameIconLookup {
  kind?: string;
  id?: string | number | null;
  name?: string | null;
  emoji?: string | null;
}

interface GameIconProps extends GameIconLookup {
  className?: string;
  title?: string;
  size?: number | string;
  style?: CSSProperties;
}

export function gameArtSrc({ kind, id, name, emoji }: GameIconLookup): string | null {
  const sid = id == null ? '' : String(id);
  if (kind && sid) {
    const byKey = GAME_ART_BY_KEY[`${kind}:${sid}`];
    if (byKey) return byKey;
  }
  if (sid && GAME_ART_BY_ID[sid]) return GAME_ART_BY_ID[sid];
  if (name && GAME_ART_BY_NAME[name]) return GAME_ART_BY_NAME[name];
  if (emoji && GAME_ART_BY_EMOJI[emoji]) return GAME_ART_BY_EMOJI[emoji];
  return null;
}

export function GameIcon({ kind, id, name, emoji, className = '', title, size, style }: GameIconProps) {
  const src = gameArtSrc({ kind, id, name, emoji });
  const iconStyle = {
    ...style,
    ...(size == null ? null : { ['--icon-size' as string]: typeof size === 'number' ? `${size}px` : size }),
  } as CSSProperties;

  if (!src) {
    return (
      <span className={className} title={title ?? name ?? undefined}>
        {emoji ?? ''}
      </span>
    );
  }

  return (
    <img
      className={'gameIcon ' + className}
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      title={title ?? name ?? undefined}
      style={iconStyle}
    />
  );
}
