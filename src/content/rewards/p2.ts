import type { AccidentArchiveDef, RumorDef } from '../types';

export const P2_RUMORS: RumorDef[] = [
  {
    id: 'rumor-black-market-open',
    title: '黑市开始点名',
    text: '黑衣人不再卖普通货，他开始递合同：砸开，别问，别报警。',
    phase: 'p2',
  },
  {
    id: 'rumor-seller-egg',
    title: '会呼吸的蛋',
    text: '卖家说那不是蛋，是“会给出答案的壳”。老哥说答案能不能砸出来。',
    phase: 'p2',
  },
  {
    id: 'rumor-meteor-core',
    title: '掉在仓库里的小陨石',
    text: '旧仓库地板被压出一个坑，陨石却像在往上掉。',
    phase: 'p2',
  },
  {
    id: 'rumor-black-vault',
    title: '没有钥匙孔的黑箱',
    text: '卖家只说里面有账本，也可能有另一个卖家。',
    phase: 'p2',
  },
  {
    id: 'rumor-factory-line',
    title: '厂房能装下更大的怒气',
    text: '旧厂房有三条废管线，修好后能把大目标削到等老哥补最后一击。',
    phase: 'p2',
  },
  {
    id: 'rumor-expedition-map',
    title: '现场作业地图',
    text: '有些东西买不回来，只能老哥自己过去砸。',
    phase: 'p2',
  },
  {
    id: 'rumor-reactor-route',
    title: '热得不正常的委托',
    text: '发射台和烂尾楼之后，卖家递来一张核电站的旧工牌。',
    phase: 'p2',
  },
  {
    id: 'rumor-space-route',
    title: '天上也有欠砸的',
    text: '空间站碎片掉进合同夹层，背面写着“别用普通锤”。',
    phase: 'p2',
  },
  {
    id: 'rumor-mecha-frame',
    title: '破烂机甲骨架',
    text: '桥底下捞出来一只巨臂，像是专门给暴躁老哥准备的。',
    phase: 'p2',
  },
  {
    id: 'rumor-gundam-factory',
    title: '巨型机械工厂',
    text: '传闻说有个厂房专门生产比厂房还大的正义。',
    phase: 'p2',
  },
  {
    id: 'rumor-ufo-hull',
    title: '外星飞船外壳',
    text: '对撞机事故后，黑市合同里多了一张没有透视关系的飞船照片。',
    phase: 'p2',
  },
  {
    id: 'rumor-ultra-signal',
    title: '巨大化信号',
    text: '黑方碑照片背面出现一行字：人不够大，就把怒气放大。',
    phase: 'p2',
  },
  {
    id: 'rumor-monolith-contract',
    title: '黑方碑合同',
    text: '卖家终于承认：有块东西不是货，是一直在挑选砸它的人。',
    phase: 'p2',
  },
];

export const P2_ACCIDENT_ARCHIVES: AccidentArchiveDef[] = [
  {
    id: 'archive-egg-bite',
    title: '蛋壳咬了工具',
    riskId: 'bio-egg-hatch',
    text: '活体目标先听呼吸，再决定是不是亲手补最后一锤。',
    phase: 'p2',
  },
  {
    id: 'archive-meteor-gravity',
    title: '锤子往天花板掉',
    riskId: 'anomaly-meteor-core',
    text: '异常核心可以砸，但别相信上下左右。',
    phase: 'p2',
  },
  {
    id: 'archive-vault-fog',
    title: '黑箱喷出腐蚀雾',
    riskId: 'corrosion-black-vault',
    text: '黑市委托的密封边缘先远程试探，工具比面子贵。',
    phase: 'p2',
  },
  {
    id: 'archive-city-response',
    title: '城市开始记账',
    riskId: 'legal-city-response',
    text: '现场目标不能全靠莽，撤退有时候是在保下一轮路线。',
    phase: 'p2',
  },
  {
    id: 'archive-reactor-leak',
    title: '反应堆泄漏',
    riskId: 'pollution-reactor-leak',
    text: '燃料棒会把奖励和副作用一起带回循环。',
    phase: 'p2',
  },
  {
    id: 'archive-bridge-collapse',
    title: '桥的中间不见了',
    riskId: 'world-structure-collapse',
    text: '世界级目标的关键部位不能交给管线乱补刀。',
    phase: 'p2',
  },
  {
    id: 'archive-ultra-overload',
    title: '巨大化后手还在发光',
    riskId: 'mutation-giant-overload',
    text: '巨大化不是效率工具，是拿来对付终局尺度的。',
    phase: 'p2',
  },
  {
    id: 'archive-monolith-echo',
    title: '黑方碑记住了本轮',
    riskId: 'anomaly-monolith-echo',
    text: '黑方碑不会被一次砸服，它会把失败写进下一轮。',
    phase: 'p2',
  },
];

export const P2_RUMOR_MAP = Object.fromEntries(P2_RUMORS.map((rumor) => [rumor.id, rumor]));
export const P2_ACCIDENT_ARCHIVE_MAP = Object.fromEntries(
  P2_ACCIDENT_ARCHIVES.map((archive) => [archive.id, archive]),
);
