import type { MaterialDef } from '../types';

export const P1_MATERIALS: MaterialDef[] = [
  { id: 'paper', toughness: 1, weakTo: ['hand', 'hammer'] },
  { id: 'wood', toughness: 1.6, weakTo: ['hammer', 'crowbar', 'hydraulic', 'pipeline'] },
  { id: 'metal', toughness: 3.4, weakTo: ['crowbar', 'hydraulic', 'hammer', 'pipeline', 'mecha', 'gundam'] },
  { id: 'stone', toughness: 4, weakTo: ['drill', 'hydraulic', 'pipeline', 'mecha', 'gundam', 'ultra'] },
  { id: 'organic', toughness: 2.2, weakTo: ['hammer', 'remote', 'mecha', 'ultra'] },
  { id: 'volatile', toughness: 3, weakTo: ['remote', 'gundam'] },
  { id: 'anomaly', toughness: 5, weakTo: ['remote', 'absurd', 'gundam', 'ultra'] },
];

export const P1_MATERIAL_MAP = Object.fromEntries(P1_MATERIALS.map((material) => [material.id, material]));
