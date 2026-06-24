import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const iconDir = path.join(root, 'public/game-art/icons');
const manifestPath = path.join(root, 'src/assets/gameArt.ts');

const sources = [
  ['item', 'src/data/items.ts'],
  ['quote', 'src/data/quotes.ts'],
  ['parcel', 'src/data/parcels.ts'],
  ['tool', 'src/data/tools.ts'],
  ['material', 'src/data/materials.ts'],
  ['shop', 'src/data/shop.ts'],
  ['giant', 'src/data/giants.ts'],
  ['absurd', 'src/data/absurd.ts'],
  ['ordnance', 'src/data/ordnance.ts'],
  ['mutation', 'src/data/mutations.ts'],
  ['upgrade', 'src/data/upgrades.ts'],
  ['prestige', 'src/data/prestige.ts'],
  ['mission', 'src/data/missions.ts'],
  ['blueprint', 'src/data/blueprints.ts'],
  ['achievement', 'src/data/achievements.ts'],
  ['stage', 'src/data/stages.ts'],
];

const manual = [
  ['ui', 'logo', '拆快递', '📦'],
  ['ui', 'bag', '背包', '🎒'],
  ['ui', 'coin', '金钱', '🪙'],
  ['ui', 'reputation', '信誉', '⭐'],
  ['ui', 'sound-on', '音效开', '🔊'],
  ['ui', 'sound-off', '音效关', '🔇'],
  ['ui', 'trash', '重开存档', '🗑️'],
  ['ui', 'lock', '锁定', '🔒'],
  ['ui', 'unknown', '未知', '❓'],
  ['ui', 'target', '目标', '🎯'],
  ['ui', 'spark', '高亮', '✨'],
  ['ui', 'sell', '卖货', '💰'],
  ['ui', 'inbox', '入库', '📥'],
  ['ui', 'click', '按住猛砸', '👆'],
  ['ui', 'danger', '危险', '⚠️'],
  ['ui', 'boom', '爆炸', '💥'],
  ['ui', 'crack', '裂痕', '💢'],
  ['ui', 'map', '远征', '🗺️'],
  ['ui', 'merchant', '黑市商人', '🕶️'],
  ['ui', 'collection', '图鉴', '🖼️'],
  ['ui', 'achievement', '成就', '🏅'],
  ['ui', 'prestige', '跑路重开', '♻️'],
  ['ui', 'workshop', '工坊', '🔧'],
  ['ui', 'factory', '厂房', '🏭'],
  ['ui', 'refinery', '提炼', '🧪'],
  ['ui', 'quote', '语录', '🗯️'],
  ['ui', 'mutation', '变异', '🧬'],
  ['ui', 'blueprint', '图纸', '📐'],
  ['ui', 'running', '运行中', '▶️'],
  ['ui', 'paused', '已停', '⏸️'],
  ['ui', 'check', '完成', '✅'],
  ['ui', 'unique', '唯一', '🏅'],
  ['ui', 'pipe', '管线', '🏭'],
  ['fx', 'paper-a', '纸屑', '📄'],
  ['fx', 'paper-b', '纸片', '⬜'],
  ['fx', 'tape', '胶带碎片', '🟫'],
  ['fx', 'spark-a', '火星', '✦'],
  ['fx', 'spark-b', '碎光', '✧'],
  ['character', 'worker-neutral', '看守老哥冷静', '😐'],
  ['character', 'worker-angry', '看守老哥生气', '😠'],
  ['character', 'worker-heated', '看守老哥上头', '😤'],
  ['character', 'worker-furious', '看守老哥暴怒', '🤬'],
  ['character', 'worker-demon', '看守老哥狂暴', '😈'],
  ['story', 'intro-depot', '废弃快递收容站', '🏚️'],
  ['story', 'intro-worker', '唯一看守', '😤'],
  ['story', 'intro-bored', '无聊登记', '🥱'],
  ['story', 'intro-rage', '彻底点燃', '🤬'],
  ['story', 'intro-smash', '徒手开拆', '🖐️💥'],
  ['story', 'intro-reveal', '开箱顿悟', '📦✨'],
];

function hash(input) {
  let h = 2166136261;
  for (const ch of input) {
    h ^= ch.codePointAt(0) ?? 0;
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function slug(input) {
  const out = String(input)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return out || `x-${hash(input)}`;
}

function escXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function prop(block, key) {
  const re = new RegExp(`${key}\\s*:\\s*(?:'([^']*)'|"([^"]*)"|([0-9]+))`);
  const m = block.match(re);
  return m ? (m[1] ?? m[2] ?? m[3]) : '';
}

function blocks(text) {
  const out = [];
  const stack = [];
  let quote = '';
  let escape = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') stack.push(i);
    if (ch === '}') {
      const start = stack.pop();
      if (start != null) out.push(text.slice(start, i + 1));
    }
  }
  return out;
}

function collect() {
  const seen = new Set();
  const entries = [];
  const add = (kind, id, name, emoji) => {
    if (!id || !name || !emoji) return;
    const key = `${kind}:${id}`;
    if (seen.has(key)) return;
    seen.add(key);
    entries.push({ kind, id, name, emoji });
  };

  for (const [kind, file] of sources) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    for (const block of blocks(text)) {
      const id = prop(block, 'id');
      const name = prop(block, 'name');
      const emoji = prop(block, 'emoji');
      if (!id || !name || !emoji) continue;
      add(kind, kind === 'stage' ? `stage-${id}` : id, name, emoji);
    }
    const sellerRe = /seller\s*:\s*\{\s*name\s*:\s*['"]([^'"]+)['"][\s\S]*?emoji\s*:\s*['"]([^'"]+)['"]/g;
    for (const m of text.matchAll(sellerRe)) add('seller', `seller-${hash(m[1])}`, m[1], m[2]);
  }

  for (const [kind, id, name, emoji] of manual) add(kind, id, name, emoji);
  return entries;
}

function palette(meta) {
  const id = `${meta.kind}:${meta.id}:${meta.name}`;
  const palettes = [
    ['#f7c46c', '#a76331', '#ffefaf'],
    ['#75d6ff', '#2864b8', '#e2fbff'],
    ['#b98cff', '#6c35b8', '#f0dcff'],
    ['#76e0a3', '#24885c', '#e0ffe7'],
    ['#ff7d88', '#b12b47', '#ffe1e5'],
    ['#f0f2f5', '#7d8794', '#ffffff'],
    ['#ffdf58', '#d17b19', '#fff4b8'],
    ['#52ffe0', '#177e8b', '#d7fff7'],
  ];
  const picked = palettes[parseInt(hash(id).slice(0, 2), 36) % palettes.length];
  return { a: picked[0], b: picked[1], c: picked[2], line: '#1b1126' };
}

function keyText(meta) {
  return `${meta.kind} ${meta.id} ${meta.name}`.toLowerCase();
}

function concept(meta) {
  const k = keyText(meta);
  if (meta.kind === 'character') return 'worker';
  if (meta.kind === 'fx') return k.includes('spark') ? 'spark' : 'scrap';
  if (meta.kind === 'material') return `material-${meta.id}`;
  if (meta.kind === 'tool') return `tool-${meta.id}`;
  if (meta.kind === 'mutation') return `mutation-${meta.id}`;
  if (meta.kind === 'ordnance') return `ordnance-${meta.id}`;
  if (meta.kind === 'stage') return k.includes('小卖部') ? 'shopfront' : k.includes('物流') ? 'globe' : k.includes('分拣') ? 'factory' : 'workshop';
  if (meta.kind === 'ui') return `ui-${meta.id}`;
  if (k.includes('信封') || k.includes('letter') || k.includes('note') || k.includes('iou') || k.includes('纸条') || k.includes('情书') || k.includes('房产证') || k.includes('本子') || k.includes('录像带')) return 'paper';
  if (k.includes('箱') || k.includes('快递') || k.includes('parcel') || k.includes('crate') || k.includes('container') || k.includes('returns') || k.includes('foam') || k.includes('batch') || k.includes('海关') || k.includes('散件')) return 'box';
  if (k.includes('行李') || k.includes('luggage')) return 'luggage';
  if (k.includes('保险') || k.includes('safe')) return 'safe';
  if (k.includes('导弹') || k.includes('火箭') || k.includes('missile') || k.includes('launchpad')) return 'rocket';
  if (k.includes('飞船') || k.includes('ufo') || k.includes('外星') || k.includes('空间站') || k.includes('station')) return 'ufo';
  if (k.includes('汽车') || k.includes('车') || k.includes('皮卡') || k.includes('transformer') || k.includes('carkey')) return 'car';
  if (k.includes('客机') || k.includes('plane')) return 'plane';
  if (k.includes('货轮') || k.includes('ship')) return 'ship';
  if (k.includes('坦克') || k.includes('tank')) return 'tank';
  if (k.includes('高达') || k.includes('机甲') || k.includes('gundam') || k.includes('mech')) return 'mech';
  if (k.includes('方碑') || k.includes('monolith')) return 'monolith';
  if (k.includes('蚌') || k.includes('珍珠') || k.includes('organic')) return 'clam';
  if (k.includes('冰') || k.includes('冷库')) return 'ice';
  if (k.includes('矿') || k.includes('石') || k.includes('陨') || k.includes('化石') || k.includes('晶') || k.includes('diamond')) return 'crystal';
  if (k.includes('蛋') || k.includes('hatchling')) return 'egg';
  if (k.includes('藤') || k.includes('vines')) return 'vines';
  if (k.includes('盾') || k.includes('合金壳')) return 'shield';
  if (k.includes('钱') || k.includes('现金') || k.includes('金条') || k.includes('gold') || k.includes('cash')) return 'money';
  if (k.includes('手机') || k.includes('笔记本') || k.includes('显卡') || k.includes('芯片') || k.includes('电路') || k.includes('camera') || k.includes('gamepad')) return 'gadget';
  if (k.includes('齿轮') || k.includes('螺丝') || k.includes('弹簧') || k.includes('伺服') || k.includes('传送带') || k.includes('零件')) return 'part';
  if (k.includes('元素') || k.includes('铁') || k.includes('铜') || k.includes('硅') || k.includes('钛') || k.includes('铀') || k.includes('稀土') || k.includes('反物质')) return 'element';
  if (k.includes('袜') || k.includes('鞋') || k.includes('手套') || k.includes('内衣') || k.includes('黑丝') || k.includes('口红') || k.includes('香水') || k.includes('戒指')) return 'personal';
  if (k.includes('语录') || meta.kind === 'quote') return 'quote';
  if (k.includes('成就')) return 'medal';
  if (k.includes('图纸')) return 'blueprint';
  if (meta.kind === 'mission') return 'building';
  return 'artifact';
}

const tag = {
  shadow: '<ellipse cx="64" cy="108" rx="38" ry="10" fill="#000" opacity=".26"/>',
  shine: '<path d="M38 29c10-10 28-14 48-7" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".28"/>',
};

function iconFrame(body) {
  return `${tag.shadow}<g filter="url(#ds)">${body}</g>`;
}

function draw(meta) {
  const p = palette(meta);
  const c = concept(meta);
  const line = p.line;
  const box = `<path d="M27 50 63 31l39 19v38L64 107 27 88Z" fill="url(#body)" stroke="${line}" stroke-width="5" stroke-linejoin="round"/><path d="M27 50l37 19 38-19M64 69v38" fill="none" stroke="${line}" stroke-width="4" opacity=".45"/><path d="M51 38 88 57v16L51 55Z" fill="#fff" opacity=".23"/><path d="M59 34l16 8v56l-16 8Z" fill="#f5d28b" opacity=".85"/>`;
  const paper = `<path d="M29 40 82 27l17 58-54 16Z" fill="#f6e7c6" stroke="${line}" stroke-width="5" stroke-linejoin="round"/><path d="M37 49l44-11M41 64l37-9M46 80l30-8" stroke="${line}" stroke-width="4" opacity=".35" stroke-linecap="round"/><path d="M82 27l17 58-16-9Z" fill="#d8b47a" opacity=".55"/>`;
  const cbs = {
    box,
    paper,
    luggage: `<rect x="33" y="38" width="62" height="62" rx="13" fill="url(#body)" stroke="${line}" stroke-width="5"/><path d="M48 38v-9h32v9" fill="none" stroke="${line}" stroke-width="6" stroke-linecap="round"/><path d="M51 44v52M77 44v52" stroke="${line}" stroke-width="4" opacity=".28"/><circle cx="45" cy="104" r="6" fill="${line}"/><circle cx="83" cy="104" r="6" fill="${line}"/>`,
    safe: `<rect x="27" y="34" width="74" height="68" rx="8" fill="url(#body)" stroke="${line}" stroke-width="6"/><rect x="36" y="43" width="56" height="50" rx="4" fill="#000" opacity=".18"/><circle cx="65" cy="67" r="16" fill="#d5dde8" stroke="${line}" stroke-width="5"/><circle cx="65" cy="67" r="5" fill="${line}"/><path d="M82 49h9M82 86h9" stroke="#fff" stroke-width="4" opacity=".36" stroke-linecap="round"/>`,
    rocket: `<path d="M67 17c18 16 24 42 13 67L49 91C41 64 49 34 67 17Z" fill="url(#body)" stroke="${line}" stroke-width="5" stroke-linejoin="round"/><path d="m47 75-18 20 24-5M82 69l23 11-25 6" fill="url(#accent)" stroke="${line}" stroke-width="5" stroke-linejoin="round"/><circle cx="65" cy="48" r="9" fill="#dff8ff" stroke="${line}" stroke-width="4"/><path d="M55 92c0 12 8 19 8 19s11-8 13-22" fill="#ffbe3d" stroke="${line}" stroke-width="4"/>`,
    ufo: `<ellipse cx="64" cy="71" rx="47" ry="18" fill="url(#body)" stroke="${line}" stroke-width="5"/><path d="M41 68c6-21 39-21 46 0" fill="url(#accent)" stroke="${line}" stroke-width="5"/><circle cx="45" cy="76" r="4" fill="#bffaff"/><circle cx="64" cy="79" r="4" fill="#bffaff"/><circle cx="83" cy="76" r="4" fill="#bffaff"/><path d="M39 91c18 10 33 10 50 0" stroke="#88fff1" stroke-width="5" opacity=".5" stroke-linecap="round"/>`,
    car: `<path d="M24 73h10l10-19h36l14 19h10v18H24Z" fill="url(#body)" stroke="${line}" stroke-width="5" stroke-linejoin="round"/><path d="M48 55h28l9 18H39Z" fill="#c7f3ff" stroke="${line}" stroke-width="4"/><circle cx="43" cy="93" r="11" fill="${line}"/><circle cx="86" cy="93" r="11" fill="${line}"/><circle cx="43" cy="93" r="4" fill="#9aa4b2"/><circle cx="86" cy="93" r="4" fill="#9aa4b2"/>`,
    plane: `<path d="M19 68 107 45l7 10-38 25 2 25-12 4-11-22-24 11-8-7 19-17Z" fill="url(#body)" stroke="${line}" stroke-width="5" stroke-linejoin="round"/><path d="M53 59 39 32l13-4 24 24" fill="url(#accent)" stroke="${line}" stroke-width="4" stroke-linejoin="round"/>`,
    ship: `<path d="M22 73h84l-13 25H38Z" fill="url(#body)" stroke="${line}" stroke-width="5" stroke-linejoin="round"/><path d="M37 47h18v26H37Zm24-8h18v34H61Zm24 15h14v19H85Z" fill="url(#accent)" stroke="${line}" stroke-width="4"/><path d="M27 101c17 8 32-7 48 0 13 5 23 1 30-4" fill="none" stroke="#8ee7ff" stroke-width="5" opacity=".55" stroke-linecap="round"/>`,
    tank: `<rect x="25" y="70" width="78" height="24" rx="12" fill="${line}"/><path d="M36 51h45l11 20H29Z" fill="url(#body)" stroke="${line}" stroke-width="5" stroke-linejoin="round"/><path d="M78 55h33" stroke="${line}" stroke-width="8" stroke-linecap="round"/><circle cx="43" cy="82" r="5" fill="#87919e"/><circle cx="63" cy="82" r="5" fill="#87919e"/><circle cx="83" cy="82" r="5" fill="#87919e"/>`,
    mech: `<rect x="42" y="35" width="44" height="45" rx="8" fill="url(#body)" stroke="${line}" stroke-width="5"/><rect x="48" y="43" width="12" height="10" fill="#bffaff" stroke="${line}" stroke-width="3"/><rect x="68" y="43" width="12" height="10" fill="#bffaff" stroke="${line}" stroke-width="3"/><path d="M42 62h44M37 81l-12 19M91 81l12 19M43 80v23M85 80v23" stroke="${line}" stroke-width="7" stroke-linecap="round"/><path d="M36 42 22 61M92 42l16 15" stroke="${line}" stroke-width="8" stroke-linecap="round"/>`,
    monolith: `<rect x="47" y="21" width="34" height="86" rx="2" fill="#07070b" stroke="#111827" stroke-width="6"/><path d="M51 25h9v78h-9Z" fill="#fff" opacity=".08"/><path d="M36 109c15-16 42-16 56 0" fill="none" stroke="#9d7cff" stroke-width="6" opacity=".45" stroke-linecap="round"/>`,
    clam: `<path d="M24 76c8-32 72-43 80 0-7 26-71 29-80 0Z" fill="url(#body)" stroke="${line}" stroke-width="5" stroke-linejoin="round"/><path d="M35 72c11-17 43-24 57-4M44 60l-8 23M62 54l-3 32M80 56l4 27" fill="none" stroke="${line}" stroke-width="4" opacity=".32"/><circle cx="65" cy="78" r="10" fill="#fff7da" stroke="${line}" stroke-width="4"/>`,
    ice: `<path d="M35 36 74 26l26 26-8 43-42 12-25-31Z" fill="#bff4ff" opacity=".82" stroke="${line}" stroke-width="5" stroke-linejoin="round"/><path d="M74 26 66 72 50 107M66 72l34-20M66 72 25 76" stroke="#fff" stroke-width="4" opacity=".48"/>`,
    crystal: `<path d="M57 19 79 58 65 111 36 67Z" fill="url(#body)" stroke="${line}" stroke-width="5" stroke-linejoin="round"/><path d="M79 58 98 81 65 111M36 67 18 91l47 20" fill="url(#accent)" stroke="${line}" stroke-width="4" stroke-linejoin="round"/><path d="M57 19 65 111" stroke="#fff" stroke-width="4" opacity=".28"/>`,
    egg: `<path d="M64 21c24 0 35 30 35 52 0 25-15 38-35 38S29 98 29 73c0-22 11-52 35-52Z" fill="url(#body)" stroke="${line}" stroke-width="5"/><circle cx="53" cy="55" r="6" fill="#fff" opacity=".35"/><circle cx="75" cy="71" r="8" fill="#fff" opacity=".28"/><path d="M48 89c10 7 22 7 34 0" stroke="${line}" stroke-width="4" opacity=".3" stroke-linecap="round"/>`,
    vines: `${box}<path d="M30 87c29-8 18-42 58-42 18 0 24-13 24-13" fill="none" stroke="#30c46b" stroke-width="7" stroke-linecap="round"/><path d="M48 67c-12-9-18-1-18-1s8 12 20 7M77 45c-5-14 7-18 7-18s9 11 0 21" fill="#79e68b" stroke="${line}" stroke-width="3"/>`,
    shield: `<path d="M64 19 99 33v30c0 24-13 39-35 50-22-11-35-26-35-50V33Z" fill="url(#body)" stroke="${line}" stroke-width="5" stroke-linejoin="round"/><path d="M64 30v66M43 49h42" stroke="#fff" stroke-width="5" opacity=".25" stroke-linecap="round"/>`,
    money: `<path d="M31 42h56c14 0 20 9 20 21v22H41c-14 0-20-9-20-21V52c0-6 4-10 10-10Z" fill="#4ade80" stroke="${line}" stroke-width="5"/><circle cx="64" cy="64" r="14" fill="#fff2a8" stroke="${line}" stroke-width="4"/><path d="M35 88h58v13H35Z" fill="#e8a72e" stroke="${line}" stroke-width="5"/>`,
    gadget: `<rect x="34" y="28" width="60" height="72" rx="10" fill="url(#body)" stroke="${line}" stroke-width="5"/><rect x="43" y="40" width="42" height="36" rx="4" fill="#101827" stroke="${line}" stroke-width="3"/><path d="M50 86h28M54 48h20M52 58h24" stroke="#7af9ff" stroke-width="4" opacity=".75" stroke-linecap="round"/>`,
    part: `<path d="M64 23 74 39l19-2 3 20 16 10-10 18 4 19-20 4-13 15-17-11-20 3-5-19-16-11 10-17-3-20 20-4Z" fill="url(#body)" stroke="${line}" stroke-width="5" stroke-linejoin="round"/><circle cx="64" cy="71" r="18" fill="#182033" stroke="${line}" stroke-width="5"/><circle cx="64" cy="71" r="7" fill="#d7e2ef"/>`,
    element: `<path d="M64 22c30 20 30 62 0 85-30-23-30-65 0-85Z" fill="url(#body)" stroke="${line}" stroke-width="5"/><path d="M39 70c15-16 36-16 50 0M48 48c10 9 22 9 32 0" fill="none" stroke="#fff" stroke-width="5" opacity=".35" stroke-linecap="round"/><circle cx="64" cy="70" r="9" fill="#fff" opacity=".55"/>`,
    personal: `<path d="M40 87c7-29 3-45 24-45s17 16 24 45c-13 15-35 15-48 0Z" fill="url(#body)" stroke="${line}" stroke-width="5" stroke-linejoin="round"/><path d="M45 86c10 8 27 8 38 0M54 52c6 5 14 5 20 0" fill="none" stroke="#fff" stroke-width="5" opacity=".3" stroke-linecap="round"/>`,
    quote: `<path d="M29 37h70v46H58L41 99V83H29Z" fill="url(#body)" stroke="${line}" stroke-width="5" stroke-linejoin="round"/><circle cx="49" cy="60" r="6" fill="#fff"/><circle cx="66" cy="60" r="6" fill="#fff"/><circle cx="83" cy="60" r="6" fill="#fff"/>`,
    medal: `<circle cx="64" cy="57" r="29" fill="url(#body)" stroke="${line}" stroke-width="5"/><path d="M47 83 38 111l26-13 26 13-9-28" fill="url(#accent)" stroke="${line}" stroke-width="5" stroke-linejoin="round"/><path d="M64 38l6 13 14 2-10 10 3 14-13-7-13 7 3-14-10-10 14-2Z" fill="#fff8b5" stroke="${line}" stroke-width="3"/>`,
    blueprint: `<path d="M30 31h60c8 0 12 5 8 13l-7 14 7 15c4 8 0 14-8 14H30c8-11 8-45 0-56Z" fill="#9ad7ff" stroke="${line}" stroke-width="5" stroke-linejoin="round"/><path d="M45 48h31M45 62h20M70 62h12M45 75h36" stroke="#0f3d61" stroke-width="4" opacity=".55" stroke-linecap="round"/>`,
    building: `<path d="M29 103V49l35-25 35 25v54Z" fill="url(#body)" stroke="${line}" stroke-width="5" stroke-linejoin="round"/><path d="M47 58h10v10H47Zm24 0h10v10H71ZM47 78h10v10H47Zm24 0h10v10H71Z" fill="#ffe59b" stroke="${line}" stroke-width="3"/><path d="M24 103h80" stroke="${line}" stroke-width="6" stroke-linecap="round"/>`,
    artifact: `<path d="M64 20 97 50 84 101H44L31 50Z" fill="url(#body)" stroke="${line}" stroke-width="5" stroke-linejoin="round"/><path d="M64 20v81M31 50h66M44 101l20-51 20 51" stroke="#fff" stroke-width="4" opacity=".22"/>`,
    workshop: `<path d="M29 89 77 41l12 12-48 48H29Z" fill="url(#body)" stroke="${line}" stroke-width="5" stroke-linejoin="round"/><path d="M77 41l15-15 12 12-15 15" fill="url(#accent)" stroke="${line}" stroke-width="5"/><circle cx="39" cy="90" r="6" fill="${line}"/>`,
    factory: `<path d="M25 101V54l25 13V54l25 13V42h28v59Z" fill="url(#body)" stroke="${line}" stroke-width="5" stroke-linejoin="round"/><path d="M36 78h12v23M61 78h12v23M86 59h8M86 73h8M86 87h8" stroke="${line}" stroke-width="4" opacity=".35"/>`,
    globe: `<circle cx="64" cy="64" r="40" fill="url(#body)" stroke="${line}" stroke-width="5"/><path d="M24 64h80M64 24c13 12 18 67 0 80M64 24c-13 12-18 67 0 80" fill="none" stroke="${line}" stroke-width="4" opacity=".4"/>`,
    shopfront: `<path d="M29 55h70v48H29Z" fill="url(#body)" stroke="${line}" stroke-width="5"/><path d="M24 39h80l-8 22H32Z" fill="url(#accent)" stroke="${line}" stroke-width="5" stroke-linejoin="round"/><rect x="41" y="74" width="20" height="29" fill="#1d1730"/><rect x="69" y="73" width="18" height="15" fill="#ffe59b" opacity=".8"/>`,
    spark: `<path d="M64 17 74 53l36 11-36 11-10 36-10-36-36-11 36-11Z" fill="url(#body)" stroke="${line}" stroke-width="5" stroke-linejoin="round"/>`,
    scrap: `<path d="M31 40 91 28 100 87 42 101Z" fill="url(#body)" stroke="${line}" stroke-width="5" stroke-linejoin="round"/><path d="M43 54 81 47M47 70l34-5" stroke="#fff" stroke-width="4" opacity=".35" stroke-linecap="round"/>`,
  };

  if (c.startsWith('tool-')) return iconFrame(drawTool(c.slice(5), p, line));
  if (c.startsWith('material-')) return iconFrame(drawMaterial(c.slice(9), p, line));
  if (c.startsWith('mutation-')) return iconFrame(drawMutation(c.slice(9), p, line));
  if (c.startsWith('ordnance-')) return iconFrame(drawOrdnance(c.slice(9), p, line));
  if (c.startsWith('ui-')) return iconFrame(drawUi(c.slice(3), p, line));
  if (c === 'worker') return iconFrame(drawWorker(meta.id, p, line));
  return iconFrame(cbs[c] ?? cbs.artifact);
}

function drawTool(id, p, line) {
  if (id === 'hand') return `<path d="M43 68V43c0-6 8-8 11-3v24-33c0-7 10-7 11 0v33-27c1-7 11-6 11 1v31-19c0-7 10-7 11 0v31c0 24-13 35-30 35-18 0-28-12-32-29l-4-17c-2-9 10-12 13-3l4 12c1 3 5 2 5-1Z" fill="url(#body)" stroke="${line}" stroke-width="5" stroke-linejoin="round"/>`;
  if (id === 'cutter') return `<path d="M31 94 76 49l20 20-45 45Z" fill="url(#body)" stroke="${line}" stroke-width="5"/><path d="M78 47 99 25l6 6-9 36Z" fill="#e6edf7" stroke="${line}" stroke-width="5" stroke-linejoin="round"/><path d="M47 97 80 64" stroke="#fff" stroke-width="4" opacity=".32" stroke-linecap="round"/>`;
  if (id === 'crowbar') return `<path d="M36 103 89 34c8-10 23 1 14 13l-4 6-13-10M42 106l-14-11 50-63 14 11Z" fill="none" stroke="${line}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M42 106l-14-11 50-63 14 11Z" fill="none" stroke="url(#body)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (id === 'grinder') return `<circle cx="76" cy="65" r="30" fill="#d7dee8" stroke="${line}" stroke-width="5"/><circle cx="76" cy="65" r="12" fill="url(#body)" stroke="${line}" stroke-width="4"/><path d="M24 89 55 67l16 20-30 23Z" fill="url(#accent)" stroke="${line}" stroke-width="5" stroke-linejoin="round"/><path d="M56 44 38 29" stroke="${line}" stroke-width="8" stroke-linecap="round"/>`;
  if (id === 'chisel') return `<path d="M27 102 78 51l14 14-51 51Z" fill="url(#body)" stroke="${line}" stroke-width="5"/><path d="M74 47 93 20l14 14-27 19Z" fill="#dce7ef" stroke="${line}" stroke-width="5" stroke-linejoin="round"/><path d="M42 91 20 69" stroke="${line}" stroke-width="8" stroke-linecap="round"/>`;
  if (id === 'torch') return `<path d="M40 92 76 56l17 17-36 36Z" fill="url(#body)" stroke="${line}" stroke-width="5"/><path d="M82 48 95 35l13 13-13 13Z" fill="#cbd5e1" stroke="${line}" stroke-width="5"/><path d="M95 31c2-16 16-18 16-18s4 17-8 25" fill="#ff9d2e" stroke="${line}" stroke-width="4"/>`;
  if (id === 'disarm') return `<path d="M37 101 56 67M91 101 72 67" stroke="${line}" stroke-width="10" stroke-linecap="round"/><path d="M47 38c18 20 18 43 0 63M81 38c-18 20-18 43 0 63" fill="none" stroke="url(#body)" stroke-width="10" stroke-linecap="round"/><circle cx="64" cy="65" r="8" fill="url(#accent)" stroke="${line}" stroke-width="5"/>`;
  if (id === 'press') return `<path d="M31 31h66v18H31Zm10 18h46v45H41Z" fill="url(#body)" stroke="${line}" stroke-width="5"/><path d="M32 96h64M54 63h20v25H54Z" stroke="${line}" stroke-width="7" stroke-linecap="round"/><path d="M46 104h36" stroke="url(#accent)" stroke-width="9" stroke-linecap="round"/>`;
  if (id === 'laserrig') return `<circle cx="64" cy="64" r="23" fill="url(#body)" stroke="${line}" stroke-width="5"/><path d="M64 24v17M64 87v17M24 64h17M87 64h17M35 35l12 12M81 81l12 12M93 35 81 47M47 81 35 93" stroke="${line}" stroke-width="7" stroke-linecap="round"/><circle cx="64" cy="64" r="8" fill="#e8ffff"/>`;
  return `<circle cx="64" cy="64" r="36" fill="#090812" stroke="${line}" stroke-width="5"/><path d="M33 67c19-33 56-16 61 13-19-12-43-9-61-13Z" fill="url(#body)" opacity=".85"/><circle cx="64" cy="64" r="12" fill="#000"/>`;
}

function drawMaterial(id, p, line) {
  if (id === 'paper') return draw({ kind: 'x', id: 'box', name: 'box', emoji: '' });
  if (id === 'wood') return `<path d="M29 42h70v58H29Z" fill="#9a6733" stroke="${line}" stroke-width="5"/><path d="M39 42v58M64 42v58M89 42v58M29 61h70M29 82h70" stroke="#4b2d1b" stroke-width="4" opacity=".55"/><path d="M47 52c10 6 16 6 26 0" fill="none" stroke="#d7a35b" stroke-width="4" opacity=".55"/>`;
  if (id === 'metal') return `<path d="M27 45 64 25l37 20v43l-37 21-37-21Z" fill="#b8c1ce" stroke="${line}" stroke-width="5"/><path d="M43 56h42M43 74h42M52 40l24 49" stroke="#6b7280" stroke-width="5" opacity=".6" stroke-linecap="round"/>`;
  if (id === 'stone') return `<path d="M35 37 66 26l31 18 10 35-28 27H43L22 75Z" fill="#87909d" stroke="${line}" stroke-width="5" stroke-linejoin="round"/><path d="M52 38 42 76l20 30M72 43l25 36" stroke="#cbd5e1" stroke-width="4" opacity=".35"/>`;
  if (id === 'volatile') return `<path d="M64 19 107 99H21Z" fill="#ef4444" stroke="${line}" stroke-width="6" stroke-linejoin="round"/><circle cx="64" cy="70" r="17" fill="#ffd166" stroke="${line}" stroke-width="4"/><path d="M64 44v16M64 84v2" stroke="${line}" stroke-width="7" stroke-linecap="round"/>`;
  if (id === 'anomaly') return `<circle cx="64" cy="64" r="39" fill="#7c3aed" stroke="${line}" stroke-width="5"/><path d="M37 67c13-18 41-28 54-5-14-3-21 11-30 19-8 8-17 6-24-14Z" fill="#53ffe0" opacity=".75" stroke="${line}" stroke-width="4"/><circle cx="52" cy="59" r="4" fill="${line}"/><circle cx="73" cy="57" r="4" fill="${line}"/>`;
  return `<path d="M30 74c0-24 20-43 45-36 18 5 29 23 24 42-8 29-69 26-69-6Z" fill="#34d399" stroke="${line}" stroke-width="5"/><path d="M43 68c13 12 27 14 42 0M48 51c6 3 23 3 31 0" stroke="#ecfdf5" stroke-width="5" opacity=".35" stroke-linecap="round"/>`;
}

function drawMutation(id, p, line) {
  if (id === 'mecharm') return drawTool('press', p, line);
  if (id === 'sixarms') return `<circle cx="64" cy="55" r="22" fill="url(#body)" stroke="${line}" stroke-width="5"/><path d="M42 67 20 85M48 80 30 105M86 67l22 18M80 80l18 25M50 61H30M78 61h20" stroke="${line}" stroke-width="8" stroke-linecap="round"/><circle cx="55" cy="53" r="4" fill="${line}"/><circle cx="73" cy="53" r="4" fill="${line}"/>`;
  if (id === 'brasshead') return `<path d="M38 46c0-23 52-23 52 0v28c0 21-52 21-52 0Z" fill="#c78635" stroke="${line}" stroke-width="5"/><path d="M48 51h32M50 70h28" stroke="#ffe0a3" stroke-width="5" opacity=".45" stroke-linecap="round"/><path d="M30 86h68" stroke="${line}" stroke-width="9" stroke-linecap="round"/>`;
  if (id === 'sawlegs') return `<path d="M51 32v42l-17 31M77 32v42l17 31" stroke="${line}" stroke-width="10" stroke-linecap="round"/><path d="M36 105h28M65 105h28" stroke="url(#body)" stroke-width="8" stroke-linecap="round"/><path d="M34 91h32M62 91h32" stroke="#dfe7ef" stroke-width="4" stroke-dasharray="4 4"/>`;
  if (id === 'lasereye') return `<path d="M21 64c21-26 65-26 86 0-21 27-65 27-86 0Z" fill="url(#body)" stroke="${line}" stroke-width="5"/><circle cx="64" cy="64" r="17" fill="#ffe9a3" stroke="${line}" stroke-width="5"/><path d="M79 63h36" stroke="#ff4d6d" stroke-width="7" stroke-linecap="round"/>`;
  return `<path d="M43 33h42v35c0 18-9 32-21 39-12-7-21-21-21-39Z" fill="url(#body)" stroke="${line}" stroke-width="5"/><path d="M43 33c-20 6-22 31-5 37M85 33c20 6 22 31 5 37" fill="none" stroke="${line}" stroke-width="8" stroke-linecap="round"/><path d="M52 49h24" stroke="#fff" stroke-width="5" opacity=".35"/>`;
}

function drawOrdnance(id, p, line) {
  if (id === 'nuke') return `<circle cx="64" cy="70" r="31" fill="url(#body)" stroke="${line}" stroke-width="5"/><path d="M50 42V25h28v17" fill="url(#accent)" stroke="${line}" stroke-width="5"/><path d="M64 52v36M46 70h36" stroke="${line}" stroke-width="6" opacity=".45"/><path d="M91 34c14-6 20 6 10 18" fill="none" stroke="#ffdf58" stroke-width="5" stroke-linecap="round"/>`;
  if (id === 'emp') return `<path d="M68 17 33 72h27l-9 39 44-60H69Z" fill="url(#body)" stroke="${line}" stroke-width="5" stroke-linejoin="round"/><path d="M31 44c-14 16-14 40 0 56M97 44c14 16 14 40 0 56" fill="none" stroke="#7af9ff" stroke-width="5" opacity=".65" stroke-linecap="round"/>`;
  return `<path d="M25 82 94 33l10 14-68 49Z" fill="url(#body)" stroke="${line}" stroke-width="5"/><path d="M87 28h22v24H87Z" fill="url(#accent)" stroke="${line}" stroke-width="5"/><path d="M27 102h44" stroke="${line}" stroke-width="8" stroke-linecap="round"/><path d="M104 40l15-9" stroke="#7af9ff" stroke-width="5" stroke-linecap="round"/>`;
}

function drawUi(id, p, line) {
  const map = {
    logo: 'box', bag: 'luggage', coin: 'money', reputation: 'medal', trash: 'safe', lock: 'safe', unknown: 'artifact',
    target: 'crystal', spark: 'spark', sell: 'money', inbox: 'box', click: 'worker', danger: 'material-volatile',
    boom: 'spark', crack: 'spark', map: 'paper', merchant: 'personal', collection: 'medal', achievement: 'medal',
    prestige: 'globe', workshop: 'workshop', factory: 'factory', refinery: 'element', quote: 'quote',
    mutation: 'ufo', blueprint: 'blueprint', unique: 'medal', pipe: 'factory',
  };
  if (id === 'sound-on' || id === 'sound-off') {
    const waves = id === 'sound-on' ? '<path d="M79 48c8 8 8 24 0 32M91 36c16 15 16 45 0 60" fill="none" stroke="#7af9ff" stroke-width="6" stroke-linecap="round"/>' : '<path d="M83 48 106 83M106 48 83 83" stroke="#ff6b7a" stroke-width="7" stroke-linecap="round"/>';
    return `<path d="M25 75H42l28 24V29L42 53H25Z" fill="url(#body)" stroke="${line}" stroke-width="5" stroke-linejoin="round"/>${waves}`;
  }
  if (id === 'running' || id === 'check') return `<circle cx="64" cy="64" r="40" fill="url(#body)" stroke="${line}" stroke-width="5"/><path d="M51 43 88 64 51 85Z" fill="#fff" stroke="${line}" stroke-width="4" stroke-linejoin="round"/>`;
  if (id === 'paused') return `<circle cx="64" cy="64" r="40" fill="url(#body)" stroke="${line}" stroke-width="5"/><path d="M50 44v40M78 44v40" stroke="#fff" stroke-width="12" stroke-linecap="round"/>`;
  const mapped = map[id] ?? 'artifact';
  if (mapped.startsWith('material-')) return drawMaterial(mapped.slice(9), p, line);
  if (mapped === 'worker') return drawWorker('worker-neutral', p, line);
  return draw({ kind: 'x', id: mapped, name: mapped, emoji: '' });
}

function drawWorker(id, p, line) {
  const angry = id.includes('angry') || id.includes('heated') || id.includes('furious') || id.includes('demon');
  const demon = id.includes('demon');
  const heat = id.includes('heated') || id.includes('furious') || demon;
  const mouth = angry ? '<path d="M50 74c10-7 20-7 30 0" fill="none" stroke="#220b12" stroke-width="5" stroke-linecap="round"/>' : '<path d="M52 76h24" stroke="#220b12" stroke-width="5" stroke-linecap="round"/>';
  const brow = angry ? '<path d="M45 51l15 5M83 51l-15 5" stroke="#220b12" stroke-width="5" stroke-linecap="round"/>' : '<path d="M47 52h11M70 52h11" stroke="#220b12" stroke-width="5" stroke-linecap="round"/>';
  const horns = demon ? '<path d="M43 35 31 18l24 9M85 35l12-17-24 9" fill="#b01b48" stroke="#1b1126" stroke-width="4" stroke-linejoin="round"/>' : '';
  const steam = heat ? '<path d="M34 26c-8-10 8-12 0-22M94 26c8-10-8-12 0-22" fill="none" stroke="#ffdf58" stroke-width="5" stroke-linecap="round" opacity=".75"/>' : '';
  return `${steam}${horns}<path d="M35 107c5-25 53-25 58 0Z" fill="url(#body)" stroke="${line}" stroke-width="5"/><circle cx="64" cy="58" r="34" fill="#d88a55" stroke="${line}" stroke-width="5"/><path d="M35 53c5-26 49-35 64-10-11-1-20 4-30-3-13 9-24 9-34 13Z" fill="#4a2a20" stroke="${line}" stroke-width="4" stroke-linejoin="round"/><circle cx="53" cy="62" r="4" fill="#220b12"/><circle cx="75" cy="62" r="4" fill="#220b12"/>${brow}${mouth}`;
}

function svg(meta) {
  const p = palette(meta);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="${escXml(meta.name)}">
  <defs>
    <linearGradient id="body" x1="26" y1="22" x2="101" y2="110" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${p.c}"/><stop offset=".45" stop-color="${p.a}"/><stop offset="1" stop-color="${p.b}"/>
    </linearGradient>
    <linearGradient id="accent" x1="22" y1="20" x2="104" y2="107" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="${p.a}"/>
    </linearGradient>
    <filter id="ds" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="5" stdDeviation="3" flood-color="#05020a" flood-opacity=".5"/>
    </filter>
  </defs>
  ${draw(meta)}
</svg>
`;
}

function writeManifest(entries) {
  const records = entries.map((m) => {
    const file = `${m.kind}-${slug(m.id)}.svg`;
    const url = `/game-art/icons/${file}`;
    return { ...m, file, url };
  });
  const byKey = {};
  const byId = {};
  const byName = {};
  const byEmoji = {};
  for (const r of records) {
    byKey[`${r.kind}:${r.id}`] = r.url;
    byId[r.id] ??= r.url;
    byName[r.name] ??= r.url;
    byEmoji[r.emoji] ??= r.url;
  }
  const content = `// Generated by scripts/generate-game-art.mjs. Do not edit by hand.
export interface GameArtRecord {
  kind: string;
  id: string;
  name: string;
  emoji: string;
  file: string;
  url: string;
}

export const GAME_ART_RECORDS = ${JSON.stringify(records, null, 2)} as const satisfies readonly GameArtRecord[];

export const GAME_ART_BY_KEY: Record<string, string> = ${JSON.stringify(byKey, null, 2)};
export const GAME_ART_BY_ID: Record<string, string> = ${JSON.stringify(byId, null, 2)};
export const GAME_ART_BY_NAME: Record<string, string> = ${JSON.stringify(byName, null, 2)};
export const GAME_ART_BY_EMOJI: Record<string, string> = ${JSON.stringify(byEmoji, null, 2)};

export const GAME_ART_BACKGROUND = '/game-art/backgrounds/stage-1-depot.png';
`;
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, content);
}

fs.mkdirSync(iconDir, { recursive: true });
const entries = collect();
for (const meta of entries) {
  fs.writeFileSync(path.join(iconDir, `${meta.kind}-${slug(meta.id)}.svg`), svg(meta));
}
writeManifest(entries);
console.log(`Generated ${entries.length} game art icons.`);
