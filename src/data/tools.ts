import type { ToolDef, ToolId } from './types';

export const TOOLS: ToolDef[] = [
  { id: 'nail', name: '徒手硬抠', emoji: '🖐️', power: 1, cost: 0 },
  { id: 'key', name: '一根牙签', emoji: '📌', power: 3, cost: 50 },
  { id: 'cutter', name: '美工刀', emoji: '🔪', power: 8, cost: 300 },
  { id: 'scissors', name: '左右开弓', emoji: '🤲', power: 20, cost: 1500 },
  { id: 'opener', name: '拆迁大铁镐', emoji: '⛏️', power: 50, cost: 8000 },
  { id: 'electric', name: '电锯狂魔', emoji: '🪚', power: 150, cost: 40000 },
  { id: 'laser', name: '激光开箱炮', emoji: '🔫', power: 500, cost: 200000 },
  { id: 'blackhole', name: '黑洞吸拆装置', emoji: '🌀', power: 2000, cost: 1200000 },
];

export const TOOL_MAP: Record<ToolId, ToolDef> = Object.fromEntries(
  TOOLS.map((t) => [t.id, t]),
) as Record<ToolId, ToolDef>;

export function nextTool(current: ToolId): ToolDef | null {
  const idx = TOOLS.findIndex((t) => t.id === current);
  return idx >= 0 && idx < TOOLS.length - 1 ? TOOLS[idx + 1] : null;
}
