/**
 * 把以 "/" 开头的 public 资源路径转成「带部署 base 前缀」的可用 URL。
 * 线上部署在 GitHub Pages 的 /Chaikuaidi/ 子路径下，vite base 为 './'，
 * 因此 import.meta.env.BASE_URL 为 './'（dev 下为 '/'）。直接用绝对 '/game-art/...'
 * 会解析到站点根，导致线上 404；这里统一加 base 前缀。
 */
const BASE = import.meta.env.BASE_URL || '/';

export function assetUrl(path: string): string {
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:')) return path; // 绝对外链/内联不动
  if (!path.startsWith('/')) return path; // 已是相对/已前缀过，幂等返回，避免重复加 base
  const base = BASE.endsWith('/') ? BASE : BASE + '/';
  return base + path.replace(/^\/+/, '');
}
