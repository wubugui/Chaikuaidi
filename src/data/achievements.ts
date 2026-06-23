import type { AchievementDef } from './types';

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first', name: '开张大吉', emoji: '🎉', desc: '拆开第一个快递', reward: 10, check: (s) => s.totalUnpacked >= 1 },
  { id: 'unpack100', name: '熟练工', emoji: '📦', desc: '累计拆 100 个', reward: 100, check: (s) => s.totalUnpacked >= 100 },
  { id: 'unpack10k', name: '拆包狂魔', emoji: '🌀', desc: '累计拆 1 万个', reward: 5000, check: (s) => s.totalUnpacked >= 10000 },
  { id: 'unpack1m', name: '拆遍天下', emoji: '🏆', desc: '累计拆 100 万个', reward: 500000, check: (s) => s.totalUnpacked >= 1000000 },
  { id: 'earn10k', name: '小有积蓄', emoji: '💴', desc: '累计赚 ¥1 万', reward: 500, check: (s) => s.totalEarned >= 10000 },
  { id: 'earn1m', name: '物流大亨', emoji: '🤑', desc: '累计赚 ¥100 万', reward: 50000, check: (s) => s.totalEarned >= 1000000 },
  { id: 'earn1b', name: '富可敌国', emoji: '👑', desc: '累计赚 ¥10 亿', reward: 10000000, check: (s) => s.totalEarned >= 1000000000 },
  { id: 'legendary', name: '欧皇时刻', emoji: '🟡', desc: '首次拆出传说物品', reward: 2000, check: (s) => s.legendaryFound },
  { id: 'absurd', name: '这也太离谱了', emoji: '🌈', desc: '首次拆出离谱物品', reward: 50000, check: (s) => s.absurdFound },
  { id: 'combo100', name: '手速之王', emoji: '🔥', desc: '连击数达到 100', reward: 1000, check: (s) => s.maxCombo >= 100 },
  { id: 'quote3', name: '嘴上功夫', emoji: '🗯️', desc: '收集 3 条暴躁语录', reward: 3000, check: (s) => s.quoteCount >= 3 },
  { id: 'batch10', name: '流水线大师', emoji: '🏭', desc: '一次批量处理 10 个快递', reward: 20000, check: (s) => s.batchSize >= 10 },
  { id: 'collect50', name: '收藏家', emoji: '🖼️', desc: '图鉴收集进度 50%', reward: 10000, check: (s) => s.collectionTotal > 0 && s.collectionCount / s.collectionTotal >= 0.5 },
  { id: 'collectAll', name: '集齐图鉴', emoji: '💯', desc: '收集全部收藏品', reward: 200000, check: (s) => s.collectionTotal > 0 && s.collectionCount >= s.collectionTotal },
];
