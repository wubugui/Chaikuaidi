import type { AccidentArchiveDef, RumorDef } from '../types';

export const P1_RUMORS: RumorDef[] = [
  {
    id: 'rumor-old-market-safe',
    title: '旧货市场的保险柜',
    text: '有人在旧货市场卖一台撬不动的保险柜，钥匙没有，故事一堆。',
    phase: 'p1',
  },
  {
    id: 'rumor-scrapyard-car',
    title: '后备箱有声音',
    text: '二手车行有台事故车，后备箱里像是有什么东西滚来滚去。',
    phase: 'p1',
  },
  {
    id: 'rumor-black-market-missile',
    title: '黑衣人的危险货',
    text: '黑衣人说有个东西理智的人都会报警，但老哥只问能不能砸。',
    phase: 'p1',
  },
  {
    id: 'rumor-p2-monolith-shadow',
    title: '一块不反光的黑东西',
    text: '事故档案里偶尔会夹进一张黑色长方体的照片，背面没有日期。',
    phase: 'p2',
  },
];

export const P1_ACCIDENT_ARCHIVES: AccidentArchiveDef[] = [
  {
    id: 'archive-spring-slap',
    title: '弹簧把撬棍抽弯了',
    riskId: 'trap-spring',
    text: '下次听见保险柜里“咔哒”响，先别急着把脸贴过去。',
    phase: 'p1',
  },
  {
    id: 'archive-car-battery-flash',
    title: '报废车电池爆了一下',
    riskId: 'explosion-battery',
    text: '车头区域先检查电池，再决定是不是让老哥近身补最后一锤。',
    phase: 'p1',
  },
  {
    id: 'archive-missile-boom',
    title: '导弹教会了老哥撤退',
    riskId: 'explosion-missile',
    text: '有些东西不是不能砸，是要先想清楚自己有没有命看掉落。',
    phase: 'p1',
  },
];

export const P1_RUMOR_MAP = Object.fromEntries(P1_RUMORS.map((rumor) => [rumor.id, rumor]));
export const P1_ACCIDENT_ARCHIVE_MAP = Object.fromEntries(
  P1_ACCIDENT_ARCHIVES.map((archive) => [archive.id, archive]),
);
