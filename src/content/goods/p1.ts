// 货架商店：可购买的独一无二货物。半盲购买——买之前只看得到外形、卖家的吹嘘和价格，
// 真正的材质 / 需要的工具 / 内部结构，要买回来砸了才知道。
// 每件货物引用一个 target；买下后进货架（ownedGoods），同时只能把一件放上工作台砸，可随时切换。
export interface GoodOfferDef {
  id: string;
  targetId: string;
  name: string;
  seller: string;
  hype: string; // 卖家吹嘘（半盲信息）
  hint: string; // 模糊提示，不透露真实材质/门槛
  price: number;
  icon: string;
  tier: 'cheap' | 'mid' | 'high' | 'top';
}

const safeArt = '/game-art/icons/shop-safe.png';
const carArt = '/game-art/icons/giant-g-car.png';
const missileArt = '/game-art/icons/shop-missile.png';

export const P1_GOODS_SHOP: GoodOfferDef[] = [
  {
    id: 'good-blackball',
    targetId: 'oddity-blackball',
    name: '陨星压缩核（疑似）',
    seller: '黑市散货摊',
    hype: '「老板，这玩意儿一个能顶你十个保险柜，沉得很，里面绝对有货！」',
    hint: '入手就知道：沉、黑、砸上去只有闷响。能不能砸开，得看你有什么家伙。',
    price: 220,
    icon: safeArt,
    tier: 'cheap',
  },
  {
    id: 'good-safe',
    targetId: 'safe-stubborn',
    name: '撬不动的保险柜',
    seller: '退休开锁师傅',
    hype: '「密码没人记得，里面可能是养老钱——也可能是一笔讨不回的债。」',
    hint: '锰钢门板，看着就硬。多面、多部位，得讲究顺序。',
    price: 320,
    icon: safeArt,
    tier: 'mid',
  },
  {
    id: 'good-car',
    targetId: 'car-scrapyard',
    name: '报废汽车',
    seller: '二手车老张',
    hype: '「车是好车，就是前车主没处理干净，后备箱我可不敢开。」',
    hint: '整车好几块，电池鼓包、底盘还有不该在那儿的东西。',
    price: 760,
    icon: carArt,
    tier: 'high',
  },
  {
    id: 'good-missile',
    targetId: 'missile-dont-touch',
    name: '不该捡的「金属管」',
    seller: '黑衣人',
    hype: '「别问来历，问就是工业废料。里面那块芯片，值你半年快递钱。」',
    hint: '又长又重，一头还插着保险栓。理智的人会报警。',
    price: 1500,
    icon: missileArt,
    tier: 'top',
  },
];

export const P1_GOODS_SHOP_MAP = Object.fromEntries(P1_GOODS_SHOP.map((good) => [good.id, good]));
