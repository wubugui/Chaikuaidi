/**
 * 军火：一次性武器，由元素 + 零件合成（见 blueprints.ts 的 bp_nuke/bp_emp/bp_railgun）。
 * 用来「轰开」离谱货（高达/变形金刚/外星飞船/黑方碑）——那些货任何工具/管线都开不了。
 */
export interface OrdnanceDef {
  id: string;
  name: string;
  emoji: string;
  desc: string;
}

export const ORDNANCE: OrdnanceDef[] = [
  { id: 'nuke',    name: '原子弹', emoji: '💣', desc: '轰开外星飞船 / 黑方碑' },
  { id: 'emp',     name: 'EMP',    emoji: '⚡', desc: '瘫痪变形金刚后拆解' },
  { id: 'railgun', name: '轨道炮', emoji: '🛰️', desc: '击穿高达 / 重甲' },
];

export const ORDNANCE_MAP: Record<string, OrdnanceDef> = Object.fromEntries(
  ORDNANCE.map((o) => [o.id, o]),
);
