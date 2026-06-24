import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'src/assets/gameArt.ts');

function readRecords() {
  const text = fs.readFileSync(manifestPath, 'utf8');
  const match = text.match(/export const GAME_ART_RECORDS = (\[[\s\S]*?\]) as const/);
  if (!match) throw new Error('Unable to read GAME_ART_RECORDS from src/assets/gameArt.ts');
  return JSON.parse(match[1]);
}

function readPngSize(abs, rel) {
  const buffer = fs.readFileSync(abs);
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') throw new Error(`Asset is not a PNG: ${rel}`);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function assertAsset(rel, minBytes = 1024, expectedSize = null) {
  if (rel.endsWith('.svg')) throw new Error(`SVG resource is forbidden: ${rel}`);
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) throw new Error(`Missing asset: ${rel}`);
  const size = fs.statSync(abs).size;
  if (size < minBytes) throw new Error(`Asset too small: ${rel} (${size} bytes)`);
  const pngSize = readPngSize(abs, rel);
  if (expectedSize && (pngSize.width !== expectedSize.width || pngSize.height !== expectedSize.height)) {
    throw new Error(`Asset has wrong dimensions: ${rel} (${pngSize.width}x${pngSize.height})`);
  }
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name);
    const stat = fs.statSync(file);
    if (stat.isDirectory()) walk(file, out);
    else out.push(file);
  }
  return out;
}

const publicArt = path.join(root, 'public/game-art');
const svgFiles = walk(publicArt).filter((file) => file.endsWith('.svg'));
if (svgFiles.length > 0) {
  throw new Error(`SVG files are forbidden under public/game-art:\n${svgFiles.map((file) => path.relative(root, file)).join('\n')}`);
}

const records = readRecords();
for (const record of records) {
  if (!record.file.endsWith('.png') || !record.url.endsWith('.png')) {
    throw new Error(`Manifest record must use PNG: ${record.kind}:${record.id}`);
  }
  assertAsset(path.join('public', record.url.replace(/^\/+/, '')), 1024, { width: 256, height: 256 });
}

for (const file of [
  'stage-1-depot.png',
  'stage-2-market.png',
  'stage-3-factory.png',
  'stage-4-reactor.png',
  'mission-m-launchpad.png',
  'mission-m-building.png',
  'mission-m-bridge.png',
  'mission-m-gundamfac.png',
  'mission-m-nuclear.png',
  'mission-m-station.png',
  'mission-m-collider.png',
]) {
  assertAsset(path.join('public/game-art/backgrounds', file), 10_000, { width: 960, height: 540 });
}

for (const file of [
  'worker-neutral.png',
  'worker-angry.png',
  'worker-heated.png',
  'worker-furious.png',
  'worker-demon.png',
]) {
  assertAsset(path.join('public/game-art/characters', file), 5_000, { width: 384, height: 512 });
}

assertAsset('public/game-art/ui/panel-industrial.png', 5_000, { width: 512, height: 512 });

console.log(`Audited ${records.length} PNG icon records plus required scene/UI assets. Dimensions match and no SVG assets found.`);
