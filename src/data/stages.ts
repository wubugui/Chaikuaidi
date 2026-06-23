export interface StageDef {
  id: 1 | 2 | 3 | 4;
  name: string;
  emoji: string;
  threshold: number; // 累计收入门槛
  unlocks: string;
}

export const STAGES: StageDef[] = [
  { id: 1, name: '手工作坊', emoji: '🛠️', threshold: 0, unlocks: '手动拆包、基础工具与升级' },
  { id: 2, name: '小卖部', emoji: '🏪', threshold: 1000, unlocks: '自动拆包工、幸运值、进货批次、加固箱' },
  { id: 3, name: '分拣中心', emoji: '🏭', threshold: 50000, unlocks: '工作台扩容批量拆、自动卖货、木箱、收藏图鉴' },
  { id: 4, name: '物流帝国', emoji: '🌐', threshold: 1000000, unlocks: '集装箱、黑市批次、转生重开' },
];

export function stageForEarned(totalEarned: number): 1 | 2 | 3 | 4 {
  let stage: 1 | 2 | 3 | 4 = 1;
  for (const s of STAGES) {
    if (totalEarned >= s.threshold) stage = s.id;
  }
  return stage;
}
