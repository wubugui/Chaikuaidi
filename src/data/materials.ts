export type MaterialId = 'paper' | 'wood' | 'metal' | 'stone' | 'volatile' | 'anomaly' | 'organic';
export interface MaterialDef { id: MaterialId; name: string; emoji: string; color: string; }
export const MATERIALS: Record<MaterialId, MaterialDef> = {
  paper:    { id: 'paper',    name: '纸壳', emoji: '📦', color: '#c8a06a' },
  wood:     { id: 'wood',     name: '木质', emoji: '🧰', color: '#9b6b3a' },
  metal:    { id: 'metal',    name: '金属', emoji: '🔩', color: '#9aa4b2' },
  stone:    { id: 'stone',    name: '石矿', emoji: '🪨', color: '#8a8f98' },
  volatile: { id: 'volatile', name: '危险', emoji: '☢️', color: '#ef4444' },
  anomaly:  { id: 'anomaly',  name: '异常', emoji: '👽', color: '#a855f7' },
  organic:  { id: 'organic',  name: '生物', emoji: '🦪', color: '#34d399' },
};
