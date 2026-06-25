import type { MachineDef } from '../types';

export const P1_MACHINES: MachineDef[] = [
  {
    id: 'hydraulic-hammer',
    kind: 'machine',
    name: '液压锤',
    tags: ['hydraulic'],
    slotTags: ['hydraulic'],
    power: 18,
    durability: 180,
    repairCost: { money: 80, items: { gear: 1 } },
    overheatSeconds: 18,
    materialBonus: { metal: 1.4, stone: 1.1, wood: 1.2 },
  },
  {
    id: 'scrap-arm',
    kind: 'machine',
    name: '废品机械臂',
    tags: ['hydraulic', 'crowbar'],
    slotTags: ['hydraulic', 'crowbar'],
    power: 12,
    durability: 150,
    repairCost: { money: 60, items: { screw: 2 } },
    overheatSeconds: 22,
    materialBonus: { metal: 1.1, wood: 1.1 },
  },
];
