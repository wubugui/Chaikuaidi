import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
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

function writeManifest(entries) {
  const records = entries.map((m) => {
    const file = `${m.kind}-${slug(m.id)}.png`;
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

const entries = collect();
writeManifest(entries);
console.log(`Generated ${entries.length} PNG game art manifest records.`);
