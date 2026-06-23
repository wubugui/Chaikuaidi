import type { MaterialId } from './materials';
import type { MutationId } from './mutations';
import type { SellerLine } from './missions';
import type { ParcelSizeId } from './types';

export interface BatchDef {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  price: number;
  count: number;
  /** 稀有度权重倍率（叠加在基础权重上，>1 偏向该档） */
  rarityBias: { rare?: number; epic?: number; legendary?: number; absurd?: number };
  /** 该批次产出的快递规格 */
  sizes: ParcelSizeId[];
  unlockStage: 1 | 2 | 3 | 4;
}

export const BATCHES: BatchDef[] = [
  {
    id: 'loose', name: '散件', emoji: '📦', desc: '普通快递一小堆',
    price: 20, count: 5, rarityBias: {}, sizes: ['small', 'standard'], unlockStage: 1,
  },
  {
    id: 'returns', name: '退货堆', emoji: '🗳️', desc: '略偏稀有',
    price: 100, count: 10, rarityBias: { rare: 2 }, sizes: ['standard', 'reinforced'], unlockStage: 2,
  },
  {
    id: 'customs', name: '海关罚没', emoji: '🛃', desc: '偏史诗',
    price: 800, count: 10, rarityBias: { rare: 2, epic: 3 }, sizes: ['reinforced', 'crate'], unlockStage: 3,
  },
  {
    id: 'mystery', name: '神秘集装箱', emoji: '🚢', desc: '高传说率',
    price: 10000, count: 20, rarityBias: { epic: 3, legendary: 4 }, sizes: ['crate', 'container'], unlockStage: 4,
  },
  {
    id: 'blackmarket', name: '黑市批次', emoji: '🕶️', desc: '离谱率翻倍',
    price: 100000, count: 30, rarityBias: { legendary: 3, absurd: 5 }, sizes: ['crate', 'container'], unlockStage: 4,
  },
];

export interface LuggageDef {
  id: string;
  name: string;
  emoji: string;
  flavor: string;       // 故事文案（神秘感钩子）
  price: number;
  baseSize: ParcelSizeId; // 借用尺寸做 size 字段
  sealMax: number;       // 行李难撬
  lootMin: number;
  lootMax: number;
  luckBonus: number;     // 高幸运 → 概率爆
  pool: string[];        // 主题掉落池
  unlockStage: 1 | 2 | 3 | 4;
  seller?: SellerLine;   // 荒诞卖家对白（买入时弹出，行李用短台词）
}

export const LUGGAGE: LuggageDef[] = [
  {
    id: 'lug_woman', name: '陌生女人丢弃的行李', emoji: '🧳',
    flavor: '粉色行李箱，密码锁停在 0000。半瓶廉价香水，一沓没寄出的信，和一个她大概再也不想要的秘密。',
    price: 600, baseSize: 'reinforced', sealMax: 360, lootMin: 4, lootMax: 6, luckBonus: 0.6,
    pool: ['letter', 'polaroid', 'lipstick', 'perfume', 'ring', 'watch', 'phone', 'bra', 'panties', 'stocking', 'condom'],
    unlockStage: 2,
    seller: { name: '只留下背影的女人', emoji: '🚶‍♀️', lines: ['您好。这只箱子里的东西，都是我决定不再要的。', '密码是 0000。东西您随意处置，只求您别去想它们原来的主人。'] },
  },
  {
    id: 'lug_weirdo', name: '变态的行李', emoji: '🧳',
    flavor: '全是分类整理好的「藏品」，贴着手写标签。你不想知道这些是干嘛用的——但有些，好像还挺值钱？',
    price: 4000, baseSize: 'crate', sealMax: 1000, lootMin: 5, lootMax: 7, luckBonus: 0.8,
    pool: ['knob', 'namebook', 'handmodel', 'socks', 'doll', 'gpu'],
    unlockStage: 3,
    seller: { name: '彬彬有礼的收藏家', emoji: '🧐', lines: ['您好。这些藏品我逐一编号、贴签、按用途分类，十年如一日。', '您看不懂它们的用途，很正常。请妥善保管——它们值得被认真对待。'] },
  },
  {
    id: 'lug_grave', name: '墓地捡到的行李', emoji: '🧳',
    flavor: '你发誓昨天那儿什么都没有。箱子上还沾着新翻的泥，拉链一拉，一股……回忆的味道涌出来。',
    price: 9000, baseSize: 'crate', sealMax: 1300, lootMin: 5, lootMax: 8, luckBonus: 1.0,
    pool: ['candle', 'pocketwatch', 'beads', 'urn', 'statue', 'alien'],
    unlockStage: 3,
    seller: { name: '守墓人', emoji: '🪦', lines: ['您好。这只箱子昨夜出现在第七排墓前，沾着新土，我守了一宿，没人来取。', '按规矩搁了七天，原主大概不会来了。东西归您。夜里若有响动，别应声。'] },
  },
  {
    id: 'lug_alien', name: '不属于地球的行李', emoji: '🛸',
    flavor: '它不是地球上的材质。打开的瞬间你听到了嗡嗡声，箱子内壁还在缓慢地……呼吸。',
    price: 120000, baseSize: 'container', sealMax: 4000, lootMin: 8, lootMax: 12, luckBonus: 1.5,
    pool: ['ufo', 'alien', 'diamond', 'goldbar', 'carkey', 'gpu'],
    unlockStage: 4,
    seller: { name: '海关查验员', emoji: '🛃', lines: ['您好。这件托运行李超重，我们的秤称不出读数，只能转交给您处理。', '内壁保持恒温、会缓慢起伏，我们登记为「保鲜功能」。请尽快开箱。'] },
  },
];

export interface ContainerDef {
  id: string; name: string; emoji: string; flavor: string;
  price: number; material: MaterialId;
  sealMax: number; lootMin: number; lootMax: number; luckBonus: number;
  pool: string[]; unlockStage: 1 | 2 | 3 | 4;
  hollowChance?: number;  // 扑空概率（原石）
  danger?: boolean;       // volatile：错误工具开箱会爆炸
  requireMutation?: MutationId; // 变异门：没有该变异时任何工具都撬不动
  merchantOnly?: boolean; // 黑市专属且限量：从普通商店消失，仅黑市商人到访时供货
  seller?: SellerLine; // 荒诞卖家对白（买入时弹出，货柜用短台词）
}

export const CONTAINERS: ContainerDef[] = [
  { id:'clam',  name:'河里捞的巨蚌', emoji:'🦪', material:'organic', price:800, sealMax:520, lootMin:1, lootMax:1, luckBonus:0.9,
    flavor:'比脸还大，壳缝里还在吐泡。撬开它得有点耐心——和一点不怕失望的勇气。',
    pool:['pearl','amberbug','ring','snail'], unlockStage:2,
    seller:{ name:'摸蚌的老渔民', emoji:'🎣', lines:['您好。这只蚌是我今早从深沟里摸上来的，比脸盆大，壳还活着。','里面有没有珠子，我摸了一辈子蚌也说不准。我只保证它新鲜，是真的。'] } },
  { id:'ice',   name:'冰柜里的冰封物', emoji:'🧊', material:'organic', price:1500, sealMax:720, lootMin:1, lootMax:2, luckBonus:0.7,
    flavor:'断电很久了，但里面那团东西……保存得意外地好。你最好用火烤，别用手。',
    pool:['glove','mammoth','fossil','watch'], unlockStage:2,
    seller:{ name:'冷库管理员', emoji:'🧊', lines:['您好，这片冷库我管了二十年。这块东西冻进来时，编号那一栏是空白的。','断电那三天我守着它没合眼，化了一层又重新冻上。解冻请用文火，别用手。'] } },
  { id:'ore',   name:'矿场拖来的原石', emoji:'🪨', material:'stone', price:6000, sealMax:820, lootMin:1, lootMax:2, luckBonus:0.5,
    flavor:'沉得要死。也许里面是满洞的水晶，也许……就是块破石头。开了才知道。',
    pool:['crystal','fossil','diamond','goldbar'], unlockStage:3, hollowChance:0.28,
    seller:{ name:'矿上的老孙', emoji:'⛏️', lines:['您好。这块原石是三号采面爆下来的，六百多斤，成色我亲自验过。','是满洞晶体还是一块哑石，开了才算数。我只卖石头，不卖运气。'] } },
  { id:'safe',  name:'撬不动的保险箱', emoji:'🔒', material:'metal', price:12000, sealMax:1300, lootMin:1, lootMax:2, luckBonus:0.8,
    flavor:'密码早忘了，钥匙也没有。里面是养老钱，还是一笔再也讨不回的债？',
    pool:['cashwad','ring','iou','carkey','gpu'], unlockStage:3,
    seller:{ name:'保险柜厂的退休师傅', emoji:'🔑', lines:['您好。这台保险柜是八十年代的老型号，锰钢门板，当年就是我装的。','密码主人没留，锁芯是好锁芯。里面是积蓄还是欠条，我不知道，也无权打开。'] } },
  { id:'meteor',name:'坠在后院的陨石', emoji:'☄️', material:'stone', price:25000, sealMax:1700, lootMin:1, lootMax:2, luckBonus:1.0,
    flavor:'砸穿了棚顶，还带着余温。表面是石头，芯子里的东西不像地球货。',
    pool:['meteoriron','alienalloy','fossil','diamond'], unlockStage:3, merchantOnly:true,
    seller:{ name:'黑衣人', emoji:'🕴️', lines:['陨石一块，星体来源不明，重四百三十公斤。','外壳是普通球粒陨石，芯子里的成分我们没敢检测，留给您。','我只负责交付，不负责您拆开之后的世界观。'] } },
  { id:'missile',name:'不该捡的导弹', emoji:'🚀', material:'volatile', price:40000, sealMax:2000, lootMin:1, lootMax:1, luckBonus:1.2,
    flavor:'弹体上印着别国文字。理智的人会报警——但你只想知道里面那块芯片值多少钱。用错家伙它可会回敬你。',
    pool:['milchip','titanium','note','goldbar','carkey'], unlockStage:3, danger:true, merchantOnly:true,
    seller:{ name:'黑衣人', emoji:'🕴️', lines:['弹体一枚，型号我抹掉了，您也别记。','保险栓在装弹状态，运输全程我一直屏着呼吸。','用对工具它就是货，用错工具它就是事故。现结。'] } },
  { id:'alienegg',name:'会动的外星蛋', emoji:'🥚', material:'anomaly', price:150000, sealMax:1900, lootMin:1, lootMax:1, luckBonus:1.3,
    flavor:'壳是半透明的，里面有东西在缓慢地……心跳。激光切开的瞬间，它好像睁开了眼。',
    pool:['hatchling','alienalloy','ufo','alien'], unlockStage:4, danger:true, merchantOnly:true,
    seller:{ name:'黑衣人', emoji:'🕴️', lines:['卵生标本一枚，恒温运输，内部仍有规律搏动。','出处我不解释。它会动，但合同上写的是「静物」。','孵化概不负责。签了字，它就是您的了。'] } },
  // —— 变异门连锁货柜：买回来先积压，等炸出对应变异才撬得动，撬开本身又是危险品 ——
  { id:'vacuum',  name:'真空压缩块',   emoji:'🧱', material:'metal',   price:60000, sealMax:2300,  lootMin:1, lootMax:2, luckBonus:1.1,
    flavor:'压得像块铁板，普通工具打滑——得用比金属还硬的东西去砸。', pool:['milchip','titanium','alienalloy','gpu'],
    unlockStage:3, danger:true, requireMutation:'brasshead',
    seller:{ name:'废品站老板', emoji:'🧱', lines:['您好。这是我用液压机把一整车金属压成的一块，密度很高。','普通工具碰上去会打滑——不是它硬，是您没用对家伙。得拿比金属还硬的东西。'] } },
  { id:'vines',   name:'缠满藤蔓的木箱', emoji:'🌿', material:'wood',  price:55000, sealMax:1800,  lootMin:1, lootMax:2, luckBonus:1.0,
    flavor:'藤蔓还在生长，越缠越紧，刀砍上去就重新长好。也许得用……会动的锯子。', pool:['mammoth','fossil','amberbug','laptop'],
    unlockStage:3, danger:true, requireMutation:'sawlegs',
    seller:{ name:'温室看护', emoji:'🌿', lines:['您好。这只木箱在温室里搁太久，被藤蔓整个缠死了，藤还在长。','刀砍上去，口子第二天就长回来。您得用会转的、带齿的东西。'] } },
  { id:'alienshell',name:'外星合金壳',  emoji:'🛡️', material:'anomaly', price:180000, sealMax:2800, lootMin:1, lootMax:2, luckBonus:1.4,
    flavor:'连激光阵都只能划出火花。这层壳似乎只对……另一种异常起反应。', pool:['hatchling','alienalloy','ufo','alien'],
    unlockStage:4, danger:true, requireMutation:'lasereye',
    seller:{ name:'材料实验室研究员', emoji:'🛡️', lines:['您好。这层外壳是我们三年没攻克的课题，激光打上去只留一道焦痕。','它似乎只对另一种异常起反应。具体是哪种，建议您问自己的眼睛。'] } },
];
export const CONTAINER_MAP = Object.fromEntries(CONTAINERS.map(c=>[c.id,c]));
