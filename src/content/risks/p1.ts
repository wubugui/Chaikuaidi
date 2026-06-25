import type { RiskDef } from '../types';

export const P1_RISKS: RiskDef[] = [
  {
    id: 'trap-spring',
    name: '高压弹簧机关',
    category: 'trap',
    phase: 'p1',
    description: '老保险柜里绷着一组不该还这么有劲的弹簧，乱砸会弹飞工具。',
    baseChance: 0.22,
    preventions: ['先检查可疑响动', '避开暴走砸', '使用撬棍处理门缝'],
  },
  {
    id: 'explosion-battery',
    name: '电池爆燃',
    category: 'explosion',
    phase: 'p1',
    description: '报废汽车里残留的电池和油污可能被重击点燃。',
    baseChance: 0.18,
    preventions: ['先砸开外层散热', '使用远程试探', '避开连续暴走砸'],
  },
  {
    id: 'explosion-missile',
    name: '不该捡的导弹',
    category: 'explosion',
    phase: 'p1',
    description: '弹体还在装弹状态，错误工具会把本轮砸成事故档案。',
    baseChance: 0.55,
    preventions: ['先检查保险栓', '使用拆弹工具或远程架', '必要时撤退'],
  },
  {
    id: 'anomaly-hum',
    name: '异常低鸣',
    category: 'anomaly',
    phase: 'p1',
    description: '目标内部传出不合逻辑的低鸣，继续砸可能换来传闻，也可能换来坏后果。',
    baseChance: 0.12,
    preventions: ['收集更多传闻', '用远程试探', '在临界阶段停手'],
  },
];

export const P1_RISK_MAP = Object.fromEntries(P1_RISKS.map((risk) => [risk.id, risk]));
