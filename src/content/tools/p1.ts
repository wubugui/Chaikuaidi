import type { ToolDef } from '../types';

export const P1_TOOLS: ToolDef[] = [
  {
    id: 'hand',
    kind: 'tool',
    name: '老哥徒手',
    tags: ['hand'],
    power: 2,
    durability: 999,
    price: 0,
    materialBonus: { paper: 1.3, wood: 0.4, metal: 0.2 },
  },
  {
    id: 'hammer',
    kind: 'tool',
    name: '大锤',
    tags: ['hammer'],
    power: 16,
    durability: 120,
    price: 120,
    materialBonus: { wood: 1.4, metal: 0.9, stone: 0.8 },
  },
  {
    id: 'crowbar',
    kind: 'tool',
    name: '撬棍',
    tags: ['crowbar'],
    power: 11,
    durability: 100,
    price: 180,
    materialBonus: { wood: 1.2, metal: 1.2 },
  },
  {
    id: 'remote-probe',
    kind: 'tool',
    name: '远程试探架',
    tags: ['remote'],
    power: 6,
    durability: 80,
    price: 300,
    materialBonus: { volatile: 1.1, anomaly: 0.8 },
  },
];
