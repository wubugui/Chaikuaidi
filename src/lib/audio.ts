import type { Rarity } from '../data/types';

/** 用 Web Audio 合成音效，零资源。首个用户手势后才可播放。 */
let ctx: AudioContext | null = null;
let enabled = true;

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

function blip(freq: number, dur: number, type: OscillatorType, gain = 0.08) {
  if (!enabled) return;
  const c = ac();
  if (!c) return;
  if (c.state === 'suspended') c.resume();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, c.currentTime);
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
  g.gain.value = gain;
  src.buffer = buf;
  src.connect(g).connect(c.destination);
  src.start();
}

/** 撕胶带 / 拆击 */
export function sfxRip() {
  noise(0.06, 0.04);
}

/** 撬不动：沉闷的低音闷响 */
export function sfxBonk() {
  blip(140, 0.07, 'sine', 0.05);
  noise(0.04, 0.025);
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
