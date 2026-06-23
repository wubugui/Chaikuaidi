import type { MaterialId } from './materials';
import type { PassiveType } from './types';

export type MutationId = 'mecharm' | 'sixarms' | 'brasshead' | 'sawlegs' | 'lasereye' | 'magnethand';

export interface MutationDef {
  id: MutationId;
  name: string;
  emoji: string;
  desc: string;                 // 玩家可见的效果说明
  benchBonus?: number;          // +工作台容量
  bodyAffinity?: Partial<Record<MaterialId, number>>; // 肉身自带材质效率（与工具取 max）
  passive?: { type: PassiveType; amount: number };
  sawKick?: boolean;            // 降低暴怒踢坏概率
  weight: number;              // 变异抽取权重
}

export const MUTATIONS: MutationDef[] = [
  { id:'mecharm',   name:'机械臂',   emoji:'🦾', desc:'多长一条手臂——工作台 +1 同时处理', benchBonus:1, weight:24 },
  { id:'sixarms',   name:'三头六臂', emoji:'🐙', desc:'六条胳膊一起拆——工作台 +2，连击上限 +0.5', benchBonus:2, passive:{ type:'comboCap', amount:0.5 }, weight:10 },
  { id:'brasshead', name:'铜头铁臂', emoji:'🥊', desc:'肉身硬过金属——徒手也能砸开金属(自带金属效率1)', bodyAffinity:{ metal:1 }, weight:18 },
  { id:'sawlegs',   name:'锯子腿',   emoji:'🦿', desc:'腿是电锯——自带木/生物效率1，且暴怒更少踢坏东西', bodyAffinity:{ wood:1, organic:1 }, sawKick:true, weight:18 },
  { id:'lasereye',  name:'激光眼',   emoji:'👁️', desc:'眼里能射激光——自带异常效率1', bodyAffinity:{ anomaly:1 }, weight:14 },
  { id:'magnethand',name:'磁力手',   emoji:'🧲', desc:'掉落自动吸过来——售价 +15%', passive:{ type:'sellPrice', amount:0.15 }, weight:16 },
];
export const MUTATION_MAP = Object.fromEntries(MUTATIONS.map(m=>[m.id,m])) as Record<MutationId, MutationDef>;
