import type { MaterialDef } from '../types';

export const P1_MATERIALS: MaterialDef[] = [
  { id: 'paper', toughness: 1, weakTo: ['hand', 'hammer'] },
  { id: 'wood', toughness: 1.3, weakTo: ['hammer', 'crowbar', 'hydraulic', 'pipeline'] },
  { id: 'metal', toughness: 2.5, weakTo: ['crowbar', 'hydraulic', 'hammer', 'pipeline', 'mecha', 'gundam'] },
  { id: 'stone', toughness: 3.2, weakTo: ['drill', 'hydraulic', 'pipeline', 'mecha', 'gundam', 'ultra'] },
  { id: 'organic', toughness: 1.9, weakTo: ['hammer', 'remote', 'mecha', 'ultra'] },
  { id: 'volatile', toughness: 2.4, weakTo: ['remote', 'gundam'] },
  { id: 'anomaly', toughness: 3.6, weakTo: ['remote', 'absurd', 'gundam', 'ultra'] },
];

export const P1_MATERIAL_MAP = Object.fromEntries(P1_MATERIALS.map((material) => [material.id, material]));
