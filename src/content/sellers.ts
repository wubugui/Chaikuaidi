// 卖家注册表：用于进入目标时的全屏立绘对话（视觉小说式）。自包含，不进 validateContent。
export interface SellerDef {
  id: string;
  name: string;
  /** 手绘卖家立绘（public/game-art 路径，经 assetUrl 处理） */
  portrait: string;
  /** 立绘对话台词（搞笑向），配合目标 intro 顺序播放 */
  lines: string[];
}

export const SELLERS: SellerDef[] = [
  {
    id: 'retired-safe-master',
    portrait: '/game-art/icons/seller-seller-94y3hj.png',
    name: '退休锁匠·老周',
    lines: [
      '这柜子我开了三十年都没开开，最后一气之下把钥匙吞了。别问，问就是上头。',
      '里面要么是金条，要么是我前妻的离婚协议书，赌一把？',
      '说明书第一行写着「请勿暴力开启」——所以我特意把它交给你。',
      '砸吧砸吧，砸坏了算你的，砸开了……也算你的，反正不算我的。',
    ],
  },
  {
    id: 'used-car-laozhang',
    portrait: '/game-art/icons/seller-seller-15us0ur.png',
    name: '二手车·老张',
    lines: [
      '车不要钱，钱在后备箱里——大概吧，我反正没敢开。',
      '上一任车主特意叮嘱「底盘千万别碰」，然后他就再也没说过话了。',
      '发动机还能响两声，电池嘛……你离远点砸，给你个建议。',
      '砸出来的废铁归你，砸出来的事故，归「我从来没卖过这车」。',
    ],
  },
  {
    id: 'man-in-black',
    portrait: '/game-art/icons/seller-seller-13x4fo5.png',
    name: '黑衣人',
    lines: [
      '上次那单您砸得惊天动地，整条街都报了警，这次我特意挑了个「静音款」。',
      '来源？这东西没有来源，是它自己找上门的，我也很为难。',
      '理论上它是安全的。我加重了「理论上」三个字，您品。',
      '签字、收货、别回头——尤其，别回头看。',
    ],
  },
  {
    id: 'monolith',
    portrait: '/game-art/icons/absurd-a-monolith.png',
    name: '黑方碑',
    lines: [
      '……（它一句没说，但你裤兜里多了一份合同，签名是你自己的笔迹。）',
      '你已经是这个月第七个走到这儿的「暴躁老哥」了。',
      '砸我之前先想清楚：到底是你在砸我，还是有人在一遍遍把你推回来砸我。',
      '（你忽然很想砸它。这个念头不是你自己冒出来的。）',
    ],
  },
];

export const SELLER_MAP: Record<string, SellerDef> = Object.fromEntries(SELLERS.map((seller) => [seller.id, seller]));
