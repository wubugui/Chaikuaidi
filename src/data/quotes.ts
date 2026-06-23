import type { ItemDef } from './types';

/**
 * 暴躁老哥的「骂人语录」——可装备的金句，装备后吃加成。
 * 走荒诞整活路线，骂的是箱子、胶带、命运，不是人。
 */
export const QUOTES: ItemDef[] = [
  {
    id: 'q_zen', name: '语录·拆穿红尘', emoji: '🗯️', kind: 'quote', rarity: 'rare', baseValue: 0,
    quote: { text: '拆快递的尽头，是禅。', label: '幸运 +10%', type: 'luck', amount: 0.1 },
  },
  {
    id: 'q_hand', name: '语录·徒手开箱', emoji: '🗯️', kind: 'quote', rarity: 'rare', baseValue: 0,
    quote: { text: '我这双手，就是开箱器。', label: '点击拆解 +20%', type: 'clickPower', amount: 0.2 },
  },
  {
    id: 'q_tape', name: '语录·胶带仇深', emoji: '🗯️', kind: 'quote', rarity: 'rare', baseValue: 0,
    quote: { text: '缠这么多胶带，是怕我拆不动？偏拆给你看。', label: '点击拆解 +15%', type: 'clickPower', amount: 0.15 },
  },
  {
    id: 'q_money', name: '语录·见钱眼开', emoji: '🗯️', kind: 'quote', rarity: 'epic', baseValue: 0,
    quote: { text: '卖了它，一个都不留！', label: '售价 +20%', type: 'sellPrice', amount: 0.2 },
  },
  {
    id: 'q_rhythm', name: '语录·这叫节奏', emoji: '🗯️', kind: 'quote', rarity: 'epic', baseValue: 0,
    quote: { text: '连击？我管这个叫节奏。', label: '连击上限 +0.5', type: 'comboCap', amount: 0.5 },
  },
  {
    id: 'q_speed', name: '语录·时间就是仇人', emoji: '🗯️', kind: 'quote', rarity: 'epic', baseValue: 0,
    quote: { text: '时间就是金钱，箱子就是仇人。', label: '自动拆解 +20%', type: 'autoPower', amount: 0.2 },
  },
  {
    id: 'q_machine', name: '语录·人挡拆人', emoji: '🗯️', kind: 'quote', rarity: 'legendary', baseValue: 0,
    quote: { text: '箱挡拆箱，神挡拆神。', label: '点击拆解 +40%', type: 'clickPower', amount: 0.4 },
  },
  {
    id: 'q_emperor', name: '语录·欧皇附体', emoji: '🗯️', kind: 'quote', rarity: 'legendary', baseValue: 0,
    quote: { text: '今天的我，运气好到离谱。', label: '幸运 +25%', type: 'luck', amount: 0.25 },
  },
  {
    id: 'q_god', name: '语录·拆神降临', emoji: '🌈', kind: 'quote', rarity: 'absurd', baseValue: 0,
    quote: { text: '我不是在拆快递，我是在拆这个荒诞的世界。', label: '售价 +50%', type: 'sellPrice', amount: 0.5 },
  },
];

export const QUOTE_MAP: Record<string, ItemDef> = Object.fromEntries(QUOTES.map((q) => [q.id, q]));
export const QUOTE_TOTAL = QUOTES.length;
