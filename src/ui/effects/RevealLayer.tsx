import type { RevealData } from '../../game/events';

/**
 * P7：全屏特写彻底退役。
 * 任何稀有度（含「离谱」absurd）都不再走阻塞式全屏揭晓、不再需要点「✅ 收下」，
 * 也不再 emit revealStart/revealEnd 去暂停砸击。所有「值得一看」的揭晓交给
 * PopReveal 的非阻塞小爆窗；离谱另加一记「炸一下」中心闪光（见 PopReveal）。
 *
 * isShowcase 永远返回 false：保留导出供 PopReveal / 测试引用，但 UI 不再被任何开箱挡住。
 */
export function isShowcase(_r: RevealData): boolean {
  return false;
}

/** RevealLayer 已退役为惰性组件：不渲染任何阻塞遮罩、不暂停输入。 */
export function RevealLayer() {
  return null;
}
