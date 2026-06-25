type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'absurd';

/** 用 Web Audio 合成音效，零资源。首个用户手势后才可播放。 */
let ctx: AudioContext | null = null;
let enabled = true;
let volume = 1;

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (AC) ctx = new AC();
  }
  return ctx;
}

export function setAudioEnabled(on: boolean) {
  enabled = on;
}
export function isAudioEnabled() {
  return enabled;
}
export function setAudioVolume(nextVolume: number) {
  volume = Math.max(0, Math.min(1, nextVolume));
}
export function getAudioVolume() {
  return volume;
}

function blip(freq: number, dur: number, type: OscillatorType, gain = 0.08) {
  if (!enabled) return;
  const c = ac();
  if (!c) return;
  if (c.state === 'suspended') c.resume();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain * volume, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  osc.connect(g).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + dur);
}

function noise(dur: number, gain = 0.05) {
  if (!enabled) return;
  const c = ac();
  if (!c) return;
  if (c.state === 'suspended') c.resume();
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  const g = c.createGain();
  g.gain.value = gain * volume;
  src.buffer = buf;
  src.connect(g).connect(c.destination);
  src.start();
}

/** 撕胶带 / 拆击 */
export function sfxRip() {
  noise(0.06, 0.04);
}

/** 按材质区分的命中音：纸/木/金属/石/生物/危险/异常各一套 */
export function sfxMaterialHit(material: string) {
  switch (material) {
    case 'paper':
      noise(0.05, 0.038);
      break;
    case 'wood':
      blip(190, 0.05, 'square', 0.05);
      noise(0.03, 0.02);
      break;
    case 'metal':
      blip(540, 0.04, 'square', 0.05);
      blip(820, 0.06, 'triangle', 0.03);
      noise(0.02, 0.018);
      break;
    case 'stone':
      blip(120, 0.06, 'sine', 0.06);
      noise(0.05, 0.04);
      break;
    case 'organic':
      blip(90, 0.09, 'sine', 0.05);
      noise(0.06, 0.03);
      break;
    case 'volatile':
      blip(680, 0.03, 'square', 0.04);
      break;
    case 'anomaly':
      blip(330, 0.05, 'sawtooth', 0.04);
      setTimeout(() => blip(247, 0.06, 'sawtooth', 0.03), 30);
      break;
    default:
      noise(0.05, 0.035);
  }
}

/** 撬不动：沉闷的低音闷响 */
export function sfxBonk() {
  blip(140, 0.07, 'sine', 0.05);
  noise(0.04, 0.025);
}

/** 危险品爆炸：较长的噪声爆裂 + 低频轰鸣 */
export function sfxBoom() {
  noise(0.45, 0.12);
  blip(70, 0.4, 'sawtooth', 0.1);
  setTimeout(() => blip(45, 0.3, 'sine', 0.08), 60);
}

/** 破裂里程碑：清脆的裂响 */
export function sfxCrack() {
  noise(0.05, 0.05);
  blip(300, 0.05, 'square', 0.05);
}

/** 快递拆开 */
export function sfxOpen() {
  blip(440, 0.12, 'triangle', 0.06);
}

/** 掉落，根据稀有度变化 */
export function sfxLoot(rarity: Rarity) {
  switch (rarity) {
    case 'common':
      blip(660, 0.08, 'square', 0.04);
      break;
    case 'rare':
      blip(880, 0.12, 'square', 0.06);
      break;
    case 'epic':
      blip(990, 0.14, 'sawtooth', 0.07);
      setTimeout(() => blip(1320, 0.14, 'sawtooth', 0.06), 80);
      break;
    case 'legendary':
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.22, 'triangle', 0.07), i * 70));
      break;
    case 'absurd':
      [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => blip(f, 0.3, 'sawtooth', 0.08), i * 60));
      break;
  }
}

export function sfxCash() {
  blip(1175, 0.06, 'square', 0.05);
  setTimeout(() => blip(1568, 0.08, 'square', 0.05), 40);
}
