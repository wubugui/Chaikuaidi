import type { MaterialId } from './materials';
import type { ToolDef, ToolId } from './types';

export const TOOLS: ToolDef[] = [
  { id:'hand',    name:'徒手硬抠', emoji:'✋', power:1,    cost:0,       unlockStage:1, affinity:{ paper:1, organic:0.3 } },
  { id:'cutter',  name:'美工刀',   emoji:'🔪', power:4,    cost:60,      unlockStage:1, upgradeMat:'blade',   affinity:{ paper:2, organic:0.6, wood:0.3 } },
  { id:'crowbar', name:'撬棍',     emoji:'🛠️', power:10,   cost:400,     unlockStage:2, upgradeMat:'screw',   affinity:{ wood:2, metal:1, paper:1.5, organic:1 } },
  { id:'grinder', name:'角磨机',   emoji:'🪚', power:30,   cost:3000,    unlockStage:2, upgradeMat:'gear',    affinity:{ wood:2.5, metal:2, organic:1.5 } },
  { id:'chisel',  name:'切石水刀', emoji:'⛏️', power:80,   cost:15000,   unlockStage:3, upgradeMat:'magnet',  affinity:{ stone:3, metal:1, anomaly:1, wood:1 } },
  { id:'torch',   name:'喷枪',     emoji:'🔥', power:120,  cost:40000,   unlockStage:3, upgradeMat:'battery', affinity:{ organic:2, metal:1.5, stone:1, wood:1 } },
  { id:'disarm',  name:'拆弹钳',   emoji:'🧰', power:60,   cost:90000,   unlockStage:3, upgradeMat:'gear', volatileSafe:true, affinity:{ volatile:3 } },
  { id:'press',   name:'液压机',   emoji:'🏭', power:400,  cost:350000,  unlockStage:4, upgradeMat:'arm', fragileDestroy:true, affinity:{ wood:3, metal:3, stone:2, volatile:1 } },
  { id:'laserrig',name:'激光阵',   emoji:'🛰️', power:600,  cost:900000,  unlockStage:4, upgradeMat:'arm',     affinity:{ metal:2, stone:2, anomaly:3, organic:2 } },
  { id:'blackhole',name:'黑洞装置',emoji:'🕳️', power:2500, cost:4000000, unlockStage:4, eatsLoot:true, affinity:{ paper:2, wood:2, metal:2, stone:2, volatile:2, anomaly:2, organic:2 } },
];

export const TOOL_MAP: Record<ToolId, ToolDef> = Object.fromEntries(TOOLS.map(t=>[t.id,t])) as Record<ToolId, ToolDef>;

/** 给定材质，推荐一把能撬动（affinity>=1）且最便宜的工具 */
export function recommendedToolFor(material: MaterialId): ToolDef | null {
  const cands = TOOLS.filter(t => (t.affinity[material] ?? 0) >= 1).sort((a,b)=>a.cost-b.cost);
  return cands[0] ?? null;
}

/** 每把工具的升级成本（金钱 + 材料数量），每级 +20% power（在 compute 中应用） */
export function toolUpgradeCost(tool: ToolDef, level: number): { money: number; mat: number } {
  return { money: Math.ceil((tool.cost * 0.5 + 50) * Math.pow(1.6, level)), mat: 2 + level };
}
