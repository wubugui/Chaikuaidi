// 卖家注册表：用于场景内对白气泡（diegetic 叙事）。自包含，不进 validateContent。
export interface SellerDef {
  id: string;
  name: string;
  emoji: string;
  /** 额外吐槽，配合目标 intro 轮流出现 */
  lines: string[];
}

export const SELLERS: SellerDef[] = [
  {
    id: 'retired-safe-master',
    name: '退休锁匠',
    emoji: '🧓',
    lines: [
      '这柜子我开了一辈子也没记住密码，你来硬的吧。',
      '里面要么是养老钱，要么是张催债条，砸开就知道。',
      '别问我钥匙，钥匙跟前妻一起走了。',
    ],
  },
  {
    id: 'used-car-laozhang',
    name: '二手车老张',
    emoji: '🧔',
    lines: [
      '车不重要，后备箱里那玩意儿才是重点。',
      '底盘那块你悠着点砸，我也不知道前车主装了啥。',
      '砸完废铁归你，车架我可不回收。',
    ],
  },
  {
    id: 'man-in-black',
    name: '黑衣人',
    emoji: '🕶️',
    lines: [
      '上次那单您处理得很响，这次我带了个更安静的，理论上。',
      '签字之前别问来源，问就是没有来源。',
      '砸不砸随您，但别在这儿出事，影响我做生意。',
    ],
  },
  {
    id: 'monolith',
    name: '黑方碑',
    emoji: '⬛',
    lines: [
      '……（它没有说话，但你听见了合同被签下的声音）',
      '你不是第一个走到这儿的老哥。',
      '砸下去之前，再想想是谁把你推回来的。',
    ],
  },
];

export const SELLER_MAP: Record<string, SellerDef> = Object.fromEntries(SELLERS.map((seller) => [seller.id, seller]));
